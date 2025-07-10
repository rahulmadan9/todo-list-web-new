export interface NetworkState {
  isOnline: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
  lastOnline: number | null;
  lastOffline: number | null;
  offlineDuration: number | null;
}

export interface NetworkInfo {
  isOnline: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  canSync: boolean;
  recommendedAction: 'sync-now' | 'wait' | 'retry' | 'offline-mode';
  message: string;
}

export type NetworkListener = (state: NetworkState) => void;

class NetworkManager {
  private state: NetworkState;
  private listeners: Set<NetworkListener> = new Set();
  private onlineListener: (() => void) | null = null;
  private offlineListener: (() => void) | null = null;
  private connectionListener: ((event: Event) => void) | null = null;
  private initialized = false;

  constructor() {
    this.state = this.getInitialState();
    // Don't initialize listeners immediately - defer until needed
  }

  private getInitialState(): NetworkState {
    const now = Date.now();
    
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        isOnline: false,
        connectionType: 'unknown',
        effectiveType: 'unknown',
        downlink: null,
        rtt: null,
        saveData: false,
        lastOnline: null,
        lastOffline: now,
        offlineDuration: null
      };
    }
    
    return {
      isOnline: navigator.onLine,
      connectionType: 'unknown',
      effectiveType: 'unknown',
      downlink: null,
      rtt: null,
      saveData: false,
      lastOnline: navigator.onLine ? now : null,
      lastOffline: navigator.onLine ? null : now,
      offlineDuration: navigator.onLine ? null : 0
    };
  }

  private ensureInitialized(): void {
    if (this.initialized || typeof window === 'undefined') {
      return;
    }
    
    this.initializeListeners();
    this.initialized = true;
  }

  private initializeListeners(): void {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }
    
    // Online/Offline events
    this.onlineListener = () => {
      const now = Date.now();
      this.updateState({
        isOnline: true,
        lastOnline: now,
        lastOffline: this.state.lastOffline,
        offlineDuration: this.state.lastOffline ? now - this.state.lastOffline : null
      });
    };

    this.offlineListener = () => {
      const now = Date.now();
      this.updateState({
        isOnline: false,
        lastOffline: now,
        lastOnline: this.state.lastOnline
      });
    };

    // Connection API events (if available)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      this.connectionListener = (event: Event) => {
        const target = event.target as any;
        this.updateState({
          connectionType: target.effectiveType || 'unknown',
          effectiveType: target.effectiveType || 'unknown',
          downlink: target.downlink || null,
          rtt: target.rtt || null,
          saveData: target.saveData || false
        });
      };

      connection.addEventListener('change', this.connectionListener);
      
      // Set initial connection info
      this.updateState({
        connectionType: connection.effectiveType || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || null,
        rtt: connection.rtt || null,
        saveData: connection.saveData || false
      });
    }

    // Add event listeners
    window.addEventListener('online', this.onlineListener);
    window.addEventListener('offline', this.offlineListener);
  }

  private updateState(updates: Partial<NetworkState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Network listener error:', error);
      }
    });
  }

  // Public API
  public getState(): NetworkState {
    this.ensureInitialized(); // Ensure listeners are initialized
    return { ...this.state };
  }

  public subscribe(listener: NetworkListener): () => void {
    this.ensureInitialized(); // Ensure listeners are initialized when someone subscribes
    this.listeners.add(listener);
    
    // Immediately call with current state
    listener(this.state);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getNetworkInfo(): NetworkInfo {
    this.ensureInitialized(); // Ensure listeners are initialized
    const { isOnline, effectiveType, downlink, rtt } = this.state;
    
    if (!isOnline) {
      return {
        isOnline: false,
        connectionQuality: 'offline',
        canSync: false,
        recommendedAction: 'offline-mode',
        message: 'You are currently offline. Changes will be saved locally.'
      };
    }

    // Determine connection quality
    let connectionQuality: NetworkInfo['connectionQuality'] = 'good';
    let canSync = true;
    let recommendedAction: NetworkInfo['recommendedAction'] = 'sync-now';
    let message = '';

    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      connectionQuality = 'poor';
      canSync = false;
      recommendedAction = 'wait';
      message = 'Connection is very slow. Sync is disabled to save data.';
    } else if (effectiveType === '3g') {
      connectionQuality = 'good';
      canSync = true;
      recommendedAction = 'sync-now';
      message = 'Connection is good. Sync is available.';
    } else if (effectiveType === '4g' || effectiveType === 'unknown') {
      connectionQuality = 'excellent';
      canSync = true;
      recommendedAction = 'sync-now';
      message = 'Connection is excellent. Sync is available.';
    }

    // Consider RTT and downlink for more precise quality assessment
    if (rtt && rtt > 200) {
      connectionQuality = 'poor';
      canSync = false;
      recommendedAction = 'wait';
      message = 'High latency detected. Sync is temporarily disabled.';
    } else if (downlink && downlink < 1) {
      connectionQuality = 'poor';
      canSync = false;
      recommendedAction = 'wait';
      message = 'Slow download speed. Sync is temporarily disabled.';
    }

    return {
      isOnline,
      connectionQuality,
      canSync,
      recommendedAction,
      message
    };
  }

  public isConnectionStable(): boolean {
    this.ensureInitialized(); // Ensure listeners are initialized
    const { isOnline, effectiveType, rtt } = this.state;
    
    if (!isOnline) return false;
    
    // Consider connection stable if:
    // - 4G or unknown (assume good)
    // - 3G with reasonable RTT
    // - Not 2G or slow-2G
    if (effectiveType === '4g' || effectiveType === 'unknown') return true;
    if (effectiveType === '3g' && (!rtt || rtt < 300)) return true;
    
    return false;
  }

  public shouldSync(): boolean {
    this.ensureInitialized(); // Ensure listeners are initialized
    const networkInfo = this.getNetworkInfo();
    return networkInfo.canSync && networkInfo.isOnline;
  }

  public getOfflineDuration(): number | null {
    this.ensureInitialized(); // Ensure listeners are initialized
    const { isOnline, lastOffline, offlineDuration } = this.state;
    
    if (isOnline) {
      return offlineDuration;
    } else if (lastOffline) {
      return Date.now() - lastOffline;
    }
    
    return null;
  }

  public getConnectionSummary(): string {
    this.ensureInitialized(); // Ensure listeners are initialized
    const { isOnline, connectionType, effectiveType, downlink, rtt } = this.state;
    
    if (!isOnline) {
      return 'Offline';
    }
    
    const parts = [];
    if (effectiveType !== 'unknown') parts.push(effectiveType.toUpperCase());
    if (downlink) parts.push(`${downlink.toFixed(1)} Mbps`);
    if (rtt) parts.push(`${rtt}ms RTT`);
    
    return parts.length > 0 ? parts.join(' • ') : 'Online';
  }

  public destroy(): void {
    // Only remove listeners if we're in browser environment
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      // Remove event listeners
      if (this.onlineListener) {
        window.removeEventListener('online', this.onlineListener);
      }
      if (this.offlineListener) {
        window.removeEventListener('offline', this.offlineListener);
      }
      if (this.connectionListener && 'connection' in navigator) {
        const connection = (navigator as any).connection;
        connection.removeEventListener('change', this.connectionListener);
      }
    }
    
    // Clear listeners
    this.listeners.clear();
    this.initialized = false;
  }
}

// Singleton instance
let networkManager: NetworkManager | null = null;

export function getNetworkManager(): NetworkManager {
  if (!networkManager) {
    networkManager = new NetworkManager();
  }
  return networkManager;
}

export function destroyNetworkManager(): void {
  if (networkManager) {
    networkManager.destroy();
    networkManager = null;
  }
}

// Utility functions
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return false; // Assume offline during SSR
  }
  return navigator.onLine;
}

export function getConnectionInfo(): Partial<NetworkState> {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return {
      connectionType: 'unknown',
      effectiveType: 'unknown',
      downlink: null,
      rtt: null,
      saveData: false
    };
  }

  const connection = (navigator as any).connection;
  return {
    connectionType: connection.effectiveType || 'unknown',
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink || null,
    rtt: connection.rtt || null,
    saveData: connection.saveData || false
  };
}

export function waitForOnline(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      resolve(); // Resolve immediately during SSR
      return;
    }
    
    if (navigator.onLine) {
      resolve();
      return;
    }

    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      resolve();
    };

    window.addEventListener('online', handleOnline);
  });
}

export function waitForOffline(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      resolve(); // Resolve immediately during SSR
      return;
    }
    
    if (!navigator.onLine) {
      resolve();
      return;
    }

    const handleOffline = () => {
      window.removeEventListener('offline', handleOffline);
      resolve();
    };

    window.addEventListener('offline', handleOffline);
  });
}

// Network quality assessment
export function assessNetworkQuality(): {
  quality: 'excellent' | 'good' | 'poor' | 'offline';
  score: number;
  recommendations: string[];
} {
  const networkInfo = getNetworkManager().getNetworkInfo();
  const state = getNetworkManager().getState();
  
  let score = 0;
  const recommendations: string[] = [];

  if (!networkInfo.isOnline) {
    return {
      quality: 'offline',
      score: 0,
      recommendations: ['Wait for internet connection to sync data']
    };
  }

  // Score based on connection type
  switch (state.effectiveType) {
    case '4g':
      score += 40;
      break;
    case '3g':
      score += 25;
      break;
    case '2g':
      score += 10;
      recommendations.push('Consider waiting for better connection');
      break;
    case 'slow-2g':
      score += 5;
      recommendations.push('Connection is very slow');
      break;
    default:
      score += 20;
  }

  // Score based on RTT
  if (state.rtt) {
    if (state.rtt < 100) {
      score += 30;
    } else if (state.rtt < 200) {
      score += 20;
    } else if (state.rtt < 500) {
      score += 10;
      recommendations.push('High latency detected');
    } else {
      score += 5;
      recommendations.push('Very high latency');
    }
  }

  // Score based on downlink
  if (state.downlink) {
    if (state.downlink > 10) {
      score += 30;
    } else if (state.downlink > 5) {
      score += 20;
    } else if (state.downlink > 1) {
      score += 10;
    } else {
      score += 5;
      recommendations.push('Slow download speed');
    }
  }

  // Determine quality
  let quality: 'excellent' | 'good' | 'poor' | 'offline';
  if (score >= 80) {
    quality = 'excellent';
  } else if (score >= 50) {
    quality = 'good';
  } else {
    quality = 'poor';
  }

  return { quality, score, recommendations };
} 