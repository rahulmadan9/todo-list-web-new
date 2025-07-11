import { useEffect, useCallback } from 'react';
import { getNetworkManager, getReconnectionHandler, type NetworkInfo } from '../lib/network';
import { useTaskActions, useTaskSelectors } from '../store/taskStore';

export interface NetworkHook {
  // State
  networkInfo: NetworkInfo | null;
  isOnline: boolean;
  canSync: boolean;
  
  // Actions
  initializeNetworkManager: () => void;
  initializeReconnectionHandler: () => void;
  
  // Utility
  shouldSync: () => boolean;
  getConnectionSummary: () => string;
}

export function useNetwork(): NetworkHook {
  // Selectors
  const networkInfo = useTaskSelectors.useSyncState().networkInfo;
  const user = useTaskSelectors.useUser();
  
  // Actions
  const actions = useTaskActions();

  // Initialize network manager
  const initializeNetworkManager = useCallback(() => {
    if (typeof window !== 'undefined') {
      const networkManager = getNetworkManager();
      actions.setNetworkInfo(networkManager.getNetworkInfo());
      
      const unsubscribe = networkManager.subscribe(() => {
        actions.setNetworkInfo(networkManager.getNetworkInfo());
      });
      
      return unsubscribe;
    }
  }, [actions]);

  // Initialize reconnection handler
  const initializeReconnectionHandler = useCallback(() => {
    if (typeof window !== 'undefined' && user) {
      const reconnectionHandler = getReconnectionHandler({
        autoProcessQueue: true,
        showNotifications: false, // We'll handle notifications via toast
        retryAttempts: 3,
        retryDelay: 2000,
        onQueueProcess: (success, count) => {
          if (success && count > 0) {
            actions.showToast(
              `Synced ${count} task${count > 1 ? 's' : ''}`,
              "success"
            );
          } else if (!success && count > 0) {
            actions.showToast(
              "Some tasks couldn't be saved. We'll keep trying.",
              "warning"
            );
          }
        }
      });

      return () => {
        // Cleanup happens automatically via singleton pattern
      };
    }
  }, [user, actions]);

  // Initialize network manager on mount
  useEffect(() => {
    const unsubscribe = initializeNetworkManager();
    return unsubscribe;
  }, [initializeNetworkManager]);

  // Initialize reconnection handler when user changes
  useEffect(() => {
    const cleanup = initializeReconnectionHandler();
    return cleanup;
  }, [initializeReconnectionHandler]);

  // Check if should sync
  const shouldSync = useCallback((): boolean => {
    return Boolean(networkInfo?.isOnline && networkInfo?.canSync);
  }, [networkInfo]);

  // Get connection summary
  const getConnectionSummary = useCallback((): string => {
    if (!networkInfo) return 'Unknown';
    
    if (!networkInfo.isOnline) {
      return 'Offline';
    }
    
    return networkInfo.message || 'Online';
  }, [networkInfo]);

  return {
    // State
    networkInfo,
    isOnline: networkInfo?.isOnline || false,
    canSync: networkInfo?.canSync || false,
    
    // Actions
    initializeNetworkManager,
    initializeReconnectionHandler,
    
    // Utility
    shouldSync,
    getConnectionSummary,
  };
}