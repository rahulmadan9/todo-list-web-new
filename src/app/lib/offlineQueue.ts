export interface QueuedAction {
  id: string;
  type: 'create' | 'update' | 'delete' | 'sync';
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'normal' | 'low';
  userId: string;
  metadata?: {
    taskId?: string;
    title?: string;
    description?: string;
  };
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface QueueOptions {
  maxRetries?: number;
  retryDelay?: number;
  maxQueueSize?: number;
  enablePriority?: boolean;
  autoProcess?: boolean;
}

export type ActionProcessor = (action: QueuedAction) => Promise<boolean>;

class OfflineQueue {
  private queue: QueuedAction[] = [];
  private processing: Set<string> = new Set();
  private processor: ActionProcessor | null = null;
  private options: Required<QueueOptions>;
  private isProcessing = false;
  private listeners: Set<(stats: QueueStats) => void> = new Set();

  constructor(options: QueueOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      maxQueueSize: options.maxQueueSize ?? 1000,
      enablePriority: options.enablePriority ?? true,
      autoProcess: options.autoProcess ?? true
    };

    this.loadFromStorage();
  }

  // Queue Management
  public enqueue(
    type: QueuedAction['type'],
    payload: any,
    userId: string,
    priority: QueuedAction['priority'] = 'normal',
    metadata?: QueuedAction['metadata']
  ): string {
    const id = this.generateId();
    const action: QueuedAction = {
      id,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.options.maxRetries,
      priority,
      userId,
      metadata
    };

    // Check queue size limit
    if (this.queue.length >= this.options.maxQueueSize) {
      // Remove lowest priority items first
      this.queue.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      
      // Remove oldest low priority items
      const lowPriorityCount = this.queue.filter(a => a.priority === 'low').length;
      if (lowPriorityCount > this.options.maxQueueSize * 0.5) {
        this.queue = this.queue.filter(a => a.priority !== 'low');
      }
      
      // If still at limit, remove oldest items
      if (this.queue.length >= this.options.maxQueueSize) {
        this.queue = this.queue.slice(0, this.options.maxQueueSize - 1);
      }
    }

    this.queue.push(action);
    this.sortQueue();
    this.saveToStorage();
    this.notifyListeners();

    return id;
  }

  public dequeue(): QueuedAction | null {
    if (this.queue.length === 0) return null;
    
    const action = this.queue.shift()!;
    this.saveToStorage();
    this.notifyListeners();
    
    return action;
  }

  public remove(id: string): boolean {
    const index = this.queue.findIndex(action => action.id === id);
    if (index === -1) return false;
    
    this.queue.splice(index, 1);
    this.saveToStorage();
    this.notifyListeners();
    
    return true;
  }

  public clear(): void {
    this.queue = [];
    this.processing.clear();
    this.saveToStorage();
    this.notifyListeners();
  }

  public clearByUserId(userId: string): void {
    this.queue = this.queue.filter(action => action.userId !== userId);
    this.saveToStorage();
    this.notifyListeners();
  }

  // Queue Processing
  public setProcessor(processor: ActionProcessor): void {
    this.processor = processor;
  }

  public async processQueue(): Promise<void> {
    if (this.isProcessing || !this.processor) return;
    
    this.isProcessing = true;
    
    try {
      while (this.queue.length > 0) {
        const action = this.queue[0];
        
        if (this.processing.has(action.id)) {
          // Skip if already processing
          break;
        }
        
        this.processing.add(action.id);
        
        try {
          const success = await this.processor(action);
          
          if (success) {
            // Remove from queue on success
            this.queue.shift();
          } else {
            // Move to end for retry
            this.queue.shift();
            action.retryCount++;
            
            if (action.retryCount < action.maxRetries) {
              // Add delay before retry
              await this.delay(this.options.retryDelay * action.retryCount);
              this.queue.push(action);
            } else {
              // Max retries exceeded, mark as failed
              console.warn(`Action ${action.id} failed after ${action.retryCount} retries`);
            }
          }
        } catch (error) {
          console.error(`Error processing action ${action.id}:`, error);
          
          // Move to end for retry
          this.queue.shift();
          action.retryCount++;
          
          if (action.retryCount < action.maxRetries) {
            await this.delay(this.options.retryDelay * action.retryCount);
            this.queue.push(action);
          }
        } finally {
          this.processing.delete(action.id);
        }
        
        this.saveToStorage();
        this.notifyListeners();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  public async processAction(actionId: string): Promise<boolean> {
    if (!this.processor) return false;
    
    const action = this.queue.find(a => a.id === actionId);
    if (!action) return false;
    
    this.processing.add(actionId);
    
    try {
      const success = await this.processor(action);
      
      if (success) {
        this.remove(actionId);
      } else {
        action.retryCount++;
        if (action.retryCount >= action.maxRetries) {
          this.remove(actionId);
        }
      }
      
      return success;
    } catch (error) {
      console.error(`Error processing action ${actionId}:`, error);
      action.retryCount++;
      
      if (action.retryCount >= action.maxRetries) {
        this.remove(actionId);
      }
      
      return false;
    } finally {
      this.processing.delete(actionId);
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  // Queue Information
  public getStats(): QueueStats {
    const stats: QueueStats = {
      total: this.queue.length,
      pending: this.queue.length - this.processing.size,
      processing: this.processing.size,
      completed: 0, // Would need to track completed actions
      failed: 0,    // Would need to track failed actions
      byType: {},
      byPriority: {}
    };

    this.queue.forEach(action => {
      stats.byType[action.type] = (stats.byType[action.type] || 0) + 1;
      stats.byPriority[action.priority] = (stats.byPriority[action.priority] || 0) + 1;
    });

    return stats;
  }

  public getActions(userId?: string): QueuedAction[] {
    if (userId) {
      return this.queue.filter(action => action.userId === userId);
    }
    return [...this.queue];
  }

  public getAction(id: string): QueuedAction | null {
    return this.queue.find(action => action.id === id) || null;
  }

  public isQueueProcessing(): boolean {
    return this.isProcessing;
  }

  public hasPendingActions(userId?: string): boolean {
    if (userId) {
      return this.queue.some(action => action.userId === userId);
    }
    return this.queue.length > 0;
  }

  // Event Listeners
  public subscribe(listener: (stats: QueueStats) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current stats
    listener(this.getStats());
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('Queue listener error:', error);
      }
    });
  }

  // Utility Methods
  private generateId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sortQueue(): void {
    if (!this.options.enablePriority) return;
    
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, sort by timestamp (oldest first)
      return a.timestamp - b.timestamp;
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Storage
  private saveToStorage(): void {
    try {
      localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('offlineQueue');
      if (stored) {
        this.queue = JSON.parse(stored);
        this.sortQueue();
      }
    } catch (error) {
      console.error('Failed to load offline queue from storage:', error);
      this.queue = [];
    }
  }

  // Cleanup
  public destroy(): void {
    this.clear();
    this.listeners.clear();
    this.processor = null;
  }
}

// Singleton instance
let offlineQueue: OfflineQueue | null = null;

export function getOfflineQueue(options?: QueueOptions): OfflineQueue {
  if (!offlineQueue) {
    offlineQueue = new OfflineQueue(options);
  }
  return offlineQueue;
}

export function destroyOfflineQueue(): void {
  if (offlineQueue) {
    offlineQueue.destroy();
    offlineQueue = null;
  }
}

// Utility functions for common actions
export function queueTaskCreate(
  task: any,
  userId: string,
  priority: QueuedAction['priority'] = 'normal'
): string {
  const queue = getOfflineQueue();
  return queue.enqueue('create', task, userId, priority, {
    taskId: task.id,
    title: task.title
  });
}

export function queueTaskUpdate(
  taskId: string,
  updates: any,
  userId: string,
  priority: QueuedAction['priority'] = 'normal'
): string {
  const queue = getOfflineQueue();
  return queue.enqueue('update', { taskId, updates }, userId, priority, {
    taskId,
    title: updates.title
  });
}

export function queueTaskDelete(
  taskId: string,
  userId: string,
  priority: QueuedAction['priority'] = 'high'
): string {
  const queue = getOfflineQueue();
  return queue.enqueue('delete', { taskId }, userId, priority, {
    taskId
  });
}

export function queueSync(
  userId: string,
  priority: QueuedAction['priority'] = 'high'
): string {
  const queue = getOfflineQueue();
  return queue.enqueue('sync', { userId }, userId, priority);
} 