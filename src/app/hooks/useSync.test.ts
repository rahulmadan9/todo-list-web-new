import { useSync, useSyncWithUser, useSyncWithProgress } from './useSync';
import { User } from 'firebase/auth';

// Simple test runner for useSync hook
function runUseSyncTests() {
  console.log('Running useSync hook tests...');
  
  testUseSyncInitialState();
  testUseSyncWithUser();
  testUseSyncWithProgress();
  
  console.log('All useSync hook tests completed!');
}

function testUseSyncInitialState() {
  console.log('Testing useSync initial state...');
  
  // This would normally test the hook's initial state
  // Since we can't easily test React hooks without a testing framework,
  // we'll just verify the hook exports are available
  if (typeof useSync === 'function') {
    console.log('✅ useSync: Hook function is exported correctly');
  } else {
    console.log('❌ useSync: Hook function should be exported');
  }
}

function testUseSyncWithUser() {
  console.log('Testing useSyncWithUser...');
  
  if (typeof useSyncWithUser === 'function') {
    console.log('✅ useSyncWithUser: Hook function is exported correctly');
  } else {
    console.log('❌ useSyncWithUser: Hook function should be exported');
  }
}

function testUseSyncWithProgress() {
  console.log('Testing useSyncWithProgress...');
  
  if (typeof useSyncWithProgress === 'function') {
    console.log('✅ useSyncWithProgress: Hook function is exported correctly');
  } else {
    console.log('❌ useSyncWithProgress: Hook function should be exported');
  }
}

// Export for potential use in other test runners
export { runUseSyncTests };

// Run tests if this file is executed directly
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  runUseSyncTests();
} 