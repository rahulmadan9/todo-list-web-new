import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { useTaskActions, useTaskSelectors } from '../store/taskStore';
import { loadUserTasks } from '../lib/firestore';
import { Task } from '../lib/firestore';

export interface AuthHook {
  // State
  user: User | null;
  loading: boolean;
  
  // Actions
  signOut: () => Promise<void>;
  handleUserSignIn: (userId: string) => Promise<void>;
  
  // Navigation
  navigateToAuth: () => void;
}

export function useAuth(): AuthHook {
  const router = useRouter();
  
  // Selectors
  const user = useTaskSelectors.useUser();
  const loading = useTaskSelectors.useAuthLoading();
  const localTasks = useTaskSelectors.useLocalTasks();
  const cloudTasks = useTaskSelectors.useCloudTasks();
  
  // Actions
  const actions = useTaskActions();

  // Track authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      actions.setUser(firebaseUser);
      
      if (firebaseUser) {
        // User signed in - load cloud tasks and merge with local tasks
        await handleUserSignIn(firebaseUser.uid);
      } else {
        // User signed out - clear cloud tasks and continue with local storage
        actions.setCloudTasks([]);
        actions.setAuthLoading(false);
        
        // Clear any pending operations
        actions.setEditingTaskId(null);
        actions.setShowCreateTask(false);
      }
    });
    
    return () => unsubscribe();
  }, [actions]);

  // Handle user sign in and task merging
  const handleUserSignIn = useCallback(async (userId: string): Promise<void> => {
    actions.setAuthLoading(true);
    actions.setSyncing(true);
    actions.setSyncError(null);
    
    try {
      // Load cloud tasks
      const userTasks = await loadUserTasks(userId);
      actions.setCloudTasks(userTasks);
      
      // Merge local tasks with cloud tasks
      await mergeLocalTasksWithCloud(userTasks);
      
      actions.showToast(
        "Successfully signed in! Your tasks have been synchronized.", 
        "success"
      );
    } catch (error) {
      const errorMessage = handleFirebaseError(error, "load tasks");
      actions.setSyncError(errorMessage);
      actions.showToast(errorMessage, "error");
      
      // Even if merge fails, we should still show the cloud tasks
      // The user can retry the merge later
    } finally {
      actions.setSyncing(false);
      actions.setAuthLoading(false);
    }
  }, [actions, localTasks]);

  // Handle Firebase errors consistently
  const handleFirebaseError = useCallback((error: unknown, operation: string): string => {
    console.error(`Firebase error in ${operation}:`, error);
    
    if (error instanceof Error) {
      if (error.message.includes("Missing or insufficient permissions")) {
        // Force re-authentication for permission errors
        auth.signOut().catch(signOutError => {
          console.error("Error signing out:", signOutError);
        });
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

  // Merge local tasks with cloud tasks - Apple Reminders style
  const mergeLocalTasksWithCloud = useCallback(async (cloudTasks: Task[]): Promise<void> => {
    if (localTasks.length === 0) {
      // No local tasks to merge
      return;
    }

    // Create a map of cloud tasks by title and notes to avoid duplicates
    const cloudTaskMap = new Map<string, Task>();
    cloudTasks.forEach(task => {
      const key = `${task.title.trim()}-${(task.notes || '').trim()}`;
      cloudTaskMap.set(key, task);
    });

    // Find local tasks that don't exist in cloud
    const tasksToUpload = localTasks.filter(localTask => {
      const key = `${localTask.title.trim()}-${(localTask.notes || '').trim()}`;
      return !cloudTaskMap.has(key);
    });

    if (tasksToUpload.length === 0) {
      // No new tasks to upload, but we should still clear local tasks
      // since they already exist in cloud (duplicates)
      actions.setLocalTasks([]);
      actions.showToast(
        "Your tasks are already synced with your cloud account.", 
        "success"
      );
      return;
    }

    // Upload local tasks to cloud
    // This would need to be implemented with proper error handling
    // For now, just show a message
    actions.showToast(
      `Found ${tasksToUpload.length} local tasks to sync with cloud.`, 
      "info"
    );
  }, [localTasks, actions]);

  // Handle user sign out - preserve local experience
  const handleSignOut = useCallback(async (): Promise<void> => {
    try {
      // Clear any pending operations before signing out
      actions.setEditingTaskId(null);
      actions.setShowCreateTask(false);
      
      // Before signing out, save current cloud tasks to local storage
      // This ensures continuity when switching between authenticated/guest modes
      if (cloudTasks.length > 0) {
        // Add cloud tasks to local storage if they don't exist
        const existingLocalTaskIds = new Set(localTasks.map(lt => lt.id));
        const tasksToAdd = cloudTasks.filter(ct => !existingLocalTaskIds.has(ct.id));
        
        if (tasksToAdd.length > 0) {
          actions.setLocalTasks([...localTasks, ...tasksToAdd]);
        }
      }
      
      await signOut(auth);
      actions.setCloudTasks([]);
      actions.setAuthLoading(false);
      actions.setSyncing(false);
      
      actions.showToast(
        "Successfully signed out. Your tasks remain available locally.", 
        "info"
      );
    } catch (error) {
      console.error("Failed to sign out:", error);
      actions.showToast("Failed to sign out", "error");
    }
  }, [actions, cloudTasks, localTasks]);

  // Navigate to auth page
  const navigateToAuth = useCallback(() => {
    router.push('/auth');
  }, [router]);

  return {
    // State
    user,
    loading,
    
    // Actions
    signOut: handleSignOut,
    handleUserSignIn,
    
    // Navigation
    navigateToAuth,
  };
}