import { Task } from './firestore';

const TASKS_STORAGE_KEY = 'todo-tasks';
const LOCAL_USER_ID = 'local-user';

// In-memory fallback storage
let memoryFallback: Task[] = [];
let usingMemoryFallback = false;

// Check if localStorage is available
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// Validate a single task object
function validateTask(task: any): task is Task {
  return (
    task &&
    typeof task === 'object' &&
    typeof task.id === 'string' &&
    task.id.length > 0 &&
    typeof task.title === 'string' &&
    task.title.trim().length > 0 &&
    task.title.length <= 500 &&
    typeof task.completed === 'boolean' &&
    typeof task.createdAt === 'number' &&
    task.createdAt > 0 &&
    (task.notes === undefined || 
     (typeof task.notes === 'string' && task.notes.length <= 2000)) &&
    (task.dueDate === undefined || 
     (typeof task.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate))) &&
    (task.order === undefined || 
     (typeof task.order === 'number' && task.order >= 0))
  );
}

// Validate and clean an array of tasks
function validateAndCleanTasks(tasks: any[]): Task[] {
  if (!Array.isArray(tasks)) {
    console.warn('Invalid tasks data: not an array');
    return [];
  }

  const validTasks: Task[] = [];
  const invalidTasks: any[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    
    if (validateTask(task)) {
      // Clean the task data and assign order if missing
      const cleanTask: Task = {
        id: task.id.trim(),
        title: task.title.trim(),
        completed: task.completed,
        createdAt: task.createdAt,
        notes: task.notes?.trim() || undefined,
        dueDate: task.dueDate || undefined,
        order: task.order !== undefined ? task.order : task.createdAt || Date.now()
      };
      validTasks.push(cleanTask);
    } else {
      invalidTasks.push(task);
      console.warn(`Invalid task at index ${i}:`, task);
    }
  }

  if (invalidTasks.length > 0) {
    console.warn(`Found ${invalidTasks.length} invalid tasks, removed them`);
  }

  return validTasks;
}

// Get all tasks from localStorage
export function getLocalTasks(): Task[] {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available, using memory fallback');
    usingMemoryFallback = true;
    return memoryFallback;
  }

  try {
    const stored = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!stored) return [];
    
    const tasks = JSON.parse(stored);
    
    // Validate and clean the tasks
    const validTasks = validateAndCleanTasks(tasks);
    
    // Update memory fallback
    memoryFallback = validTasks;
    usingMemoryFallback = false;
    
    return validTasks;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    console.warn('Falling back to memory storage');
    usingMemoryFallback = true;
    return memoryFallback;
  }
}

// Save all tasks to localStorage
export function saveLocalTasks(tasks: Task[]): boolean {
  // Always update memory fallback
  memoryFallback = validateAndCleanTasks(tasks);
  
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available, using memory fallback');
    usingMemoryFallback = true;
    return true; // Successfully saved to memory
  }

  try {
    // Validate and clean tasks before saving
    const validTasks = validateAndCleanTasks(tasks);
    
    const tasksJson = JSON.stringify(validTasks);
    
    // Check if data would exceed quota
    const currentUsage = getLocalStorageUsage();
    if (currentUsage && tasksJson.length > currentUsage.available * 0.8) { // 80% threshold
      throw new Error('localStorage quota would be exceeded');
    }
    
    localStorage.setItem(TASKS_STORAGE_KEY, tasksJson);
    usingMemoryFallback = false;
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    
    // If quota exceeded, try to clean up old tasks
    if (error instanceof Error && error.message.includes('quota')) {
      const success = handleQuotaExceeded(tasks);
      if (success) {
        usingMemoryFallback = false;
        return true;
      }
    }
    
    // Fall back to memory storage
    console.warn('Falling back to memory storage');
    usingMemoryFallback = true;
    return true; // Successfully saved to memory
  }
}

// Add a new task to localStorage
export function addLocalTask(taskData: Omit<Task, 'id'>): string | null {
  try {
    const tasks = getLocalTasks();
    
    // Assign order value if not provided - add to the end of existing tasks
    let orderValue = taskData.order;
    if (orderValue === undefined || orderValue === null) {
      const maxOrder = tasks.reduce((max, task) => 
        Math.max(max, task.order || 0), 0);
      orderValue = maxOrder + 1000;
    }
    
    const newTask: Task = {
      ...taskData,
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      order: orderValue
    };
    
    // Check quota before adding
    const usage = getLocalStorageUsage();
    if (usage && usage.used > usage.available * 0.9) { // 90% threshold
      console.warn('localStorage usage is high (>90%)');
    }
    
    // Add task and maintain order-based sorting
    tasks.push(newTask);
    tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
    const success = saveLocalTasks(tasks);
    
    return success ? newTask.id : null;
  } catch (error) {
    console.error('Error adding local task:', error);
    return null;
  }
}

// Update an existing task in localStorage
export function updateLocalTask(taskId: string, updates: Partial<Omit<Task, 'id'>>): boolean {
  try {
    const tasks = getLocalTasks();
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      console.warn('Task not found in localStorage:', taskId);
      return false;
    }
    
    tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
    return saveLocalTasks(tasks);
  } catch (error) {
    console.error('Error updating local task:', error);
    return false;
  }
}

// Delete a task from localStorage
export function deleteLocalTask(taskId: string): boolean {
  try {
    const tasks = getLocalTasks();
    const filteredTasks = tasks.filter(task => task.id !== taskId);
    
    if (filteredTasks.length === tasks.length) {
      console.warn('Task not found in localStorage:', taskId);
      return false;
    }
    
    return saveLocalTasks(filteredTasks);
  } catch (error) {
    console.error('Error deleting local task:', error);
    return false;
  }
}

// Toggle task completion in localStorage
export function toggleLocalTask(taskId: string, completed: boolean): boolean {
  return updateLocalTask(taskId, { completed });
}

// Get local user ID (for non-authenticated users)
export function getLocalUserId(): string {
  return LOCAL_USER_ID;
}

// Check if a task ID is from local storage
export function isLocalTaskId(taskId: string): boolean {
  return taskId.startsWith('local_');
}

// Check if currently using memory fallback
export function isUsingMemoryFallback(): boolean {
  return usingMemoryFallback;
}

// Get storage status information
export function getStorageStatus(): { 
  available: boolean; 
  usingFallback: boolean; 
  usage: { used: number; available: number } | null 
} {
  const available = isLocalStorageAvailable();
  const usingFallback = isUsingMemoryFallback();
  const usage = available ? getLocalStorageUsage() : null;
  
  return {
    available,
    usingFallback,
    usage
  };
}

// Clear all local tasks
export function clearLocalTasks(): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }
  
  try {
    localStorage.removeItem(TASKS_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing local tasks:', error);
    return false;
  }
}

// Handle localStorage quota exceeded by removing old tasks
function handleQuotaExceeded(tasks: Task[]): boolean {
  try {
    // Sort tasks by creation date (oldest first) and remove oldest 20%
    const sortedTasks = [...tasks].sort((a, b) => a.createdAt - b.createdAt);
    const tasksToKeep = sortedTasks.slice(Math.floor(sortedTasks.length * 0.2));
    
    console.warn('localStorage quota exceeded, removing oldest 20% of tasks');
    
    // Try to save with reduced task list
    const tasksJson = JSON.stringify(tasksToKeep);
    localStorage.setItem(TASKS_STORAGE_KEY, tasksJson);
    
    return true;
  } catch (error) {
    console.error('Failed to handle quota exceeded:', error);
    return false;
  }
}

// Get localStorage usage info
export function getLocalStorageUsage(): { used: number; available: number } | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }
  
  try {
    const stored = localStorage.getItem(TASKS_STORAGE_KEY);
    const used = stored ? new Blob([stored]).size : 0;
    // Estimate available space (most browsers have 5-10MB limit)
    const available = 5 * 1024 * 1024; // 5MB estimate
    
    return { used, available };
  } catch {
    return null;
  }
}

// Reorder tasks by updating their order values
export function reorderLocalTasks(taskIds: string[]): boolean {
  try {
    const tasks = getLocalTasks();
    
    // Update order values for the specified tasks
    const updatedTasks = tasks.map(task => {
      const newIndex = taskIds.indexOf(task.id);
      if (newIndex !== -1) {
        return { ...task, order: (newIndex + 1) * 1000 };
      }
      return task;
    });
    
    // Sort by new order values
    updatedTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    return saveLocalTasks(updatedTasks);
  } catch (error) {
    console.error('Error reordering local tasks:', error);
    return false;
  }
} 