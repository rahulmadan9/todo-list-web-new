import { useState, useEffect, useCallback } from 'react';
import { Task } from '../lib/firestore';
import { 
  getLocalTasks, 
  saveLocalTasks, 
  addLocalTask, 
  updateLocalTask, 
  deleteLocalTask, 
  toggleLocalTask,
  getLocalStorageUsage,
  clearLocalTasks
} from '../lib/localStorage';

interface UseLocalStorageReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  addTask: (taskData: Omit<Task, 'id'>) => Promise<string | null>;
  updateTask: (taskId: string, updates: Partial<Omit<Task, 'id'>>) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  toggleTask: (taskId: string, completed: boolean) => Promise<boolean>;
  refreshTasks: () => void;
  clearTasks: () => Promise<boolean>;
  storageUsage: { used: number; available: number } | null;
}

export function useLocalStorage(): UseLocalStorageReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageUsage, setStorageUsage] = useState<{ used: number; available: number } | null>(null);

  // Load tasks from localStorage on mount
  useEffect(() => {
    try {
      const localTasks = getLocalTasks();
      setTasks(localTasks);
      setError(null);
    } catch (err) {
      setError('Failed to load tasks from local storage');
      console.error('Error loading local tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update storage usage when tasks change
  useEffect(() => {
    const usage = getLocalStorageUsage();
    setStorageUsage(usage);
  }, [tasks]);

  // Add a new task
  const addTask = useCallback(async (taskData: Omit<Task, 'id'>): Promise<string | null> => {
    try {
      setError(null);
      const taskId = addLocalTask(taskData);
      
      if (taskId) {
        // Update local state immediately for optimistic UI
        const newTask: Task = {
          ...taskData,
          id: taskId
        };
        setTasks(prev => [newTask, ...prev]);
        return taskId;
      } else {
        setError('Failed to add task to local storage');
        return null;
      }
    } catch (err) {
      setError('Failed to add task');
      console.error('Error adding task:', err);
      return null;
    }
  }, []);

  // Update an existing task
  const updateTask = useCallback(async (taskId: string, updates: Partial<Omit<Task, 'id'>>): Promise<boolean> => {
    try {
      setError(null);
      const success = updateLocalTask(taskId, updates);
      
      if (success) {
        // Update local state immediately for optimistic UI
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, ...updates } : task
        ));
        return true;
      } else {
        setError('Failed to update task');
        return false;
      }
    } catch (err) {
      setError('Failed to update task');
      console.error('Error updating task:', err);
      return false;
    }
  }, []);

  // Delete a task
  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      setError(null);
      const success = deleteLocalTask(taskId);
      
      if (success) {
        // Update local state immediately for optimistic UI
        setTasks(prev => prev.filter(task => task.id !== taskId));
        return true;
      } else {
        setError('Failed to delete task');
        return false;
      }
    } catch (err) {
      setError('Failed to delete task');
      console.error('Error deleting task:', err);
      return false;
    }
  }, []);

  // Toggle task completion
  const toggleTask = useCallback(async (taskId: string, completed: boolean): Promise<boolean> => {
    return updateTask(taskId, { completed });
  }, [updateTask]);

  // Refresh tasks from localStorage
  const refreshTasks = useCallback(() => {
    try {
      setLoading(true);
      setError(null);
      const localTasks = getLocalTasks();
      setTasks(localTasks);
    } catch (err) {
      setError('Failed to refresh tasks');
      console.error('Error refreshing tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear all tasks from localStorage
  const clearTasks = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const success = clearLocalTasks();
      
      if (success) {
        // Update local state immediately for optimistic UI
        setTasks([]);
        return true;
      } else {
        setError('Failed to clear tasks');
        return false;
      }
    } catch (err) {
      setError('Failed to clear tasks');
      console.error('Error clearing tasks:', err);
      return false;
    }
  }, []);

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    refreshTasks,
    clearTasks,
    storageUsage
  };
} 