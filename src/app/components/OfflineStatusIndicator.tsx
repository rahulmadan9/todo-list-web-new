import React, { useState } from 'react';
import { getNetworkManager, type NetworkState, type NetworkInfo } from '../lib/network';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

interface OfflineStatusIndicatorProps {
  userId?: string;
  className?: string;
  showDetails?: boolean;
  onQueueProcess?: () => void;
}

export function OfflineStatusIndicator({ 
  userId, 
  className = '', 
  showDetails = false,
  onQueueProcess 
}: OfflineStatusIndicatorProps) {
  const [networkState, setNetworkState] = useState<NetworkState | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [showQueueDetails, setShowQueueDetails] = useState(false);

  const { 
    queueStats, 
    pendingActions, 
    isProcessing, 
    shouldProcessQueue, 
    canSync,
    processQueue,
    hasPendingActions
  } = useOfflineQueue();

  // Subscribe to network changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const networkManager = getNetworkManager();
      setNetworkState(networkManager.getState());
      setNetworkInfo(networkManager.getNetworkInfo());
      const unsubscribe = networkManager.subscribe((state) => {
        setNetworkState(state);
        setNetworkInfo(networkManager.getNetworkInfo());
      });
      return unsubscribe;
    }
  }, []);

  const getStatusIcon = () => {
    if (!networkInfo?.isOnline) {
      return '📡';
    }
    
    switch (networkInfo?.connectionQuality) {
      case 'excellent':
        return '📶';
      case 'good':
        return '📶';
      case 'poor':
        return '📶';
      default:
        return '📱';
    }
  };

  const getStatusColor = () => {
    if (!networkInfo?.isOnline) {
      return 'text-red-600';
    }
    
    switch (networkInfo?.connectionQuality) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'poor':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    if (!networkInfo?.isOnline) {
      return 'Offline';
    }
    
    switch (networkInfo?.connectionQuality) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'poor':
        return 'Poor';
      default:
        return 'Unknown';
    }
  };

  const handleProcessQueue = async () => {
    if (shouldProcessQueue && hasPendingActions(userId)) {
      await processQueue();
      onQueueProcess?.();
    }
  };

  const getPendingActionsText = () => {
    if (!userId) return '';
    
    const userActions = pendingActions.filter(action => action.userId === userId);
    const count = userActions.length;
    
    if (count === 0) return '';
    if (count === 1) return '1 pending action';
    return `${count} pending actions`;
  };

  const getQueueStatusText = () => {
    if (isProcessing) return 'Processing...';
    if (hasPendingActions(userId)) return 'Pending actions';
    return 'No pending actions';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Indicator */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowQueueDetails(!showQueueDetails)}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-bg-800 active:bg-bg-700 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          title={networkInfo?.message}
        >
          <span className="text-lg">{getStatusIcon()}</span>
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          
          {/* Pending actions indicator */}
          {hasPendingActions(userId) && (
            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
              {pendingActions.filter(a => a.userId === userId).length}
            </span>
          )}
        </button>

        {/* Process Queue Button */}
        {shouldProcessQueue && hasPendingActions(userId) && !isProcessing && (
          <button
            onClick={handleProcessQueue}
            className="px-3 py-2 text-sm bg-brand-500 text-bg-900 rounded-md hover:bg-brand-600 active:bg-brand-700 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            title="Process pending actions"
          >
            Process
          </button>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
            <span className="text-xs text-gray-600">Processing...</span>
          </div>
        )}
      </div>

      {/* Dropdown Details */}
      {showQueueDetails && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
            <OfflineStatusDetails 
              networkState={networkState}
              networkInfo={networkInfo}
              queueStats={queueStats}
              pendingActions={pendingActions}
              userId={userId}
              onProcessQueue={handleProcessQueue}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Detailed offline status component
function OfflineStatusDetails({ 
  networkState, 
  networkInfo, 
  queueStats, 
  pendingActions, 
  userId,
  onProcessQueue 
}: {
  networkState: NetworkState | null;
  networkInfo: NetworkInfo | null;
  queueStats: any;
  pendingActions: any[];
  userId?: string;
  onProcessQueue: () => void;
}) {
  const userActions = userId ? pendingActions.filter(a => a.userId === userId) : pendingActions;

  return (
    <div className="space-y-4">
      {/* Network Status */}
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Network Status</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className={`font-medium ${networkInfo?.isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {networkInfo?.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          
          {networkInfo?.isOnline && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Quality:</span>
                <span className="font-medium">{networkInfo?.connectionQuality}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Sync:</span>
                <span className={`font-medium ${networkInfo?.canSync ? 'text-green-600' : 'text-red-600'}`}>
                  {networkInfo?.canSync ? 'Available' : 'Disabled'}
                </span>
              </div>
              
              {networkState?.connectionType !== 'unknown' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Connection:</span>
                  <span className="font-medium">{networkState?.connectionType}</span>
                </div>
              )}
            </>
          )}
          
          {networkState?.lastOffline && (
            <div className="flex justify-between">
              <span className="text-gray-600">Last offline:</span>
              <span className="text-sm text-gray-500">
                {new Date(networkState?.lastOffline).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Queue Status */}
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Pending Actions</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total:</span>
            <span className="font-medium">{queueStats?.total}</span>
          </div>
          
          {userId && (
            <div className="flex justify-between">
              <span className="text-gray-600">Your actions:</span>
              <span className="font-medium">{userActions.length}</span>
            </div>
          )}
          
          {userActions.length > 0 && (
            <div className="mt-3">
              <h5 className="font-medium text-gray-700 mb-2">Recent Actions:</h5>
              <div className="space-y-1">
                {userActions.slice(0, 3).map((action) => (
                  <div key={action.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      {action.type} {action.metadata?.title || action.metadata?.taskId || ''}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      action.priority === 'high' ? 'bg-red-100 text-red-700' :
                      action.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {action.priority}
                    </span>
                  </div>
                ))}
                {userActions.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{userActions.length - 3} more actions
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {userActions.length > 0 && networkInfo?.canSync && (
        <div className="pt-3 border-t border-gray-200">
          <button
            onClick={onProcessQueue}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
          >
            Process All Actions
          </button>
        </div>
      )}

      {/* Network Message */}
      {networkInfo?.message && (
        <div className="pt-3 border-t border-border-600">
          <p className="text-sm text-text-200">{networkInfo?.message}</p>
        </div>
      )}
    </div>
  );
}

// Compact version for small spaces
export function OfflineStatusIndicatorCompact({ 
  userId, 
  onQueueProcess 
}: Omit<OfflineStatusIndicatorProps, 'className' | 'showDetails'>) {
  const [networkInfo] = useState(getNetworkManager().getNetworkInfo());
  const { hasPendingActions, isProcessing } = useOfflineQueue();

  const getStatusIcon = () => {
    if (!networkInfo?.isOnline) return '📡';
    if (hasPendingActions(userId)) return '⏳';
    return '📶';
  };

  const getStatusColor = () => {
    if (!networkInfo?.isOnline) return 'text-red-600';
    if (hasPendingActions(userId)) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="flex items-center space-x-1">
      <span className={`text-sm ${getStatusColor()}`} title={networkInfo?.message}>
        {getStatusIcon()}
      </span>
      
      {isProcessing && (
        <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent" />
      )}
    </div>
  );
}

// Floating notification for offline status changes
export function OfflineStatusNotification({ 
  userId 
}: { userId?: string }) {
  const [networkInfo, setNetworkInfo] = useState(getNetworkManager().getNetworkInfo());
  const [isVisible, setIsVisible] = useState(false);
  const { hasPendingActions, processQueue } = useOfflineQueue();

  React.useEffect(() => {
    const networkManager = getNetworkManager();
    
    const unsubscribe = networkManager.subscribe(() => {
      const info = networkManager.getNetworkInfo();
      setNetworkInfo(info);
      
      // Show notification for important status changes
      if (!info?.isOnline || (info?.isOnline && hasPendingActions(userId))) {
        setIsVisible(true);
        setTimeout(() => setIsVisible(false), 5000);
      }
    });

    return unsubscribe;
  }, [userId, hasPendingActions]);

  if (!isVisible) return null;

  const getNotificationStyle = () => {
    if (!networkInfo?.isOnline) {
      return 'bg-red-50 border-red-200 text-red-800';
    }
    if (hasPendingActions(userId)) {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
    return 'bg-green-50 border-green-200 text-green-800';
  };

  const getNotificationIcon = () => {
    if (!networkInfo?.isOnline) return '📡';
    if (hasPendingActions(userId)) return '⏳';
    return '✅';
  };

  const getNotificationMessage = () => {
    if (!networkInfo?.isOnline) return 'You are now offline. Changes will be saved locally.';
    if (hasPendingActions(userId)) return 'You have pending actions to sync.';
    return 'You are back online and synced.';
  };

  const handleProcessQueue = async () => {
    if (networkInfo?.canSync && hasPendingActions(userId)) {
      await processQueue();
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border ${getNotificationStyle()} shadow-lg max-w-sm`}>
      <div className="flex items-center space-x-3">
        <span className="text-lg">{getNotificationIcon()}</span>
        <div className="flex-1">
          <div className="font-medium text-text-100">{getNotificationMessage()}</div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="p-2 rounded-full text-text-200 hover:bg-bg-800 active:bg-bg-700 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
      
      {networkInfo?.canSync && hasPendingActions(userId) && (
        <button
          onClick={handleProcessQueue}
          className="mt-2 px-3 py-2 text-sm bg-transparent text-text-100 border border-border-600 rounded-md hover:bg-bg-700 active:bg-bg-600 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        >
          Sync Now
        </button>
      )}
    </div>
  );
} 