import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import { Task } from '../lib/firestore';
import { Filter } from '../components/TaskFilters';
import { NetworkInfo } from '../lib/network';
import { User } from 'firebase/auth';

// Types
interface TaskState {
  // Tasks
  localTasks: Task[];
  cloudTasks: Task[];
  currentTasks: Task[];
  loading: boolean;
  error: string | null;
  
  // UI State
  filter: Filter;
  editingTaskId: string | null;
  showCreateTask: boolean;
  
  // Drag & Drop
  draggedTaskId: string | null;
  dropTargetId: string | null;
  dropPosition: 'above' | 'below' | null;
  isDragActive: boolean;
  
  // Authentication
  user: User | null;
  authLoading: boolean;
  
  // Sync & Network
  isSyncing: boolean;
  syncError: string | null;
  networkInfo: NetworkInfo | null;
  
  // Toast
  toast: {
    open: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  };
}

interface TaskActions {
  // Task Actions
  setLocalTasks: (tasks: Task[]) => void;
  setCloudTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  reorderTasks: (taskIds: string[]) => void;
  
  // UI Actions
  setFilter: (filter: Filter) => void;
  setEditingTaskId: (id: string | null) => void;
  setShowCreateTask: (show: boolean) => void;
  
  // Drag & Drop Actions
  setDraggedTaskId: (id: string | null) => void;
  setDropTarget: (id: string | null, position: 'above' | 'below' | null) => void;
  setIsDragActive: (active: boolean) => void;
  
  // Authentication Actions
  setUser: (user: User | null) => void;
  setAuthLoading: (loading: boolean) => void;
  
  // Sync & Network Actions
  setSyncing: (syncing: boolean) => void;
  setSyncError: (error: string | null) => void;
  setNetworkInfo: (info: NetworkInfo | null) => void;
  
  // Toast Actions
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  hideToast: () => void;
  
  // Computed Actions
  updateCurrentTasks: () => void;
  getFilteredTasks: () => Task[];
  
  // Utility Actions
  clearError: () => void;
  resetDragState: () => void;
}

type TaskStore = TaskState & TaskActions;

// Helper function to normalize tasks by ID
const normalizeTasksById = (tasks: Task[]): Record<string, Task> => {
  return tasks.reduce((acc, task) => {
    acc[task.id] = task;
    return acc;
  }, {} as Record<string, Task>);
};

// Helper function to merge local and cloud tasks
const mergeTasksWithPriority = (localTasks: Task[], cloudTasks: Task[]): Task[] => {
  const localTasksMap = normalizeTasksById(localTasks);
  const cloudTasksMap = normalizeTasksById(cloudTasks);
  
  // Combine all unique tasks
  const allTaskIds = new Set([...Object.keys(localTasksMap), ...Object.keys(cloudTasksMap)]);
  const mergedTasks: Task[] = [];
  
  allTaskIds.forEach(taskId => {
    const localTask = localTasksMap[taskId];
    const cloudTask = cloudTasksMap[taskId];
    
    if (localTask && cloudTask) {
      // Task exists in both - prefer cloud version but merge local changes
      mergedTasks.push(cloudTask);
    } else if (localTask) {
      // Local-only task
      mergedTasks.push(localTask);
    } else if (cloudTask) {
      // Cloud-only task
      mergedTasks.push(cloudTask);
    }
  });
  
  // Sort by order field, then by creation date
  return mergedTasks.sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    } else if (a.order !== undefined) {
      return -1;
    } else if (b.order !== undefined) {
      return 1;
    } else {
      return b.createdAt - a.createdAt;
    }
  });
};

// Create the store
export const useTaskStore = create<TaskStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial State
      localTasks: [],
      cloudTasks: [],
      currentTasks: [],
      loading: false,
      error: null,
      
      filter: 'all',
      editingTaskId: null,
      showCreateTask: false,
      
      draggedTaskId: null,
      dropTargetId: null,
      dropPosition: null,
      isDragActive: false,
      
      user: null,
      authLoading: false,
      
      isSyncing: false,
      syncError: null,
      networkInfo: null,
      
      toast: {
        open: false,
        message: '',
        type: 'info' as const,
      },
      
      // Task Actions
      setLocalTasks: (tasks: Task[]) => {
        set({ localTasks: tasks });
        get().updateCurrentTasks();
      },
      
      setCloudTasks: (tasks: Task[]) => {
        set({ cloudTasks: tasks });
        get().updateCurrentTasks();
      },
      
      addTask: (task: Task) => {
        const { user, localTasks, cloudTasks } = get();
        
        if (user) {
          // Add to cloud tasks
          set({ cloudTasks: [...cloudTasks, task] });
        } else {
          // Add to local tasks
          set({ localTasks: [...localTasks, task] });
        }
        
        get().updateCurrentTasks();
      },
      
      updateTask: (taskId: string, updates: Partial<Task>) => {
        const { user, localTasks, cloudTasks } = get();
        
        if (user) {
          const updatedCloudTasks = cloudTasks.map(task =>
            task.id === taskId ? { ...task, ...updates } : task
          );
          set({ cloudTasks: updatedCloudTasks });
        } else {
          const updatedLocalTasks = localTasks.map(task =>
            task.id === taskId ? { ...task, ...updates } : task
          );
          set({ localTasks: updatedLocalTasks });
        }
        
        get().updateCurrentTasks();
      },
      
      deleteTask: (taskId: string) => {
        const { user, localTasks, cloudTasks } = get();
        
        if (user) {
          const filteredCloudTasks = cloudTasks.filter(task => task.id !== taskId);
          set({ cloudTasks: filteredCloudTasks });
        } else {
          const filteredLocalTasks = localTasks.filter(task => task.id !== taskId);
          set({ localTasks: filteredLocalTasks });
        }
        
        get().updateCurrentTasks();
      },
      
      reorderTasks: (taskIds: string[]) => {
        const { user, localTasks, cloudTasks } = get();
        
        if (user) {
          const reorderedTasks = taskIds.map((id, index) => {
            const task = cloudTasks.find(t => t.id === id);
            return task ? { ...task, order: (index + 1) * 1000 } : null;
          }).filter(Boolean) as Task[];
          
          const nonReorderedTasks = cloudTasks.filter(task => !taskIds.includes(task.id));
          const allTasks = [...reorderedTasks, ...nonReorderedTasks];
          allTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
          
          set({ cloudTasks: allTasks });
        } else {
          const reorderedTasks = taskIds.map((id, index) => {
            const task = localTasks.find(t => t.id === id);
            return task ? { ...task, order: (index + 1) * 1000 } : null;
          }).filter(Boolean) as Task[];
          
          const nonReorderedTasks = localTasks.filter(task => !taskIds.includes(task.id));
          const allTasks = [...reorderedTasks, ...nonReorderedTasks];
          allTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
          
          set({ localTasks: allTasks });
        }
        
        get().updateCurrentTasks();
      },
      
      // UI Actions
      setFilter: (filter: Filter) => set({ filter }),
      setEditingTaskId: (id: string | null) => set({ editingTaskId: id }),
      setShowCreateTask: (show: boolean) => set({ showCreateTask: show }),
      
      // Drag & Drop Actions
      setDraggedTaskId: (id: string | null) => set({ draggedTaskId: id }),
      setDropTarget: (id: string | null, position: 'above' | 'below' | null) => {
        set({ dropTargetId: id, dropPosition: position });
      },
      setIsDragActive: (active: boolean) => set({ isDragActive: active }),
      
      // Authentication Actions
      setUser: (user: User | null) => {
        set({ user });
        get().updateCurrentTasks();
      },
      setAuthLoading: (loading: boolean) => set({ authLoading: loading }),
      
      // Sync & Network Actions
      setSyncing: (syncing: boolean) => set({ isSyncing: syncing }),
      setSyncError: (error: string | null) => set({ syncError: error }),
      setNetworkInfo: (info: NetworkInfo | null) => set({ networkInfo: info }),
      
      // Toast Actions
      showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
        set({ toast: { open: true, message, type } });
      },
      hideToast: () => {
        set({ toast: { ...get().toast, open: false } });
      },
      
      // Computed Actions
      updateCurrentTasks: () => {
        const { user, localTasks, cloudTasks } = get();
        
        if (user) {
          // For authenticated users, merge local and cloud tasks
          const merged = mergeTasksWithPriority(localTasks, cloudTasks);
          set({ currentTasks: merged });
        } else {
          // For guest users, use local tasks only
          set({ currentTasks: localTasks });
        }
      },
      
      getFilteredTasks: (): Task[] => {
        const { currentTasks, filter } = get();
        
        switch (filter) {
          case 'active':
            return currentTasks.filter(task => !task.completed);
          case 'completed':
            return currentTasks.filter(task => task.completed);
          case 'all':
          default:
            return currentTasks;
        }
      },
      
      // Utility Actions
      clearError: () => set({ error: null, syncError: null }),
      resetDragState: () => {
        set({
          draggedTaskId: null,
          dropTargetId: null,
          dropPosition: null,
          isDragActive: false,
        });
      },
    })),
    {
      name: 'task-store',
    }
  )
);

// Selectors for better performance
export const useTaskSelectors = {
  // Task selectors
  useTasks: () => useTaskStore(state => state.currentTasks),
  useFilteredTasks: () => useTaskStore(state => state.getFilteredTasks()),
  useLocalTasks: () => useTaskStore(state => state.localTasks),
  useCloudTasks: () => useTaskStore(state => state.cloudTasks),
  useTasksLoading: () => useTaskStore(state => state.loading),
  useTasksError: () => useTaskStore(state => state.error),
  
  // UI selectors
  useFilter: () => useTaskStore(state => state.filter),
  useEditingTaskId: () => useTaskStore(state => state.editingTaskId),
  useShowCreateTask: () => useTaskStore(state => state.showCreateTask),
  
  // Drag & Drop selectors
  useDragState: () => useTaskStore(state => ({
    draggedTaskId: state.draggedTaskId,
    dropTargetId: state.dropTargetId,
    dropPosition: state.dropPosition,
    isDragActive: state.isDragActive,
  })),
  
  // Auth selectors
  useUser: () => useTaskStore(state => state.user),
  useAuthLoading: () => useTaskStore(state => state.authLoading),
  
  // Sync & Network selectors
  useSyncState: () => useTaskStore(state => ({
    isSyncing: state.isSyncing,
    syncError: state.syncError,
    networkInfo: state.networkInfo,
  })),
  
  // Toast selectors
  useToast: () => useTaskStore(state => state.toast),
};

// Action hooks for better organization
export const useTaskActions = () => {
  const store = useTaskStore();
  
  return {
    // Task actions
    setLocalTasks: store.setLocalTasks,
    setCloudTasks: store.setCloudTasks,
    addTask: store.addTask,
    updateTask: store.updateTask,
    deleteTask: store.deleteTask,
    reorderTasks: store.reorderTasks,
    
    // UI actions
    setFilter: store.setFilter,
    setEditingTaskId: store.setEditingTaskId,
    setShowCreateTask: store.setShowCreateTask,
    
    // Drag & Drop actions
    setDraggedTaskId: store.setDraggedTaskId,
    setDropTarget: store.setDropTarget,
    setIsDragActive: store.setIsDragActive,
    resetDragState: store.resetDragState,
    
    // Auth actions
    setUser: store.setUser,
    setAuthLoading: store.setAuthLoading,
    
    // Sync & Network actions
    setSyncing: store.setSyncing,
    setSyncError: store.setSyncError,
    setNetworkInfo: store.setNetworkInfo,
    
    // Toast actions
    showToast: store.showToast,
    hideToast: store.hideToast,
    
    // Utility actions
    clearError: store.clearError,
  };
};