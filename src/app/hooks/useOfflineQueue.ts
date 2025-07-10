import { useState, useEffect, useCallback } from 'react';
import { 
  getOfflineQueue, 
  QueuedAction, 
  QueueStats, 
  ActionProcessor,
  queueTaskCreate,
  queueTaskUpdate,
  queueTaskDelete,
  queueSync
} from '../lib/offlineQueue';
import { getNetworkManager } from '../lib/network';

export interface UseOfflineQueueReturn {
  // State
  queueStats: QueueStats;
  pendingActions: QueuedAction[];
  isProcessing: boolean;
  
  // Actions
  enqueueTaskCreate: (task: any, userId: string, priority?: 'high' | 'normal' | 'low') => string;
  enqueueTaskUpdate: (taskId: string, updates: any, userId: string, priority?: 'high' | 'normal' | 'low') => string;
  enqueueTaskDelete: (taskId: string, userId: string, priority?: 'high' | 'normal' | 'low') => string;
  enqueueSync: (userId: string, priority?: 'high' | 'normal' | 'low') => string;
  
  // Queue Management
  removeAction: (actionId: string) => boolean;
  clearQueue: () => void;
  clearUserQueue: (userId: string) => void;
  processQueue: () => Promise<void>;
  processAction: (actionId: string) => Promise<boolean>;
  
  // Network Integration
  shouldProcessQueue: boolean;
  canSync: boolean;
  
  // Utilities
  getActionById: (actionId: string) => QueuedAction | null;
  getUserActions: (userId: string) => QueuedAction[];
  hasPendingActions: (userId?: string) => boolean;
}

export function useOfflineQueue(processor?: ActionProcessor): UseOfflineQueueReturn {
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    byType: {},
    byPriority: {}
  });
  
  const [pendingActions, setPendingActions] = useState<QueuedAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldProcessQueue, setShouldProcessQueue] = useState(false);
  const [canSync, setCanSync] = useState(false);
  const [queue, setQueue] = useState<ReturnType<typeof getOfflineQueue> | null>(null);
  const [networkManager, setNetworkManager] = useState<ReturnType<typeof getNetworkManager> | null>(null);

  // Initialize queue and network manager on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const queueInstance = getOfflineQueue();
      const networkManagerInstance = getNetworkManager();
      setQueue(queueInstance);
      setNetworkManager(networkManagerInstance);
    }
  }, []);

  // Set up processor if provided
  useEffect(() => {
    if (processor && queue) {
      queue.setProcessor(processor);
    }
  }, [processor, queue]);

  // Subscribe to queue changes
  useEffect(() => {
    if (!queue) return;
    
    const unsubscribe = queue.subscribe((stats) => {
      setQueueStats(stats);
      setPendingActions(queue.getActions());
      setIsProcessing(queue.isQueueProcessing());
    });

    return unsubscribe;
  }, [queue]);

  // Subscribe to network changes
  useEffect(() => {
    if (!networkManager) return;
    
    const unsubscribe = networkManager.subscribe((networkState) => {
      const networkInfo = networkManager.getNetworkInfo();
      setShouldProcessQueue(networkInfo.isOnline && networkInfo.canSync);
      setCanSync(networkInfo.canSync);
    });

    return unsubscribe;
  }, [networkManager]);

  // Auto-process queue when network becomes available
  useEffect(() => {
    if (shouldProcessQueue && queueStats.pending > 0 && !isProcessing && queue) {
      processQueue();
    }
  }, [shouldProcessQueue, queueStats.pending, isProcessing, queue]);

  // Queue Actions
  const enqueueTaskCreate = useCallback((
    task: any, 
    userId: string, 
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): string => {
    return queueTaskCreate(task, userId, priority);
  }, []);

  const enqueueTaskUpdate = useCallback((
    taskId: string, 
    updates: any, 
    userId: string, 
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): string => {
    return queueTaskUpdate(taskId, updates, userId, priority);
  }, []);

  const enqueueTaskDelete = useCallback((
    taskId: string, 
    userId: string, 
    priority: 'high' | 'normal' | 'low' = 'high'
  ): string => {
    return queueTaskDelete(taskId, userId, priority);
  }, []);

  const enqueueSync = useCallback((
    userId: string, 
    priority: 'high' | 'normal' | 'low' = 'high'
  ): string => {
    return queueSync(userId, priority);
  }, []);

  // Queue Management
  const removeAction = useCallback((actionId: string): boolean => {
    return queue ? queue.remove(actionId) : false;
  }, [queue]);

  const clearQueue = useCallback((): void => {
    if (queue) {
      queue.clear();
    }
  }, [queue]);

  const clearUserQueue = useCallback((userId: string): void => {
    if (queue) {
      queue.clearByUserId(userId);
    }
  }, [queue]);

  const processQueue = useCallback(async (): Promise<void> => {
    if (queue) {
      await queue.processQueue();
    }
  }, [queue]);

  const processAction = useCallback(async (actionId: string): Promise<boolean> => {
    return queue ? await queue.processAction(actionId) : false;
  }, [queue]);

  // Utilities
  const getActionById = useCallback((actionId: string): QueuedAction | null => {
    return queue ? queue.getAction(actionId) : null;
  }, [queue]);

  const getUserActions = useCallback((userId: string): QueuedAction[] => {
    return queue ? queue.getActions(userId) : [];
  }, [queue]);

  const hasPendingActions = useCallback((userId?: string): boolean => {
    return queue ? queue.hasPendingActions(userId) : false;
  }, [queue]);

  return {
    queueStats,
    pendingActions,
    isProcessing,
    enqueueTaskCreate,
    enqueueTaskUpdate,
    enqueueTaskDelete,
    enqueueSync,
    removeAction,
    clearQueue,
    clearUserQueue,
    processQueue,
    processAction,
    shouldProcessQueue,
    canSync,
    getActionById,
    getUserActions,
    hasPendingActions
  };
}

// Hook for offline queue with automatic processing
export function useOfflineQueueWithAutoProcess(
  processor: ActionProcessor
): UseOfflineQueueReturn & {
  autoProcessEnabled: boolean;
  toggleAutoProcess: () => void;
} {
  const [autoProcessEnabled, setAutoProcessEnabled] = useState(true);
  
  const queueHook = useOfflineQueue(processor);
  
  // Auto-process when conditions are met
  useEffect(() => {
    if (autoProcessEnabled && queueHook.shouldProcessQueue && queueHook.queueStats.pending > 0 && !queueHook.isProcessing) {
      queueHook.processQueue();
    }
  }, [
    autoProcessEnabled, 
    queueHook.shouldProcessQueue, 
    queueHook.queueStats.pending, 
    queueHook.isProcessing
  ]);

  const toggleAutoProcess = useCallback(() => {
    setAutoProcessEnabled(prev => !prev);
  }, []);

  return {
    ...queueHook,
    autoProcessEnabled,
    toggleAutoProcess
  };
}

// Hook for offline queue with user context
export function useOfflineQueueForUser(
  userId: string,
  processor?: ActionProcessor
): UseOfflineQueueReturn & {
  userActions: QueuedAction[];
  userStats: {
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  };
} {
  const queueHook = useOfflineQueue(processor);
  const [userActions, setUserActions] = useState<QueuedAction[]>([]);

  // Update user actions when queue changes
  useEffect(() => {
    setUserActions(queueHook.getUserActions(userId));
  }, [queueHook.pendingActions, userId]);

  const userStats = {
    total: userActions.length,
    byType: userActions.reduce((acc, action) => {
      acc[action.type] = (acc[action.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byPriority: userActions.reduce((acc, action) => {
      acc[action.priority] = (acc[action.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  return {
    ...queueHook,
    userActions,
    userStats
  };
} 