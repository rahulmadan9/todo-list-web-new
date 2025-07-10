import { 
  generateTaskKey, 
  detectDuplicates, 
  detectDuplicatesWithConfidence,
  calculateTaskSimilarity,
  detectModifiedTasks, 
  mergeLocalWithCloud, 
  syncTasks,
  resolveConflicts,
  resolveConflictsAdvanced,
  mergeTaskData,
  smartMergeTasks,
  processDuplicateConflicts,
  generateConflictDescription,
  validateSyncResult,
  getSyncStats,
  type SyncResult,
  type TaskConflict,
  type SyncOptions
} from './sync';
import { Task } from './firestore';

// Simple test runner for now (Jest can be added later)
function runTests() {
  console.log('Running sync utility tests...');
  
  // Test generateTaskKey
  testGenerateTaskKey();
  
  // Test detectDuplicates
  testDetectDuplicates();
  
  // Test detectModifiedTasks
  testDetectModifiedTasks();
  
  // Test mergeTaskData
  testMergeTaskData();
  
  // Test validateSyncResult
  testValidateSyncResult();
  
  // Test getSyncStats
  testGetSyncStats();
  
  // Test new duplicate detection and resolution functions
  testCalculateTaskSimilarity();
  testDetectDuplicatesWithConfidence();
  testResolveConflictsAdvanced();
  testSmartMergeTasks();
  testProcessDuplicateConflicts();
  testGenerateConflictDescription();
  
  console.log('All tests completed!');
}

function testCalculateTaskSimilarity() {
  console.log('Testing calculateTaskSimilarity...');
  
  const task1: Task = {
    id: '1',
    title: 'Test Task',
    completed: false,
    createdAt: 1000,
    notes: 'Test notes'
  };
  
  const task2: Task = {
    id: '2',
    title: 'test task',
    completed: true,
    createdAt: 2000,
    notes: 'test notes'
  };
  
  const similarity = calculateTaskSimilarity(task1, task2);
  
  if (similarity > 0.8) {
    console.log('✅ calculateTaskSimilarity: Correctly calculated high similarity');
  } else {
    console.log('❌ calculateTaskSimilarity: Should detect high similarity for identical content');
  }
}

function testDetectDuplicatesWithConfidence() {
  console.log('Testing detectDuplicatesWithConfidence...');
  
  const localTasks: Task[] = [
    {
      id: 'local_1',
      title: 'Task 1',
      completed: false,
      createdAt: 1000,
      notes: 'Notes 1'
    }
  ];
  
  const cloudTasks: Task[] = [
    {
      id: 'cloud_1',
      title: 'Task 1',
      completed: true,
      createdAt: 1500,
      notes: 'Notes 1'
    }
  ];
  
  const conflicts = detectDuplicatesWithConfidence(localTasks, cloudTasks, 0.8);
  
  if (conflicts.length === 1 && conflicts[0].confidence && conflicts[0].confidence > 0.8) {
    console.log('✅ detectDuplicatesWithConfidence: Correctly detected duplicate with confidence');
  } else {
    console.log('❌ detectDuplicatesWithConfidence: Should detect duplicate with confidence score');
  }
}

function testResolveConflictsAdvanced() {
  console.log('Testing resolveConflictsAdvanced...');
  
  const conflicts: TaskConflict[] = [
    {
      localTask: {
        id: 'local_1',
        title: 'Task',
        completed: true,
        createdAt: 2000
      },
      cloudTask: {
        id: 'cloud_1',
        title: 'Task',
        completed: false,
        createdAt: 1000
      },
      type: 'duplicate'
    }
  ];
  
  const resolved = resolveConflictsAdvanced(conflicts, 'completion');
  
  if (resolved[0].resolution === 'keep_local') {
    console.log('✅ resolveConflictsAdvanced: Correctly resolved using completion strategy');
  } else {
    console.log('❌ resolveConflictsAdvanced: Should prefer completed task');
  }
}

function testSmartMergeTasks() {
  console.log('Testing smartMergeTasks...');
  
  const localTask: Task = {
    id: 'local_1',
    title: 'Local Title',
    completed: true,
    createdAt: 1000,
    notes: 'Local notes',
    dueDate: '2023-01-01'
  };
  
  const cloudTask: Task = {
    id: 'cloud_1',
    title: 'Cloud Title',
    completed: false,
    createdAt: 2000,
    notes: 'Cloud notes',
    dueDate: '2023-01-02'
  };
  
  const merged = smartMergeTasks(localTask, cloudTask);
  
  if (merged.id === 'cloud_1' && merged.completed === true) {
    console.log('✅ smartMergeTasks: Correctly merged tasks with smart strategy');
  } else {
    console.log('❌ smartMergeTasks: Should merge with smart strategy');
  }
}

function testProcessDuplicateConflicts() {
  console.log('Testing processDuplicateConflicts...');
  
  const conflicts: TaskConflict[] = [
    {
      localTask: {
        id: 'local_1',
        title: 'Task',
        completed: false,
        createdAt: 1000
      },
      cloudTask: {
        id: 'cloud_1',
        title: 'Task',
        completed: true,
        createdAt: 2000
      },
      type: 'duplicate',
      confidence: 0.95
    }
  ];
  
  const result = processDuplicateConflicts(conflicts);
  
  if (result.autoResolvedCount === 1 && result.resolvedConflicts.length === 1) {
    console.log('✅ processDuplicateConflicts: Correctly processed high-confidence duplicates');
  } else {
    console.log('❌ processDuplicateConflicts: Should auto-resolve high-confidence duplicates');
  }
}

function testGenerateConflictDescription() {
  console.log('Testing generateConflictDescription...');
  
  const conflict: TaskConflict = {
    localTask: {
      id: 'local_1',
      title: 'Task',
      completed: false,
      createdAt: 1000
    },
    cloudTask: {
      id: 'cloud_1',
      title: 'Task',
      completed: true,
      createdAt: 2000
    },
    type: 'duplicate',
    confidence: 0.95
  };
  
  const description = generateConflictDescription(conflict);
  
  if (description.includes('Exact duplicate') && description.includes('95%')) {
    console.log('✅ generateConflictDescription: Correctly generated user-friendly description');
  } else {
    console.log('❌ generateConflictDescription: Should generate descriptive message');
  }
}

function testGenerateTaskKey() {
  console.log('Testing generateTaskKey...');
  
  const task1: Task = {
    id: '1',
    title: 'Test Task',
    completed: false,
    createdAt: 1000,
    notes: 'Test notes'
  };
  
  const task2: Task = {
    id: '2',
    title: 'test task',
    completed: true,
    createdAt: 2000,
    notes: 'test notes'
  };
  
  const key1 = generateTaskKey(task1);
  const key2 = generateTaskKey(task2);
  
  if (key1 === key2) {
    console.log('✅ generateTaskKey: Consistent keys for identical tasks');
  } else {
    console.log('❌ generateTaskKey: Keys should be consistent');
  }
}

function testDetectDuplicates() {
  console.log('Testing detectDuplicates...');
  
  const localTasks: Task[] = [
    {
      id: 'local_1',
      title: 'Task 1',
      completed: false,
      createdAt: 1000,
      notes: 'Notes 1'
    }
  ];
  
  const cloudTasks: Task[] = [
    {
      id: 'cloud_1',
      title: 'Task 1',
      completed: true,
      createdAt: 1500,
      notes: 'Notes 1'
    }
  ];
  
  const conflicts = detectDuplicates(localTasks, cloudTasks);
  
  if (conflicts.length === 1 && conflicts[0].type === 'duplicate') {
    console.log('✅ detectDuplicates: Correctly detected duplicate');
  } else {
    console.log('❌ detectDuplicates: Should detect one duplicate');
  }
}

function testDetectModifiedTasks() {
  console.log('Testing detectModifiedTasks...');
  
  const localTasks: Task[] = [
    {
      id: 'cloud_1',
      title: 'Modified Task',
      completed: true,
      createdAt: 1000,
      notes: 'Modified notes'
    }
  ];
  
  const cloudTasks: Task[] = [
    {
      id: 'cloud_1',
      title: 'Original Task',
      completed: false,
      createdAt: 1000,
      notes: 'Original notes'
    }
  ];
  
  const conflicts = detectModifiedTasks(localTasks, cloudTasks);
  
  if (conflicts.length === 1 && conflicts[0].type === 'modified') {
    console.log('✅ detectModifiedTasks: Correctly detected modification');
  } else {
    console.log('❌ detectModifiedTasks: Should detect one modification');
  }
}

function testMergeTaskData() {
  console.log('Testing mergeTaskData...');
  
  const localTask: Task = {
    id: 'local_1',
    title: 'Local Title',
    completed: true,
    createdAt: 1000,
    notes: 'Local notes',
    dueDate: '2023-01-01'
  };
  
  const cloudTask: Task = {
    id: 'cloud_1',
    title: 'Cloud Title',
    completed: false,
    createdAt: 2000,
    notes: 'Cloud notes',
    dueDate: '2023-01-02'
  };
  
  const merged = mergeTaskData(localTask, cloudTask);
  
  if (merged.id === 'cloud_1' && merged.title === 'Local Title' && merged.completed === true) {
    console.log('✅ mergeTaskData: Correctly merged task data');
  } else {
    console.log('❌ mergeTaskData: Should merge correctly');
  }
}

function testValidateSyncResult() {
  console.log('Testing validateSyncResult...');
  
  const result: SyncResult = {
    success: true,
    uploadedCount: 3
  };
  
  const validation = validateSyncResult(result);
  
  if (validation.isValid && validation.message.includes('Successfully synced 3 tasks')) {
    console.log('✅ validateSyncResult: Correctly validated successful sync');
  } else {
    console.log('❌ validateSyncResult: Should validate successful sync');
  }
}

function testGetSyncStats() {
  console.log('Testing getSyncStats...');
  
  const localTasks: Task[] = [
    {
      id: 'local_1',
      title: 'Local Task 1',
      completed: false,
      createdAt: 1000
    }
  ];
  
  const cloudTasks: Task[] = [
    {
      id: 'cloud_1',
      title: 'Local Task 1', // Duplicate
      completed: true,
      createdAt: 1500
    }
  ];
  
  const stats = getSyncStats(localTasks, cloudTasks);
  
  if (stats.localCount === 1 && stats.cloudCount === 1 && stats.duplicateCount === 1) {
    console.log('✅ getSyncStats: Correctly calculated sync statistics');
  } else {
    console.log('❌ getSyncStats: Should calculate correct statistics');
  }
}

// Export for potential use in other test runners
export { runTests };

// Run tests if this file is executed directly
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  runTests();
} 