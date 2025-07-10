import { useState, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { Task } from '../lib/firestore';
import { 
  syncTasks, 
  processDuplicateConflicts, 
  generateConflictDescription,
  type SyncResult,
  type TaskConflict,
  type SyncOptions
} from '../lib/sync';

export interface SyncState {
  isSyncing: boolean;
  progress: number;
  error: string | null;
  lastSyncTime: number | null;
  conflicts: TaskConflict[];
  autoResolvedCount: number;
  unresolvedConflicts: TaskConflict[];
}

export interface UseSyncReturn {
  // State
  syncState: SyncState;
  
  // Actions
  startSync: (userId: string, options?: Partial<SyncOptions>) => Promise<SyncResult>;
  retrySync: () => Promise<SyncResult>;
  resolveConflict: (conflictId: string, resolution: 'keep_local' | 'keep_cloud' | 'merge') => void;
  clearConflicts: () => void;
  clearError: () => void;
  
  // Computed values
  hasConflicts: boolean;
  hasUnresolvedConflicts: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error' | 'conflicts';
  
  // Utilities
  getConflictDescription: (conflict: TaskConflict) => string;
}

export function useSync(): UseSyncReturn {
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    progress: 0,
    error: null,
    lastSyncTime: null,
    conflicts: [],
    autoResolvedCount: 0,
    unresolvedConflicts: []
  });

  const currentUserRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update sync state
  const updateSyncState = useCallback((updates: Partial<SyncState>) => {
    setSyncState(prev => ({ ...prev, ...updates }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    updateSyncState({ error: null });
  }, [updateSyncState]);

  // Clear conflicts
  const clearConflicts = useCallback(() => {
    updateSyncState({ 
      conflicts: [], 
      unresolvedConflicts: [], 
      autoResolvedCount: 0 
    });
  }, [updateSyncState]);

  // Get conflict description
  const getConflictDescription = useCallback((conflict: TaskConflict): string => {
    return generateConflictDescription(conflict);
  }, []);

  // Start sync process
  const startSync = useCallback(async (
    userId: string, 
    options: Partial<SyncOptions> = {}
  ): Promise<SyncResult> => {
    if (syncState.isSyncing) {
      throw new Error('Sync already in progress');
    }

    currentUserRef.current = userId;
    
    // Create abort controller for this sync operation
    abortControllerRef.current = new AbortController();
    
    try {
      updateSyncState({
        isSyncing: true,
        progress: 0,
        error: null,
        conflicts: [],
        unresolvedConflicts: [],
        autoResolvedCount: 0
      });

      const syncOptions: SyncOptions = {
        userId,
        forceUpload: false,
        resolveConflicts: true,
        onProgress: (progress) => {
          if (!abortControllerRef.current?.signal.aborted) {
            updateSyncState({ progress });
          }
        },
        ...options
      };

      const result = await syncTasks(syncOptions);

      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Sync was cancelled');
      }

      if (result.success) {
        // Process conflicts if any
        if (result.conflicts && result.conflicts.length > 0) {
          const { resolvedConflicts, unresolvedConflicts, autoResolvedCount } = 
            processDuplicateConflicts(result.conflicts);

          updateSyncState({
            isSyncing: false,
            progress: 100,
            lastSyncTime: Date.now(),
            conflicts: result.conflicts,
            unresolvedConflicts,
            autoResolvedCount
          });
        } else {
          updateSyncState({
            isSyncing: false,
            progress: 100,
            lastSyncTime: Date.now()
          });
        }
      } else {
        updateSyncState({
          isSyncing: false,
          error: result.error || 'Sync failed',
          progress: 0
        });
      }

      return result;

    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) {
        updateSyncState({
          isSyncing: false,
          error: 'Sync was cancelled',
          progress: 0
        });
        return {
          success: false,
          uploadedCount: 0,
          error: 'Sync was cancelled'
        };
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      updateSyncState({
        isSyncing: false,
        error: errorMessage,
        progress: 0
      });

      return {
        success: false,
        uploadedCount: 0,
        error: errorMessage
      };
    }
  }, [syncState.isSyncing, updateSyncState]);

  // Retry sync
  const retrySync = useCallback(async (): Promise<SyncResult> => {
    if (!currentUserRef.current) {
      throw new Error('No user ID available for retry');
    }

    return startSync(currentUserRef.current, { forceUpload: true });
  }, [startSync]);

  // Resolve a specific conflict
  const resolveConflict = useCallback((
    conflictId: string, 
    resolution: 'keep_local' | 'keep_cloud' | 'merge'
  ) => {
    setSyncState(prev => {
      const updatedConflicts = prev.conflicts.map((conflict: TaskConflict) => {
        if (conflict.localTask.id === conflictId || conflict.cloudTask.id === conflictId) {
          return { ...conflict, resolution };
        }
        return conflict;
      });

      const unresolvedConflicts = updatedConflicts.filter(
        (conflict: TaskConflict) => !conflict.resolution
      );

      return {
        ...prev,
        conflicts: updatedConflicts,
        unresolvedConflicts
      };
    });
  }, []);

  // Computed values
  const hasConflicts = syncState.conflicts.length > 0;
  const hasUnresolvedConflicts = syncState.unresolvedConflicts.length > 0;
  
  const syncStatus: UseSyncReturn['syncStatus'] = 
    syncState.isSyncing ? 'syncing' :
    syncState.error ? 'error' :
    hasUnresolvedConflicts ? 'conflicts' :
    syncState.lastSyncTime ? 'success' : 'idle';

  return {
    syncState,
    startSync,
    retrySync,
    resolveConflict,
    clearConflicts,
    clearError,
    hasConflicts,
    hasUnresolvedConflicts,
    syncStatus,
    getConflictDescription
  };
}

// Hook for sync with user context
export function useSyncWithUser(user: User | null): UseSyncReturn & {
  syncWithUser: () => Promise<SyncResult>;
} {
  const syncHook = useSync();

  const syncWithUser = useCallback(async (): Promise<SyncResult> => {
    if (!user) {
      throw new Error('No authenticated user');
    }

    return syncHook.startSync(user.uid);
  }, [user, syncHook.startSync]);

  return {
    ...syncHook,
    syncWithUser
  };
}

// Hook for sync with progress tracking
export function useSyncWithProgress(): UseSyncReturn & {
  syncProgress: {
    percentage: number;
    message: string;
    isComplete: boolean;
  };
} {
  const syncHook = useSync();

  const syncProgress = {
    percentage: syncHook.syncState.progress,
    message: syncHook.syncState.isSyncing 
      ? `Syncing... ${Math.round(syncHook.syncState.progress)}%`
      : syncHook.syncState.error 
        ? 'Sync failed'
        : syncHook.hasUnresolvedConflicts 
          ? 'Conflicts detected'
          : syncHook.syncState.lastSyncTime 
            ? 'Sync complete'
            : 'Ready to sync',
    isComplete: syncHook.syncState.progress === 100 && !syncHook.syncState.isSyncing
  };

  return {
    ...syncHook,
    syncProgress
  };
} 