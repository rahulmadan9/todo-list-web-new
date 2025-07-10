import React from 'react';
import { useSyncWithProgress } from '../hooks/useSync';

interface SyncProgressProps {
  userId?: string;
  onSyncComplete?: () => void;
  onSyncError?: (error: string) => void;
  className?: string;
}

export function SyncProgress({ 
  userId, 
  onSyncComplete, 
  onSyncError, 
  className = '' 
}: SyncProgressProps) {
  const { 
    syncState, 
    syncProgress, 
    startSync, 
    retrySync, 
    clearError,
    hasConflicts,
    hasUnresolvedConflicts,
    syncStatus
  } = useSyncWithProgress();

  const handleStartSync = async () => {
    if (!userId) return;
    
    try {
      const result = await startSync(userId);
      if (result.success) {
        onSyncComplete?.();
      } else {
        onSyncError?.(result.error || 'Sync failed');
      }
    } catch (error) {
      onSyncError?.(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleRetry = async () => {
    try {
      const result = await retrySync();
      if (result.success) {
        onSyncComplete?.();
      } else {
        onSyncError?.(result.error || 'Retry failed');
      }
    } catch (error) {
      onSyncError?.(error instanceof Error ? error.message : 'Retry failed');
    }
  };

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'conflicts':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getProgressBarColor = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'bg-blue-600';
      case 'success':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
      case 'conflicts':
        return 'bg-yellow-600';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor().replace('text-', 'bg-')}`} />
          <h3 className="text-lg font-semibold text-gray-900">
            {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Status'}
          </h3>
        </div>
        
        {syncStatus === 'idle' && userId && (
          <button
            onClick={handleStartSync}
            className="px-4 py-2 bg-brand-500 text-bg-900 rounded-md hover:bg-brand-600 active:bg-brand-700 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          >
            Start Sync
          </button>
        )}
        
        {syncStatus === 'error' && (
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-state-error text-bg-900 rounded-md hover:brightness-90 active:brightness-80 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          >
            Retry
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{syncProgress.message}</span>
          <span>{Math.round(syncProgress.percentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
            style={{ width: `${syncProgress.percentage}%` }}
          />
        </div>
      </div>

      {/* Status Details */}
      <div className="space-y-2">
        {syncState.lastSyncTime && (
          <div className="text-sm text-gray-600">
            Last sync: {new Date(syncState.lastSyncTime).toLocaleString()}
          </div>
        )}
        
        {hasConflicts && (
          <div className="text-sm text-yellow-600">
            {hasUnresolvedConflicts 
              ? `${syncState.unresolvedConflicts.length} conflicts need resolution`
              : `${syncState.autoResolvedCount} conflicts auto-resolved`
            }
          </div>
        )}
        
        {syncState.error && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-red-600">
              Error: {syncState.error}
            </div>
            <button
              onClick={clearError}
              className="px-2 py-1 text-sm text-text-200 hover:bg-bg-800 active:bg-bg-700 rounded-md transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Sync Statistics */}
      {syncState.lastSyncTime && !syncState.isSyncing && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Status:</span>
              <span className={`ml-2 font-medium ${getStatusColor()}`}>
                {syncStatus === 'success' ? 'Complete' : 
                 syncStatus === 'conflicts' ? 'Conflicts Found' :
                 syncStatus === 'error' ? 'Failed' : 'Ready'}
              </span>
            </div>
            {hasConflicts && (
              <div>
                <span className="text-gray-600">Conflicts:</span>
                <span className="ml-2 font-medium text-yellow-600">
                  {syncState.conflicts.length}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for inline use
export function SyncProgressCompact({ 
  userId, 
  onSyncComplete, 
  onSyncError 
}: Omit<SyncProgressProps, 'className'>) {
  const { syncProgress, syncStatus, startSync, retrySync } = useSyncWithProgress();

  const handleSync = async () => {
    if (!userId) return;
    
    try {
      const result = await startSync(userId);
      if (result.success) {
        onSyncComplete?.();
      } else {
        onSyncError?.(result.error || 'Sync failed');
      }
    } catch (error) {
      onSyncError?.(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return '🔄';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'conflicts':
        return '⚠️';
      default:
        return '📱';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-lg">{getStatusIcon()}</span>
      <span className="text-sm text-gray-600">{syncProgress.message}</span>
      {syncStatus === 'idle' && userId && (
        <button
          onClick={handleSync}
          className="px-3 py-2 text-xs bg-brand-500 text-bg-900 rounded-md hover:bg-brand-600 active:bg-brand-700 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        >
          Sync
        </button>
      )}
      {syncStatus === 'error' && (
        <button
          onClick={retrySync}
          className="px-3 py-2 text-xs bg-state-error text-bg-900 rounded-md hover:brightness-90 active:brightness-80 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        >
          Retry
        </button>
      )}
    </div>
  );
} 