import { Task } from './firestore';
import { getLocalTasks, clearLocalTasks } from './localStorage';
import { addUserTask, loadUserTasks } from './firestore';

export interface SyncResult {
  success: boolean;
  uploadedCount: number;
  error?: string;
  conflicts?: TaskConflict[];
}

export interface TaskConflict {
  localTask: Task;
  cloudTask: Task;
  type: 'duplicate' | 'modified' | 'deleted';
  resolution?: 'keep_local' | 'keep_cloud' | 'merge';
  confidence?: number; // 0-1, how confident we are this is a duplicate
  similarity?: number; // 0-1, how similar the tasks are
}

export interface SyncOptions {
  userId: string;
  forceUpload?: boolean;
  resolveConflicts?: boolean;
  onProgress?: (progress: number) => void;
}

/**
 * Generate a unique key for task comparison
 */
export function generateTaskKey(task: Task): string {
  return `${task.title.trim().toLowerCase()}-${(task.notes || '').trim().toLowerCase()}`;
}

/**
 * Calculate similarity between two tasks (0-1)
 */
export function calculateTaskSimilarity(task1: Task, task2: Task): number {
  const title1 = task1.title.trim().toLowerCase();
  const title2 = task2.title.trim().toLowerCase();
  const notes1 = (task1.notes || '').trim().toLowerCase();
  const notes2 = (task2.notes || '').trim().toLowerCase();
  
  // Exact match
  if (title1 === title2 && notes1 === notes2) {
    return 1.0;
  }
  
  // Calculate title similarity
  let titleSimilarity = 0;
  if (title1 === title2) {
    titleSimilarity = 1.0;
  } else if (title1.includes(title2) || title2.includes(title1)) {
    titleSimilarity = 0.8;
  } else {
    // Simple word-based similarity
    const words1 = title1.split(/\s+/);
    const words2 = title2.split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    titleSimilarity = commonWords.length / Math.max(words1.length, words2.length);
  }
  
  // Calculate notes similarity
  let notesSimilarity = 0;
  if (notes1 === notes2) {
    notesSimilarity = 1.0;
  } else if (notes1 && notes2) {
    if (notes1.includes(notes2) || notes2.includes(notes1)) {
      notesSimilarity = 0.8;
    } else {
      const words1 = notes1.split(/\s+/);
      const words2 = notes2.split(/\s+/);
      const commonWords = words1.filter(word => words2.includes(word));
      notesSimilarity = commonWords.length / Math.max(words1.length, words2.length);
    }
  }
  
  // Weighted average (title is more important than notes)
  const weightedSimilarity = (titleSimilarity * 0.7) + (notesSimilarity * 0.3);
  
  return Math.min(weightedSimilarity, 1.0);
}

/**
 * Detect potential duplicates with confidence scores
 */
export function detectDuplicatesWithConfidence(localTasks: Task[], cloudTasks: Task[], threshold: number = 0.8): TaskConflict[] {
  const conflicts: TaskConflict[] = [];
  
  localTasks.forEach(localTask => {
    cloudTasks.forEach(cloudTask => {
      const similarity = calculateTaskSimilarity(localTask, cloudTask);
      
      if (similarity >= threshold) {
        // Calculate confidence based on similarity and other factors
        let confidence = similarity;
        
        // Boost confidence if due dates match
        if (localTask.dueDate && cloudTask.dueDate && localTask.dueDate === cloudTask.dueDate) {
          confidence += 0.1;
        }
        
        // Reduce confidence if completion status differs significantly
        if (localTask.completed !== cloudTask.completed) {
          confidence -= 0.2;
        }
        
        // Reduce confidence if creation times are very different
        const timeDiff = Math.abs(localTask.createdAt - cloudTask.createdAt);
        if (timeDiff > 24 * 60 * 60 * 1000) { // More than 24 hours
          confidence -= 0.1;
        }
        
        confidence = Math.max(0, Math.min(1, confidence));
        
        if (confidence >= threshold) {
          conflicts.push({
            localTask,
            cloudTask,
            type: 'duplicate',
            confidence,
            similarity
          });
        }
      }
    });
  });
  
  return conflicts;
}

/**
 * Detect duplicate tasks between local and cloud data
 */
export function detectDuplicates(localTasks: Task[], cloudTasks: Task[]): TaskConflict[] {
  const conflicts: TaskConflict[] = [];
  const cloudTaskMap = new Map<string, Task>();
  
  // Create map of cloud tasks by key
  cloudTasks.forEach(task => {
    const key = generateTaskKey(task);
    cloudTaskMap.set(key, task);
  });
  
  // Check local tasks against cloud tasks
  localTasks.forEach(localTask => {
    const key = generateTaskKey(localTask);
    const cloudTask = cloudTaskMap.get(key);
    
    if (cloudTask) {
      // Found a potential duplicate
      conflicts.push({
        localTask,
        cloudTask,
        type: 'duplicate'
      });
    }
  });
  
  return conflicts;
}

/**
 * Detect modified tasks (same ID but different content)
 */
export function detectModifiedTasks(localTasks: Task[], cloudTasks: Task[]): TaskConflict[] {
  const conflicts: TaskConflict[] = [];
  const cloudTaskMap = new Map<string, Task>();
  
  // Create map of cloud tasks by ID
  cloudTasks.forEach(task => {
    cloudTaskMap.set(task.id, task);
  });
  
  // Check for modified tasks
  localTasks.forEach(localTask => {
    const cloudTask = cloudTaskMap.get(localTask.id);
    
    if (cloudTask && localTask.id.startsWith('cloud_')) {
      // This is a cloud task that might have been modified locally
      const hasChanges = 
        localTask.title !== cloudTask.title ||
        localTask.notes !== cloudTask.notes ||
        localTask.completed !== cloudTask.completed ||
        localTask.dueDate !== cloudTask.dueDate;
      
      if (hasChanges) {
        conflicts.push({
          localTask,
          cloudTask,
          type: 'modified'
        });
      }
    }
  });
  
  return conflicts;
}

/**
 * Merge local tasks with cloud tasks
 */
export async function mergeLocalWithCloud(
  localTasks: Task[], 
  cloudTasks: Task[], 
  options: SyncOptions
): Promise<SyncResult> {
  const { userId, forceUpload = false, resolveConflicts = true, onProgress } = options;
  
  try {
    // Detect conflicts with enhanced duplicate detection
    const duplicates = detectDuplicatesWithConfidence(localTasks, cloudTasks, 0.8);
    const modified = detectModifiedTasks(localTasks, cloudTasks);
    const allConflicts = [...duplicates, ...modified];
    
    // Filter out tasks that would create conflicts
    const tasksToUpload = localTasks.filter(localTask => {
      const key = generateTaskKey(localTask);
      const hasConflict = allConflicts.some(conflict => 
        generateTaskKey(conflict.localTask) === key || 
        conflict.localTask.id === localTask.id
      );
      return !hasConflict;
    });
    
    if (tasksToUpload.length === 0 && !forceUpload) {
      return {
        success: true,
        uploadedCount: 0
      };
    }
    
    // Upload tasks to cloud
    const uploadPromises = tasksToUpload.map((localTask, index) => {
      const progress = (index / tasksToUpload.length) * 100;
      onProgress?.(progress);
      
      return addUserTask(userId, {
        title: localTask.title,
        completed: localTask.completed,
        createdAt: localTask.createdAt,
        notes: localTask.notes,
        dueDate: localTask.dueDate
      });
    });
    
    const uploadResults = await Promise.all(uploadPromises);
    const successfulUploads = uploadResults.filter(id => id !== null).length;
    
    // Clear local tasks after successful upload
    if (successfulUploads === tasksToUpload.length) {
      await clearLocalTasks();
    }
    
    onProgress?.(100);
    
    return {
      success: successfulUploads === tasksToUpload.length,
      uploadedCount: successfulUploads,
      conflicts: allConflicts.length > 0 ? allConflicts : undefined
    };
    
  } catch (error) {
    console.error('Sync failed:', error);
    return {
      success: false,
      uploadedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown sync error'
    };
  }
}

/**
 * Sync local tasks with cloud (main sync function)
 */
export async function syncTasks(options: SyncOptions): Promise<SyncResult> {
  const { userId } = options;
  
  try {
    // Get current local and cloud tasks
    const localTasks = getLocalTasks();
    const cloudTasks = await loadUserTasks(userId);
    
    // Perform merge
    return await mergeLocalWithCloud(localTasks, cloudTasks, options);
    
  } catch (error) {
    console.error('Sync failed:', error);
    return {
      success: false,
      uploadedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown sync error'
    };
  }
}

/**
 * Resolve conflicts by keeping the most recent version
 */
export function resolveConflicts(conflicts: TaskConflict[]): TaskConflict[] {
  return conflicts.map(conflict => {
    const localTime = conflict.localTask.createdAt;
    const cloudTime = conflict.cloudTask.createdAt;
    
    // Keep the most recent version
    if (localTime > cloudTime) {
      conflict.resolution = 'keep_local';
    } else {
      conflict.resolution = 'keep_cloud';
    }
    
    return conflict;
  });
}

/**
 * Advanced conflict resolution with multiple strategies
 */
export function resolveConflictsAdvanced(conflicts: TaskConflict[], strategy: 'timestamp' | 'completion' | 'content' | 'hybrid' = 'hybrid'): TaskConflict[] {
  return conflicts.map(conflict => {
    switch (strategy) {
      case 'timestamp':
        // Simple timestamp-based resolution
        conflict.resolution = conflict.localTask.createdAt > conflict.cloudTask.createdAt ? 'keep_local' : 'keep_cloud';
        break;
        
      case 'completion':
        // Prefer completed tasks (assumes completion is more important)
        if (conflict.localTask.completed && !conflict.cloudTask.completed) {
          conflict.resolution = 'keep_local';
        } else if (!conflict.localTask.completed && conflict.cloudTask.completed) {
          conflict.resolution = 'keep_cloud';
        } else {
          // If completion status is the same, use timestamp
          conflict.resolution = conflict.localTask.createdAt > conflict.cloudTask.createdAt ? 'keep_local' : 'keep_cloud';
        }
        break;
        
      case 'content':
        // Prefer tasks with more content (longer titles/notes)
        const contentLocalLength = (conflict.localTask.title + (conflict.localTask.notes || '')).length;
        const contentCloudLength = (conflict.cloudTask.title + (conflict.cloudTask.notes || '')).length;
        conflict.resolution = contentLocalLength >= contentCloudLength ? 'keep_local' : 'keep_cloud';
        break;
        
      case 'hybrid':
      default:
        // Hybrid strategy: consider multiple factors
        let localScore = 0;
        let cloudScore = 0;
        
        // Timestamp factor (more recent = higher score)
        const maxTime = Math.max(conflict.localTask.createdAt, conflict.cloudTask.createdAt);
        localScore += (conflict.localTask.createdAt / maxTime) * 0.4;
        cloudScore += (conflict.cloudTask.createdAt / maxTime) * 0.4;
        
        // Completion factor (completed tasks get bonus)
        if (conflict.localTask.completed) localScore += 0.3;
        if (conflict.cloudTask.completed) cloudScore += 0.3;
        
        // Content factor (more content = higher score)
        const hybridLocalContent = (conflict.localTask.title + (conflict.localTask.notes || '')).length;
        const hybridCloudContent = (conflict.cloudTask.title + (conflict.cloudTask.notes || '')).length;
        const maxContent = Math.max(hybridLocalContent, hybridCloudContent);
        if (maxContent > 0) {
          localScore += (hybridLocalContent / maxContent) * 0.3;
          cloudScore += (hybridCloudContent / maxContent) * 0.3;
        }
        
        conflict.resolution = localScore >= cloudScore ? 'keep_local' : 'keep_cloud';
        break;
    }
    
    return conflict;
  });
}

/**
 * Smart merge strategy that combines the best of both tasks
 */
export function smartMergeTasks(localTask: Task, cloudTask: Task): Task {
  // Start with the cloud task's ID (to maintain cloud identity)
  const merged: Task = {
    id: cloudTask.id,
    title: '',
    completed: false,
    createdAt: Math.min(localTask.createdAt, cloudTask.createdAt),
    notes: undefined,
    dueDate: undefined
  };
  
  // Choose the better title (longer or more recent)
  const localTitleLength = localTask.title.length;
  const cloudTitleLength = cloudTask.title.length;
  if (localTitleLength > cloudTitleLength) {
    merged.title = localTask.title;
  } else if (cloudTitleLength > localTitleLength) {
    merged.title = cloudTask.title;
  } else {
    // Same length, choose the more recent one
    merged.title = localTask.createdAt > cloudTask.createdAt ? localTask.title : cloudTask.title;
  }
  
  // Prefer completed status (if either is completed, mark as completed)
  merged.completed = localTask.completed || cloudTask.completed;
  
  // Merge notes (prefer longer notes, or combine if both have content)
  if (localTask.notes && cloudTask.notes) {
    if (localTask.notes.length > cloudTask.notes.length) {
      merged.notes = localTask.notes;
    } else if (cloudTask.notes.length > localTask.notes.length) {
      merged.notes = cloudTask.notes;
    } else {
      // Combine notes if they're different
      if (localTask.notes !== cloudTask.notes) {
        merged.notes = `${localTask.notes}\n\n${cloudTask.notes}`;
      } else {
        merged.notes = localTask.notes;
      }
    }
  } else {
    merged.notes = localTask.notes || cloudTask.notes;
  }
  
  // Prefer the more specific due date
  if (localTask.dueDate && cloudTask.dueDate) {
    // If both have due dates, prefer the earlier one (more urgent)
    const localDate = new Date(localTask.dueDate);
    const cloudDate = new Date(cloudTask.dueDate);
    merged.dueDate = localDate <= cloudDate ? localTask.dueDate : cloudTask.dueDate;
  } else {
    merged.dueDate = localTask.dueDate || cloudTask.dueDate;
  }
  
  return merged;
}

/**
 * Process duplicate conflicts with user-friendly resolution
 */
export function processDuplicateConflicts(conflicts: TaskConflict[]): {
  resolvedConflicts: TaskConflict[];
  unresolvedConflicts: TaskConflict[];
  autoResolvedCount: number;
} {
  const resolvedConflicts: TaskConflict[] = [];
  const unresolvedConflicts: TaskConflict[] = [];
  let autoResolvedCount = 0;
  
  conflicts.forEach(conflict => {
    if (conflict.type === 'duplicate') {
      // Auto-resolve high-confidence duplicates
      if (conflict.confidence && conflict.confidence >= 0.95) {
        // Very high confidence - auto-resolve
        conflict.resolution = 'keep_local'; // Default to keeping local
        resolvedConflicts.push(conflict);
        autoResolvedCount++;
      } else if (conflict.confidence && conflict.confidence >= 0.8) {
        // High confidence - use smart resolution
        const localTime = conflict.localTask.createdAt;
        const cloudTime = conflict.cloudTask.createdAt;
        conflict.resolution = localTime > cloudTime ? 'keep_local' : 'keep_cloud';
        resolvedConflicts.push(conflict);
        autoResolvedCount++;
      } else {
        // Lower confidence - require user intervention
        unresolvedConflicts.push(conflict);
      }
    } else {
      // Non-duplicate conflicts go to unresolved
      unresolvedConflicts.push(conflict);
    }
  });
  
  return {
    resolvedConflicts,
    unresolvedConflicts,
    autoResolvedCount
  };
}

/**
 * Generate user-friendly conflict descriptions
 */
export function generateConflictDescription(conflict: TaskConflict): string {
  const similarity = conflict.similarity || 0;
  const confidence = conflict.confidence || 0;
  
  if (conflict.type === 'duplicate') {
    if (confidence >= 0.95) {
      return `Exact duplicate detected (${Math.round(confidence * 100)}% match)`;
    } else if (confidence >= 0.8) {
      return `Likely duplicate detected (${Math.round(confidence * 100)}% match)`;
    } else {
      return `Possible duplicate detected (${Math.round(confidence * 100)}% match)`;
    }
  } else if (conflict.type === 'modified') {
    return 'Task was modified in both locations';
  } else {
    return 'Conflict detected';
  }
}

/**
 * Merge two tasks by combining their properties
 */
export function mergeTaskData(localTask: Task, cloudTask: Task): Task {
  // Prefer local task's properties, but keep cloud task's ID
  return {
    id: cloudTask.id,
    title: localTask.title,
    completed: localTask.completed,
    createdAt: Math.min(localTask.createdAt, cloudTask.createdAt), // Keep earliest creation time
    notes: localTask.notes || cloudTask.notes,
    dueDate: localTask.dueDate || cloudTask.dueDate
  };
}

/**
 * Validate sync result and provide user-friendly messages
 */
export function validateSyncResult(result: SyncResult): {
  isValid: boolean;
  message: string;
  shouldRetry: boolean;
} {
  if (result.success) {
    if (result.uploadedCount === 0) {
      return {
        isValid: true,
        message: 'No new tasks to sync',
        shouldRetry: false
      };
    } else {
      return {
        isValid: true,
        message: `Successfully synced ${result.uploadedCount} task${result.uploadedCount > 1 ? 's' : ''}`,
        shouldRetry: false
      };
    }
  } else {
    const shouldRetry = !result.error?.includes('network') && !result.error?.includes('quota');
    return {
      isValid: false,
      message: result.error || 'Sync failed',
      shouldRetry
    };
  }
}

/**
 * Get sync statistics
 */
export function getSyncStats(localTasks: Task[], cloudTasks: Task[]): {
  localCount: number;
  cloudCount: number;
  duplicateCount: number;
  modifiedCount: number;
  totalConflicts: number;
} {
  const duplicates = detectDuplicates(localTasks, cloudTasks);
  const modified = detectModifiedTasks(localTasks, cloudTasks);
  
  return {
    localCount: localTasks.length,
    cloudCount: cloudTasks.length,
    duplicateCount: duplicates.length,
    modifiedCount: modified.length,
    totalConflicts: duplicates.length + modified.length
  };
} 