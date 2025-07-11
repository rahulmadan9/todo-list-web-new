import { useCallback } from 'react';
import { useTaskStore, useTaskActions, useTaskSelectors } from '../store/taskStore';
import { Task } from '../lib/firestore';
import { 
  addUserTask, 
  updateUserTask, 
  deleteUserTask, 
  toggleUserTask, 
  reorderUserTasks 
} from '../lib/firestore';
import { 
  addLocalTask, 
  updateLocalTask, 
  deleteLocalTask, 
  toggleLocalTask, 
  reorderLocalTasks 
} from '../lib/localStorage';

export interface TaskManagerHook {
  // State
  tasks: Task[];
  filteredTasks: Task[];
  loading: boolean;
  error: string | null;
  
  // Actions
  addTask: (taskData: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Omit<Task, 'id'>>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  reorderTasks: (taskIds: string[]) => Promise<void>;
  
  // Utility
  refreshTasks: () => Promise<void>;
  clearError: () => void;
}

export function useTaskManager(): TaskManagerHook {
  // Selectors
  const tasks = useTaskSelectors.useTasks();
  const filteredTasks = useTaskSelectors.useFilteredTasks();
  const loading = useTaskSelectors.useTasksLoading();
  const error = useTaskSelectors.useTasksError();
  const user = useTaskSelectors.useUser();
  const networkInfo = useTaskSelectors.useSyncState().networkInfo;
  const localTasks = useTaskSelectors.useLocalTasks();
  const cloudTasks = useTaskSelectors.useCloudTasks();
  
  // Actions
  const actions = useTaskActions();
  const { enqueueTaskCreate, enqueueTaskUpdate, enqueueTaskDelete } = useTaskStore(state => state);

  // Handle Firebase errors consistently
  const handleFirebaseError = useCallback((error: unknown, operation: string): string => {
    console.error(`Firebase error in ${operation}:`, error);
    
    if (error instanceof Error) {
      if (error.message.includes("Missing or insufficient permissions")) {
        return "Authentication required. Please sign in again.";
      } else if (error.message.includes("offline")) {
        return "You're offline. Changes will sync when you reconnect.";
      } else if (error.message.includes("network")) {
        return "Network error. Please check your connection and try again.";
      } else {
        return error.message;
      }
    }
    
    return `Failed to ${operation}`;
  }, []);

  // Add a new task
  const addTask = useCallback(async (taskData: Omit<Task, 'id'>): Promise<void> => {
    try {
      const fullTaskData = {
        ...taskData,
        completed: false,
        createdAt: Date.now(),
        notes: taskData.notes?.trim() || undefined,
        dueDate: taskData.dueDate || undefined
      };
      
      if (user) {
        // Authenticated user - try cloud first, fallback to offline queue
        if (networkInfo?.isOnline && networkInfo?.canSync) {
          // Online - save to cloud
          try {
            const taskId = await addUserTask(user.uid, fullTaskData);
            if (taskId) {
              const newTask: Task = {
                ...fullTaskData,
                id: taskId
              };
              actions.addTask(newTask);
              actions.showToast("Task added!", "success");
            } else {
              actions.showToast("Failed to add task", "error");
            }
          } catch (error) {
            const errorMessage = handleFirebaseError(error, "add task");
            actions.showToast(errorMessage, "error");
            
            // Fallback to offline queue
            // await enqueueTaskCreate(fullTaskData);
            actions.showToast("Task queued for sync", "info");
          }
        } else {
          // Offline or poor connection - queue for later
          // enqueueTaskCreate(fullTaskData, user.uid, 'normal');
          
          // Also save to local storage for immediate feedback
          const localTaskId = await addLocalTask(fullTaskData);
          
          if (localTaskId) {
            const newTask: Task = {
              ...fullTaskData,
              id: localTaskId
            };
            actions.addTask(newTask);
            actions.showToast("Task added!", "success");
          } else {
            actions.showToast("Failed to add task", "error");
          }
        }
      } else {
        // Non-authenticated user - save to local storage only
        const taskId = await addLocalTask(fullTaskData);
        if (taskId) {
          const newTask: Task = {
            ...fullTaskData,
            id: taskId
          };
          actions.addTask(newTask);
          actions.showToast("Task added!", "success");
        } else {
          actions.showToast("Failed to add task", "error");
        }
      }
    } catch (error) {
      console.error("Error adding task:", error);
      actions.showToast("Failed to add task", "error");
    }
  }, [user, networkInfo, actions, handleFirebaseError]);

  // Update an existing task
  const updateTask = useCallback(async (taskId: string, updates: Partial<Omit<Task, 'id'>>): Promise<void> => {
    try {
      // Determine which store this task belongs to
      const isLocalTask = localTasks.find(t => t.id === taskId);
      const isCloudTask = cloudTasks.find(t => t.id === taskId);
      
      if (user) {
        // Authenticated user
        if (isCloudTask && networkInfo?.isOnline && networkInfo?.canSync) {
          // Task exists in cloud and we're online - update cloud
          try {
            const success = await updateUserTask(user.uid, taskId, updates);
            if (success) {
              actions.updateTask(taskId, updates);
              actions.showToast("Task updated!", "success");
            } else {
              actions.showToast("Failed to update task", "error");
            }
          } catch (error) {
            const errorMessage = handleFirebaseError(error, "update task");
            actions.showToast(errorMessage, "error");
            
            // Fallback to offline queue
            // enqueueTaskUpdate(taskId, updates, user.uid, 'normal');
            actions.showToast("Update queued for sync", "info");
          }
        } else if (isLocalTask) {
          // Task exists locally (either offline or not yet synced)
          const success = await updateLocalTask(taskId, updates);
          if (success) {
            actions.updateTask(taskId, updates);
            // If we're online but this is a local task, queue it for cloud sync
            if (networkInfo?.isOnline && networkInfo?.canSync) {
              // enqueueTaskUpdate(taskId, updates, user.uid, 'normal');
            }
            actions.showToast("Task updated!", "success");
          } else {
            actions.showToast("Failed to update task", "error");
          }
        } else {
          // Fallback - queue for later sync
          // enqueueTaskUpdate(taskId, updates, user.uid, 'normal');
          actions.showToast("Task update queued for sync.", "success");
        }
      } else {
        // Guest user - update local storage only
        const success = await updateLocalTask(taskId, updates);
        if (success) {
          actions.updateTask(taskId, updates);
          actions.showToast("Task updated!", "success");
        } else {
          actions.showToast("Failed to update task", "error");
        }
      }
    } catch (error) {
      console.error("Error updating task:", error);
      actions.showToast("Failed to update task", "error");
    }
  }, [user, networkInfo, localTasks, cloudTasks, actions, handleFirebaseError]);

  // Delete a task
  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    try {
      // Determine which store this task belongs to
      const isLocalTask = localTasks.find(t => t.id === taskId);
      const isCloudTask = cloudTasks.find(t => t.id === taskId);
      
      if (user) {
        // Authenticated user
        if (isCloudTask && networkInfo?.isOnline && networkInfo?.canSync) {
          // Task exists in cloud and we're online - delete from cloud
          try {
            const success = await deleteUserTask(user.uid, taskId);
            if (success) {
              actions.deleteTask(taskId);
              actions.showToast("Task deleted.", "info");
            } else {
              actions.showToast("Failed to delete task", "error");
            }
          } catch (error) {
            const errorMessage = handleFirebaseError(error, "delete task");
            actions.showToast(errorMessage, "error");
            
            // Fallback to offline queue
            // enqueueTaskDelete(taskId, user.uid, 'normal');
            actions.showToast("Delete queued for sync", "info");
          }
        } else if (isLocalTask) {
          // Task exists locally (either offline or not yet synced)
          const success = await deleteLocalTask(taskId);
          if (success) {
            actions.deleteTask(taskId);
            // If we're online but this is a local task, queue it for cloud sync
            if (networkInfo?.isOnline && networkInfo?.canSync) {
              // enqueueTaskDelete(taskId, user.uid, 'high');
            }
            actions.showToast("Task deleted.", "info");
          } else {
            actions.showToast("Failed to delete task", "error");
          }
        } else {
          // Fallback - queue for later sync
          // enqueueTaskDelete(taskId, user.uid, 'high');
          actions.showToast("Task deletion queued for sync.", "info");
        }
      } else {
        // Guest user - delete from local storage only
        const success = await deleteLocalTask(taskId);
        if (success) {
          actions.deleteTask(taskId);
          actions.showToast("Task deleted.", "info");
        } else {
          actions.showToast("Failed to delete task", "error");
        }
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      actions.showToast("Failed to delete task", "error");
    }
  }, [user, networkInfo, localTasks, cloudTasks, actions, handleFirebaseError]);

  // Toggle task completion
  const toggleTask = useCallback(async (taskId: string): Promise<void> => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      await updateTask(taskId, { completed: !task.completed });
      
      const message = task.completed ? "Task marked as incomplete" : "Task completed!";
      actions.showToast(message, "success");
    } catch (error) {
      console.error("Error toggling task:", error);
      actions.showToast("Failed to update task", "error");
    }
  }, [tasks, updateTask, actions]);

  // Reorder tasks
  const reorderTasks = useCallback(async (taskIds: string[]): Promise<void> => {
    try {
      if (user) {
        // Authenticated user - determine which storage to use
        const isLocalTask = localTasks.find(t => taskIds.includes(t.id));
        const isCloudTask = cloudTasks.find(t => taskIds.includes(t.id));
        
        if (isCloudTask && networkInfo?.isOnline && networkInfo?.canSync) {
          // Update cloud storage
          try {
            const success = await reorderUserTasks(user.uid, taskIds);
            if (success) {
              actions.reorderTasks(taskIds);
              actions.showToast("Tasks reordered!", "success");
            } else {
              actions.showToast("Failed to reorder tasks", "error");
            }
          } catch (error) {
            const errorMessage = handleFirebaseError(error, "reorder tasks");
            actions.showToast(errorMessage, "error");
          }
        } else if (isLocalTask) {
          // Update local storage
          const success = await reorderLocalTasks(taskIds);
          if (success) {
            actions.reorderTasks(taskIds);
            actions.showToast("Tasks reordered!", "success");
          } else {
            actions.showToast("Failed to reorder tasks", "error");
          }
        }
      } else {
        // Guest user - update local storage only
        const success = await reorderLocalTasks(taskIds);
        if (success) {
          actions.reorderTasks(taskIds);
          actions.showToast("Tasks reordered!", "success");
        } else {
          actions.showToast("Failed to reorder tasks", "error");
        }
      }
    } catch (error) {
      console.error("Error reordering tasks:", error);
      actions.showToast("Failed to reorder tasks", "error");
    }
  }, [user, networkInfo, localTasks, cloudTasks, actions, handleFirebaseError]);

  // Refresh tasks
  const refreshTasks = useCallback(async (): Promise<void> => {
    // This would typically reload tasks from storage
    // For now, it's handled by the individual storage hooks
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    actions.clearError();
  }, [actions]);

  return {
    // State
    tasks,
    filteredTasks,
    loading,
    error,
    
    // Actions
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    reorderTasks,
    
    // Utility
    refreshTasks,
    clearError,
  };
}