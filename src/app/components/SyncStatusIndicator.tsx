import React, { useState } from 'react';
import { useSyncWithProgress } from '../hooks/useSync';
import { SyncProgress } from './SyncProgress';
import { ConflictResolverCompact } from './ConflictResolver';

interface SyncStatusIndicatorProps {
  userId?: string;
  onSyncComplete?: () => void;
  onSyncError?: (error: string) => void;
  className?: string;
}

export function SyncStatusIndicator({ 
  userId, 
  onSyncComplete, 
  onSyncError, 
  className = '' 
}: SyncStatusIndicatorProps) {
  const { 
    syncState, 
    syncProgress, 
    syncStatus, 
    startSync, 
    retrySync 
  } = useSyncWithProgress();

  const [showDetails, setShowDetails] = useState(false);

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
        );
      case 'success':
        return <span className="text-green-600">✓</span>;
      case 'error':
        return <span className="text-red-600">✗</span>;
      case 'conflicts':
        return <span className="text-yellow-600">⚠</span>;
      default:
        return <span className="text-gray-400">○</span>;
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
        return 'text-gray-400';
    }
  };

  const handleQuickSync = async () => {
    if (!userId || syncStatus === 'syncing') return;
    
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

  return (
    <div className={`relative ${className}`}>
      {/* Main Indicator */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-bg-800 active:bg-bg-700 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          title={syncProgress.message}
        >
          {getStatusIcon()}
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {syncStatus === 'syncing' ? 'Syncing' : 
             syncStatus === 'success' ? 'Synced' :
             syncStatus === 'error' ? 'Error' :
             syncStatus === 'conflicts' ? 'Conflicts' : 'Sync'}
          </span>
        </button>

        {/* Quick Actions */}
        {syncStatus === 'idle' && userId && (
          <button
            onClick={handleQuickSync}
            className="px-3 py-2 text-xs bg-brand-500 text-bg-900 rounded-md hover:bg-brand-600 active:bg-brand-700 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            title="Start sync"
          >
            Sync
          </button>
        )}

        {syncStatus === 'error' && (
          <button
            onClick={handleRetry}
            className="px-3 py-2 text-xs bg-state-error text-bg-900 rounded-md hover:brightness-90 active:brightness-80 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            title="Retry sync"
          >
            Retry
          </button>
        )}

        {/* Progress Indicator for Syncing */}
        {syncStatus === 'syncing' && (
          <div className="flex items-center space-x-2">
            <div className="w-16 bg-gray-200 rounded-full h-1">
              <div
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${syncProgress.percentage}%` }}
              />
            </div>
            <span className="text-xs text-gray-600">
              {Math.round(syncProgress.percentage)}%
            </span>
          </div>
        )}
      </div>

      {/* Dropdown Details */}
      {showDetails && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <SyncProgress 
              userId={userId}
              onSyncComplete={onSyncComplete}
              onSyncError={onSyncError}
              className="border-0 shadow-none"
            />
          </div>
        </div>
      )}

      {/* Conflict Notification */}
      {syncStatus === 'conflicts' && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50">
          <ConflictResolverCompact onResolve={onSyncComplete} />
        </div>
      )}
    </div>
  );
}

// Compact version for small spaces
export function SyncStatusIndicatorCompact({ 
  userId, 
  onSyncComplete, 
  onSyncError 
}: Omit<SyncStatusIndicatorProps, 'className'>) {
  const { syncProgress, syncStatus, startSync, retrySync } = useSyncWithProgress();

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

  const handleSync = async () => {
    if (!userId || syncStatus === 'syncing') return;
    
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

  return (
    <div className="flex items-center space-x-1">
      <span className="text-sm" title={syncProgress.message}>
        {getStatusIcon()}
      </span>
      
      {syncStatus === 'idle' && userId && (
        <button
          onClick={handleSync}
          className="px-2 py-1 text-xs text-brand-500 hover:bg-bg-800 active:bg-bg-700 rounded-md transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          title="Start sync"
        >
          Sync
        </button>
      )}
      
      {syncStatus === 'error' && (
        <button
          onClick={handleRetry}
          className="px-2 py-1 text-xs text-state-error hover:bg-bg-800 active:bg-bg-700 rounded-md transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          title="Retry sync"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// Floating notification for sync events
export function SyncNotification({ 
  userId, 
  onSyncComplete, 
  onSyncError 
}: Omit<SyncStatusIndicatorProps, 'className'>) {
  const { syncState, syncProgress, syncStatus, startSync, retrySync } = useSyncWithProgress();

  const [isVisible, setIsVisible] = useState(false);

  React.useEffect(() => {
    if (syncStatus === 'error' || syncStatus === 'conflicts') {
      setIsVisible(true);
    } else if (syncStatus === 'success') {
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 3000);
    }
  }, [syncStatus]);

  if (!isVisible) return null;

  const getNotificationStyle = () => {
    switch (syncStatus) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'conflicts':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getNotificationIcon = () => {
    switch (syncStatus) {
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

  const handleAction = async () => {
    if (syncStatus === 'error') {
      await retrySync();
    } else if (syncStatus === 'idle' && userId) {
      await startSync(userId);
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border ${getNotificationStyle()} shadow-lg`}>
      <div className="flex items-center space-x-3">
        <span className="text-lg">{getNotificationIcon()}</span>
        <div className="flex-1">
          <div className="font-medium">{syncProgress.message}</div>
          {syncState.error && (
            <div className="text-sm opacity-75">{syncState.error}</div>
          )}
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="p-2 rounded-full text-text-200 hover:bg-bg-800 active:bg-bg-700 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
      
      {(syncStatus === 'error' || (syncStatus === 'idle' && userId)) && (
        <button
          onClick={handleAction}
          className="mt-2 px-3 py-2 text-sm bg-transparent text-text-100 border border-border-600 rounded-md hover:bg-bg-700 active:bg-bg-600 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        >
          {syncStatus === 'error' ? 'Retry' : 'Sync Now'}
        </button>
      )}
    </div>
  );
} 