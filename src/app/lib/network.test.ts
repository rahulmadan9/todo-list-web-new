import { 
  getNetworkManager, 
  destroyNetworkManager, 
  isOnline, 
  getConnectionInfo,
  waitForOnline,
  waitForOffline,
  assessNetworkQuality
} from './network';

// Simple test runner for network utilities
function runNetworkTests() {
  console.log('Running network utilities tests...');
  
  testNetworkManager();
  testUtilityFunctions();
  testNetworkQualityAssessment();
  
  console.log('All network utilities tests completed!');
}

function testNetworkManager() {
  console.log('Testing NetworkManager...');
  
  const manager = getNetworkManager();
  
  // Test initial state
  const state = manager.getState();
  if (state.isOnline === navigator.onLine) {
    console.log('✅ NetworkManager: Initial state correctly reflects online status');
  } else {
    console.log('❌ NetworkManager: Initial state should match navigator.onLine');
  }
  
  // Test network info
  const networkInfo = manager.getNetworkInfo();
  if (typeof networkInfo.isOnline === 'boolean') {
    console.log('✅ NetworkManager: getNetworkInfo returns valid network info');
  } else {
    console.log('❌ NetworkManager: getNetworkInfo should return valid network info');
  }
  
  // Test subscription
  let receivedUpdate = false;
  const unsubscribe = manager.subscribe((newState) => {
    receivedUpdate = true;
  });
  
  if (typeof unsubscribe === 'function') {
    console.log('✅ NetworkManager: subscribe returns unsubscribe function');
  } else {
    console.log('❌ NetworkManager: subscribe should return unsubscribe function');
  }
  
  unsubscribe();
  
  // Test connection stability
  const isStable = manager.isConnectionStable();
  if (typeof isStable === 'boolean') {
    console.log('✅ NetworkManager: isConnectionStable returns boolean');
  } else {
    console.log('❌ NetworkManager: isConnectionStable should return boolean');
  }
  
  // Test should sync
  const shouldSync = manager.shouldSync();
  if (typeof shouldSync === 'boolean') {
    console.log('✅ NetworkManager: shouldSync returns boolean');
  } else {
    console.log('❌ NetworkManager: shouldSync should return boolean');
  }
  
  // Test offline duration
  const offlineDuration = manager.getOfflineDuration();
  if (offlineDuration === null || typeof offlineDuration === 'number') {
    console.log('✅ NetworkManager: getOfflineDuration returns valid value');
  } else {
    console.log('❌ NetworkManager: getOfflineDuration should return number or null');
  }
  
  // Test connection summary
  const summary = manager.getConnectionSummary();
  if (typeof summary === 'string') {
    console.log('✅ NetworkManager: getConnectionSummary returns string');
  } else {
    console.log('❌ NetworkManager: getConnectionSummary should return string');
  }
}

function testUtilityFunctions() {
  console.log('Testing utility functions...');
  
  // Test isOnline
  const online = isOnline();
  if (typeof online === 'boolean') {
    console.log('✅ isOnline: Returns boolean value');
  } else {
    console.log('❌ isOnline: Should return boolean value');
  }
  
  // Test getConnectionInfo
  const connectionInfo = getConnectionInfo();
  if (connectionInfo && typeof connectionInfo === 'object') {
    console.log('✅ getConnectionInfo: Returns connection info object');
  } else {
    console.log('❌ getConnectionInfo: Should return connection info object');
  }
  
  // Test required properties in connection info
  const requiredProps = ['connectionType', 'effectiveType', 'downlink', 'rtt', 'saveData'];
  const hasAllProps = requiredProps.every(prop => prop in connectionInfo);
  if (hasAllProps) {
    console.log('✅ getConnectionInfo: Contains all required properties');
  } else {
    console.log('❌ getConnectionInfo: Should contain all required properties');
  }
}

function testNetworkQualityAssessment() {
  console.log('Testing network quality assessment...');
  
  const quality = assessNetworkQuality();
  
  // Test return structure
  if (quality && typeof quality === 'object') {
    console.log('✅ assessNetworkQuality: Returns quality object');
  } else {
    console.log('❌ assessNetworkQuality: Should return quality object');
  }
  
  // Test quality property
  const validQualities = ['excellent', 'good', 'poor', 'offline'];
  if (quality.quality && validQualities.includes(quality.quality)) {
    console.log('✅ assessNetworkQuality: Returns valid quality level');
  } else {
    console.log('❌ assessNetworkQuality: Should return valid quality level');
  }
  
  // Test score property
  if (typeof quality.score === 'number' && quality.score >= 0 && quality.score <= 100) {
    console.log('✅ assessNetworkQuality: Returns valid score (0-100)');
  } else {
    console.log('❌ assessNetworkQuality: Should return valid score (0-100)');
  }
  
  // Test recommendations property
  if (Array.isArray(quality.recommendations)) {
    console.log('✅ assessNetworkQuality: Returns recommendations array');
  } else {
    console.log('❌ assessNetworkQuality: Should return recommendations array');
  }
}

// Test promise-based utilities
async function testAsyncUtilities() {
  console.log('Testing async utility functions...');
  
  // Test waitForOnline (this would normally be tested with mocks)
  try {
    // This is a basic test - in a real environment we'd mock the online event
    const onlinePromise = waitForOnline();
    if (onlinePromise instanceof Promise) {
      console.log('✅ waitForOnline: Returns a Promise');
    } else {
      console.log('❌ waitForOnline: Should return a Promise');
    }
  } catch (error) {
    console.log('❌ waitForOnline: Should not throw error during creation');
  }
  
  // Test waitForOffline
  try {
    const offlinePromise = waitForOffline();
    if (offlinePromise instanceof Promise) {
      console.log('✅ waitForOffline: Returns a Promise');
    } else {
      console.log('❌ waitForOffline: Should return a Promise');
    }
  } catch (error) {
    console.log('❌ waitForOffline: Should not throw error during creation');
  }
}

// Test singleton behavior
function testSingletonBehavior() {
  console.log('Testing singleton behavior...');
  
  const manager1 = getNetworkManager();
  const manager2 = getNetworkManager();
  
  if (manager1 === manager2) {
    console.log('✅ NetworkManager: Implements singleton pattern correctly');
  } else {
    console.log('❌ NetworkManager: Should implement singleton pattern');
  }
  
  // Test destroy functionality
  try {
    destroyNetworkManager();
    console.log('✅ destroyNetworkManager: Executes without error');
  } catch (error) {
    console.log('❌ destroyNetworkManager: Should not throw error');
  }
}

// Export for potential use in other test runners
export { runNetworkTests, testAsyncUtilities, testSingletonBehavior };

// Run tests if this file is executed directly
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  runNetworkTests();
  testSingletonBehavior();
} 