import { getNetworkManager } from './network';
import { getOfflineQueue } from './offlineQueue';
import { waitForOnline, waitForOffline } from './network';

export interface ReconnectionOptions {
  autoProcessQueue?: boolean;
  showNotifications?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  onReconnect?: () => void;
  onDisconnect?: () => void;
  onQueueProcess?: (success: boolean, count: number) => void;
}

export interface ReconnectionState {
  isOnline: boolean;
  isReconnecting: boolean;
  lastReconnection: number | null;
  reconnectionAttempts: number;
  queueProcessed: boolean;
  pendingActionsCount: number;
}

export type ReconnectionListener = (state: ReconnectionState) => void;

class NetworkReconnectionHandler {
  private state: ReconnectionState;
  private listeners: Set<ReconnectionListener> = new Set();
  private options: Required<ReconnectionOptions>;
  private isProcessing = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private onlineListener: (() => void) | null = null;
  private offlineListener: (() => void) | null = null;

  constructor(options: ReconnectionOptions = {}) {
    this.options = {
      autoProcessQueue: options.autoProcessQueue ?? true,
      showNotifications: options.showNotifications ?? true,
      retryAttempts: options.retryAttempts ?? 3,
      retryDelay: options.retryDelay ?? 2000,
      onReconnect: options.onReconnect ?? (() => {}),
      onDisconnect: options.onDisconnect ?? (() => {}),
      onQueueProcess: options.onQueueProcess ?? (() => {})
    };

    this.state = {
      isOnline: getNetworkManager().getState().isOnline,
      isReconnecting: false,
      lastReconnection: null,
      reconnectionAttempts: 0,
      queueProcessed: false,
      pendingActionsCount: 0
    };

    this.initializeListeners();
  }

  private initializeListeners(): void {
    const networkManager = getNetworkManager();

    this.onlineListener = () => {
      this.handleOnline();
    };

    this.offlineListener = () => {
      this.handleOffline();
    };

    // Subscribe to network changes
    networkManager.subscribe((networkState) => {
      this.updateState({ isOnline: networkState.isOnline });
    });

    // Add event listeners
    window.addEventListener('online', this.onlineListener);
    window.addEventListener('offline', this.offlineListener);
  }

  private handleOnline(): void {
    this.updateState({ 
      isOnline: true, 
      isReconnecting: false,
      lastReconnection: Date.now(),
      reconnectionAttempts: 0
    });

    this.options.onReconnect();

    // Process queue if auto-process is enabled
    if (this.options.autoProcessQueue) {
      this.processQueueOnReconnect();
    }

    // Show notification if enabled
    if (this.options.showNotifications) {
      this.showReconnectionNotification();
    }
  }

  private handleOffline(): void {
    this.updateState({ 
      isOnline: false,
      isReconnecting: false,
      queueProcessed: false
    });

    this.options.onDisconnect();

    // Clear any pending reconnection attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private async processQueueOnReconnect(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.updateState({ isReconnecting: true });

    try {
      const queue = getOfflineQueue();
      const pendingActions = queue.getActions();
      
      this.updateState({ pendingActionsCount: pendingActions.length });

      if (pendingActions.length === 0) {
        this.updateState({ queueProcessed: true });
        return;
      }

      // Wait a bit for network to stabilize
      await this.delay(1000);

      // Process queue with retry logic
      let success = false;
      let processedCount = 0;

      for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
        try {
          await queue.processQueue();
          
          // Check if queue was processed successfully
          const remainingActions = queue.getActions();
          processedCount = pendingActions.length - remainingActions.length;
          
          if (remainingActions.length === 0) {
            success = true;
            break;
          } else if (attempt < this.options.retryAttempts) {
            // Wait before retry
            await this.delay(this.options.retryDelay * attempt);
          }
        } catch (error) {
          console.error(`Queue processing attempt ${attempt} failed:`, error);
          
          if (attempt < this.options.retryAttempts) {
            await this.delay(this.options.retryDelay * attempt);
          }
        }
      }

      this.updateState({ 
        queueProcessed: true,
        reconnectionAttempts: this.state.reconnectionAttempts + 1
      });

      this.options.onQueueProcess(success, processedCount);

    } catch (error) {
      console.error('Error processing queue on reconnection:', error);
      this.updateState({ queueProcessed: true });
    } finally {
      this.isProcessing = false;
      this.updateState({ isReconnecting: false });
    }
  }

  private showReconnectionNotification(): void {
    // This would integrate with your notification system
    // For now, we'll use console.log
    const queue = getOfflineQueue();
    const pendingActions = queue.getActions();
    
    if (pendingActions.length > 0) {
      console.log(`✅ Back online! Processing ${pendingActions.length} pending actions...`);
    } else {
      console.log('✅ Back online!');
    }
  }

  private updateState(updates: Partial<ReconnectionState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Reconnection listener error:', error);
      }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API
  public getState(): ReconnectionState {
    return { ...this.state };
  }

  public subscribe(listener: ReconnectionListener): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current state
    listener(this.state);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async waitForReconnection(): Promise<void> {
    if (this.state.isOnline) return;
    
    return new Promise((resolve) => {
      const unsubscribe = this.subscribe((state) => {
        if (state.isOnline) {
          unsubscribe();
          resolve();
        }
      });
    });
  }

  public async processQueueNow(): Promise<boolean> {
    if (!this.state.isOnline) return false;
    
    try {
      const queue = getOfflineQueue();
      await queue.processQueue();
      return true;
    } catch (error) {
      console.error('Error processing queue:', error);
      return false;
    }
  }

  public getReconnectionStats(): {
    lastReconnection: Date | null;
    reconnectionAttempts: number;
    queueProcessed: boolean;
    pendingActionsCount: number;
  } {
    return {
      lastReconnection: this.state.lastReconnection ? new Date(this.state.lastReconnection) : null,
      reconnectionAttempts: this.state.reconnectionAttempts,
      queueProcessed: this.state.queueProcessed,
      pendingActionsCount: this.state.pendingActionsCount
    };
  }

  public destroy(): void {
    // Remove event listeners
    if (this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
    }
    if (this.offlineListener) {
      window.removeEventListener('offline', this.offlineListener);
    }

    // Clear timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Clear listeners
    this.listeners.clear();
  }
}

// Singleton instance
let reconnectionHandler: NetworkReconnectionHandler | null = null;

export function getReconnectionHandler(options?: ReconnectionOptions): NetworkReconnectionHandler {
  if (!reconnectionHandler) {
    reconnectionHandler = new NetworkReconnectionHandler(options);
  }
  return reconnectionHandler;
}

export function destroyReconnectionHandler(): void {
  if (reconnectionHandler) {
    reconnectionHandler.destroy();
    reconnectionHandler = null;
  }
}

// Utility functions
export async function waitForReconnection(): Promise<void> {
  const handler = getReconnectionHandler();
  return handler.waitForReconnection();
}

export async function processQueueOnReconnect(): Promise<boolean> {
  const handler = getReconnectionHandler();
  return handler.processQueueNow();
}

export function getReconnectionStats(): {
  lastReconnection: Date | null;
  reconnectionAttempts: number;
  queueProcessed: boolean;
  pendingActionsCount: number;
} {
  const handler = getReconnectionHandler();
  return handler.getReconnectionStats();
}

// Advanced reconnection with exponential backoff
export async function reconnectWithBackoff(
  maxAttempts: number = 5,
  baseDelay: number = 1000
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Check if we're online
      if (getNetworkManager().getState().isOnline) {
        return true;
      }

      // Wait with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Try to process queue
      const success = await processQueueOnReconnect();
      if (success) {
        return true;
      }
    } catch (error) {
      console.error(`Reconnection attempt ${attempt} failed:`, error);
    }
  }

  return false;
}

// Graceful reconnection with user feedback
export async function gracefulReconnect(
  onProgress?: (attempt: number, maxAttempts: number) => void,
  onSuccess?: () => void,
  onFailure?: () => void
): Promise<boolean> {
  const maxAttempts = 3;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onProgress?.(attempt, maxAttempts);
    
    try {
      const success = await reconnectWithBackoff(1, 2000);
      if (success) {
        onSuccess?.();
        return true;
      }
    } catch (error) {
      console.error(`Graceful reconnection attempt ${attempt} failed:`, error);
    }
  }
  
  onFailure?.();
  return false;
} 