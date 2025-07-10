"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import Toast, { ToastType } from "./components/Toast";
import { Trash2, GripVertical } from "lucide-react";
// import AuthForm from "./components/AuthForm"; // Removed - auth is handled via /auth page
import { auth } from "./firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { loadUserTasks, addUserTask, updateUserTask, deleteUserTask, toggleUserTask, Task } from "./lib/firestore";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useOfflineQueue } from "./hooks/useOfflineQueue";
import { useSync } from "./hooks/useSync";
import { getNetworkManager, type NetworkState, type NetworkInfo } from "./lib/network";
import LoadingSpinner from "./components/LoadingSpinner";
import { OfflineStatusIndicator } from "./components/OfflineStatusIndicator";
import { useRouter } from "next/navigation";

type Filter = "all" | "active" | "completed";

// Calendar helpers
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function isToday(date: Date) {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

// Calendar dropdown component
function CalendarDropdown({ value, onChange, onClose }: { value?: string, onChange: (date: string) => void, onClose: () => void }) {
  const today = new Date();
  const [month, setMonth] = useState(value ? new Date(value).getMonth() : today.getMonth());
  const [year, setYear] = useState(value ? new Date(value).getFullYear() : today.getFullYear());
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setMonth(d.getMonth());
      setYear(d.getFullYear());
    } else {
      const currentDate = new Date();
      setMonth(currentDate.getMonth());
      setYear(currentDate.getFullYear());
    }
  }, [value]);
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const selected = value ? new Date(value) : undefined;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);
  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  }
  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  }

  return (
    <div ref={ref} className="absolute z-50 mt-2 border border-border-600 rounded-lg shadow-2 p-4 backdrop-blur bg-[rgba(20,23,32,0.85)]" style={{minWidth: 260}}>
      <div className="flex justify-between items-center mb-2">
        <button className="text-text-200 hover:text-text-100 active:text-text-100 hover:bg-bg-800 active:bg-bg-700 px-2 py-1 rounded transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]" onClick={prevMonth}>&lt;</button>
        <span className="text-text-100 font-medium">{new Date(year, month).toLocaleString(undefined, { month: 'long', year: 'numeric' })}</span>
        <button className="text-text-200 hover:text-text-100 active:text-text-100 hover:bg-bg-800 active:bg-bg-700 px-2 py-1 rounded transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]" onClick={nextMonth}>&gt;</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-text-200 text-sm mb-1">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array(firstDay).fill(null).map((_, i) => <div key={"empty-"+i}></div>)}
        {Array(daysInMonth).fill(null).map((_, i) => {
          const d = new Date(year, month, i + 1);
          const isSelected = selected && d.toDateString() === selected.toDateString();
          return (
            <button
              key={i+1}
              className={`rounded-md w-8 h-8 flex items-center justify-center transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${isSelected ? 'bg-brand-500 text-bg-900 hover:bg-brand-600 active:bg-brand-700' : isToday(d) ? 'border border-brand-500 text-brand-500 hover:bg-bg-700 active:bg-bg-600' : 'hover:bg-bg-800 active:bg-bg-700 text-text-100'}`}
              onClick={() => onChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)}
            >{i+1}</button>
          );
        })}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; type: ToastType }>({ open: false, message: "", type: "info" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [showEditCalendarId, setShowEditCalendar] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [dueDateInput, setDueDateInput] = useState("");
  const [taskRows, setTaskRows] = useState(1);
  const [editTaskRows, setEditTaskRows] = useState(1);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [cloudTasks, setCloudTasks] = useState<Task[]>([]);
  const [isMergingTasks, setIsMergingTasks] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const router = useRouter();
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const networkManager = getNetworkManager();
      setNetworkInfo(networkManager.getNetworkInfo());
      const unsubscribe = networkManager.subscribe((state) => {
        setNetworkInfo(networkManager.getNetworkInfo());
      });
      return unsubscribe;
    }
  }, []);

  // Local storage hook
  const { 
    tasks: localTasks, 
    loading: localTasksLoading, 
    addTask: addLocalTask,
    updateTask: updateLocalTask,
    deleteTask: deleteLocalTask,
    toggleTask: toggleLocalTask,
    refreshTasks: refreshLocalTasks,
    clearTasks: clearLocalTasks
  } = useLocalStorage();

  // Offline queue hook
  const {
    enqueueTaskCreate,
    enqueueTaskUpdate,
    enqueueTaskDelete
  } = useOfflineQueue();

  // Track authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // User signed in - load cloud tasks and merge with local tasks
        await handleUserSignIn(firebaseUser.uid);
      } else {
        // User signed out - clear cloud tasks and continue with local storage
        setCloudTasks([]);
        setTasksLoading(false);
        setIsMergingTasks(false);
        
        // Clear any pending operations
        setEditingId(null);
        setEditValue("");
        setEditNote("");
        setEditDueDate("");
        setShowCreateTask(false);
        setInput("");
        setNoteInput("");
        setDueDateInput("");
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle user sign in and task merging
  async function handleUserSignIn(userId: string) {
    setIsMergingTasks(true);
    setTasksLoading(true);
    setMergeError(null);
    
    try {
      // Load cloud tasks
      const userTasks = await loadUserTasks(userId);
      setCloudTasks(userTasks);
      
      // Merge local tasks with cloud tasks
      await mergeLocalTasksWithCloud(userTasks);
      
      setToast({ 
        open: true, 
        message: "Successfully signed in! Your tasks have been synchronized.", 
        type: "success" 
      });
    } catch (error) {
      console.error("Failed to load or merge tasks:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load tasks";
      setMergeError(errorMessage);
      setToast({ 
        open: true, 
        message: errorMessage, 
        type: "error" 
      });
      
      // Even if merge fails, we should still show the cloud tasks
      // The user can retry the merge later
    } finally {
      setIsMergingTasks(false);
      setTasksLoading(false);
    }
  }

  // Retry failed merge
  async function retryMerge() {
    if (!user || !mergeError) return;
    
    setIsMergingTasks(true);
    setMergeError(null);
    
    try {
      await mergeLocalTasksWithCloud(cloudTasks);
      setToast({ 
        open: true, 
        message: "Successfully merged local tasks with cloud!", 
        type: "success" 
      });
    } catch (error) {
      console.error("Failed to retry merge:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to merge tasks";
      setMergeError(errorMessage);
      setToast({ 
        open: true, 
        message: errorMessage, 
        type: "error" 
      });
    } finally {
      setIsMergingTasks(false);
    }
  }

  // Merge local tasks with cloud tasks - Apple Reminders style
  async function mergeLocalTasksWithCloud(cloudTasks: Task[]) {
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
      await clearLocalTasks();
      setToast({ 
        open: true, 
        message: "Your tasks are already synced with your cloud account.", 
        type: "success" 
      });
      return;
    }

    // Upload local tasks to cloud
    const uploadPromises = tasksToUpload.map(localTask => 
      addUserTask(user!.uid, {
        title: localTask.title,
        completed: localTask.completed,
        createdAt: localTask.createdAt,
        notes: localTask.notes,
        dueDate: localTask.dueDate
      })
    );

    try {
      const uploadResults = await Promise.all(uploadPromises);
      const successfulUploads = uploadResults.filter(id => id !== null).length;
      
      if (successfulUploads === tasksToUpload.length) {
        // All tasks uploaded successfully - refresh cloud tasks and clear local
        const updatedCloudTasks = await loadUserTasks(user!.uid);
        setCloudTasks(updatedCloudTasks);
        
        // Clear local tasks after successful upload
        await clearLocalTasks();
        
        setToast({ 
          open: true, 
          message: `Successfully merged ${tasksToUpload.length} local task${tasksToUpload.length > 1 ? 's' : ''} with your cloud account.`, 
          type: "success" 
        });
      } else {
        // Some tasks failed to upload
        setToast({ 
          open: true, 
          message: `Partially synced: ${successfulUploads}/${tasksToUpload.length} tasks uploaded. Remaining tasks will retry later.`, 
          type: "warning" 
        });
        
        // Refresh cloud tasks but keep local tasks that failed
        const updatedCloudTasks = await loadUserTasks(user!.uid);
        setCloudTasks(updatedCloudTasks);
      }
    } catch (error) {
      console.error("Failed to upload local tasks:", error);
      setToast({ 
        open: true, 
        message: "Failed to sync local tasks with cloud. Your local tasks are still available and will sync when connection improves.", 
        type: "error" 
      });
      
      // Don't clear local tasks if upload failed
      // The unified display will show both local and cloud tasks
    }
  }

  // Handle user sign out - preserve local experience
  async function handleSignOut() {
    try {
      // Clear any pending operations before signing out
      setEditingId(null);
      setEditValue("");
      setEditNote("");
      setEditDueDate("");
      setShowCreateTask(false);
      setInput("");
      setNoteInput("");
      setDueDateInput("");
      
      // Before signing out, save current cloud tasks to local storage
      // This ensures continuity when switching between authenticated/guest modes
      if (cloudTasks.length > 0) {
        for (const cloudTask of cloudTasks) {
          // Add cloud tasks to local storage if they don't exist
          const existingLocalTask = localTasks.find(lt => 
            lt.title.trim() === cloudTask.title.trim() && 
            (lt.notes || '').trim() === (cloudTask.notes || '').trim()
          );
          
          if (!existingLocalTask) {
            await addLocalTask({
              title: cloudTask.title,
              completed: cloudTask.completed,
              createdAt: cloudTask.createdAt,
              notes: cloudTask.notes,
              dueDate: cloudTask.dueDate
            });
          }
        }
      }
      
      await signOut(auth);
      setCloudTasks([]);
      setTasksLoading(false);
      setIsMergingTasks(false);
      
      // Refresh local tasks to include the cloud tasks we just saved
      await refreshLocalTasks();
      
      setToast({ 
        open: true, 
        message: "Successfully signed out. Your tasks remain available locally.", 
        type: "info" 
      });
    } catch (error) {
      console.error("Failed to sign out:", error);
      setToast({ 
        open: true, 
        message: "Failed to sign out", 
        type: "error" 
      });
    }
  }

  // Get the current tasks - unified approach like Apple Reminders
  // Show combined view during sync, otherwise show appropriate store
  const currentTasks = useMemo(() => {
    if (user) {
      // Authenticated user
      if (isMergingTasks) {
        // During merge, show combined view of both local and cloud tasks
        const combinedTasks = [...localTasks, ...cloudTasks];
        // Remove duplicates based on title and notes
        const uniqueTasks = combinedTasks.reduce((acc, task) => {
          const key = `${task.title.trim()}-${(task.notes || '').trim()}`;
          if (!acc.find(existing => `${existing.title.trim()}-${(existing.notes || '').trim()}` === key)) {
            acc.push(task);
          }
          return acc;
        }, [] as Task[]);
        return uniqueTasks.sort((a, b) => b.createdAt - a.createdAt);
      } else {
        // After successful merge or if no local tasks, show cloud tasks
        // But also include any local tasks that failed to upload
        if (localTasks.length > 0 && !tasksLoading) {
          // Still have local tasks - merge them in the display
          const combinedTasks = [...localTasks, ...cloudTasks];
          const uniqueTasks = combinedTasks.reduce((acc, task) => {
            const key = `${task.title.trim()}-${(task.notes || '').trim()}`;
            if (!acc.find(existing => `${existing.title.trim()}-${(existing.notes || '').trim()}` === key)) {
              acc.push(task);
            }
            return acc;
          }, [] as Task[]);
          return uniqueTasks.sort((a, b) => b.createdAt - a.createdAt);
        }
        return cloudTasks;
      }
    } else {
      // Guest user - show local tasks
      return localTasks;
    }
  }, [user, localTasks, cloudTasks, isMergingTasks, tasksLoading]);

  const isLoadingTasks = user ? tasksLoading : localTasksLoading;

  // Focus input when creating a new task
  useEffect(() => {
    if (showCreateTask && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCreateTask]);



  // Check if task creation should be allowed
  function canCreateTask() {
    const titleHasContent = input.trim().length > 0;
    const notesHasContent = noteInput.trim().length > 0;
    const hasDate = dueDateInput.length > 0;
    
    // Allow creation if any field has actual content (not just spaces)
    return titleHasContent || notesHasContent || hasDate;
  }

  // Start creating a new task
  function startCreateTask() {
    setShowCreateTask(true);
    setInput("");
    setNoteInput("");
    setDueDateInput("");
    setTaskRows(1);
  }

  // Cancel creating a new task
  function cancelCreateTask() {
    setShowCreateTask(false);
    setInput("");
    setNoteInput("");
    setDueDateInput("");
    setTaskRows(1);
  }

  // Add a new task
  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const title = input.trim();
    if (!title) return;
    
    try {
      const taskData = {
        title,
        completed: false,
        createdAt: Date.now(),
        notes: noteInput.trim() || undefined,
        dueDate: dueDateInput || undefined
      };
      
      if (user) {
        // Authenticated user - try cloud first, fallback to offline queue
        
        if (networkInfo?.isOnline && networkInfo?.canSync) {
          // Online - save to cloud
          const taskId = await addUserTask(user.uid, taskData);
          if (taskId) {
            // Add to cloud tasks state
            const newTask: Task = {
              ...taskData,
              id: taskId
            };
            setCloudTasks(prev => [newTask, ...prev]);
            setToast({ open: true, message: "Task added!", type: "success" });
          } else {
            setToast({ open: true, message: "Failed to add task", type: "error" });
          }
        } else {
          // Offline or poor connection - queue for later
          enqueueTaskCreate(taskData, user.uid, 'normal');
          
          // Also save to local storage for immediate feedback
          const localTaskId = await addLocalTask(taskData);
          
          if (localTaskId) {
            setToast({ 
              open: true, 
              message: networkInfo?.isOnline 
                ? "Task added! Will sync when connection improves." 
                : "Task added! Will sync when back online.", 
              type: "success" 
            });
          } else {
            setToast({ open: true, message: "Failed to add task", type: "error" });
          }
        }
      } else {
        // Non-authenticated user - save to local storage only
        const taskId = await addLocalTask(taskData);
        if (taskId) {
          setToast({ open: true, message: "Task added!", type: "success" });
        } else {
          setToast({ open: true, message: "Failed to add task", type: "error" });
        }
      }
      
      setInput("");
      setNoteInput("");
      setDueDateInput("");
      setTaskRows(1);
      inputRef.current?.focus();
    } catch (error) {
      console.error("Error adding task:", error);
      setToast({ open: true, message: "Failed to add task", type: "error" });
    }
  }

  // Handle key down events for task creation
  function handleTaskKeyDown(e: React.KeyboardEvent, isDescriptionField = false) {
    if (e.key === 'Enter') {
      if (e.shiftKey && !isDescriptionField) {
        // Shift+Enter in task field: insert newline and expand textarea
        e.preventDefault();
        
        const textarea = e.target as HTMLTextAreaElement;
        const cursorPosition = textarea.selectionStart;
        const textBefore = input.substring(0, cursorPosition);
        const textAfter = input.substring(cursorPosition);
        const newValue = textBefore + '\n' + textAfter;
        
        setInput(newValue);
        
        // Update rows based on new content
        const lines = newValue.split('\n').length;
        setTaskRows(Math.max(1, lines));
        
        // Set cursor position after the inserted newline
        setTimeout(() => {
          textarea.setSelectionRange(cursorPosition + 1, cursorPosition + 1);
        }, 0);
        
        return;
      } else if (!e.shiftKey) {
        // Regular Enter: create task if there's content
        e.preventDefault();
        if (canCreateTask()) {
          addTask(e as React.FormEvent);
        }
        return;
      }
    }
  }

  // Handle task input change and auto-resize
  function handleTaskInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    
    // Auto-resize based on content
    const lines = e.target.value.split('\n').length;
    setTaskRows(Math.max(1, lines));
  }

  // Handle edit task input change and auto-resize
  function handleEditTaskInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setEditValue(e.target.value);
    
    // Auto-resize based on content
    const lines = e.target.value.split('\n').length;
    setEditTaskRows(Math.max(1, lines));
  }

  // Handle key down events for edit task
  function handleEditTaskKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && e.shiftKey) {
      // Shift+Enter in edit task field: insert newline and expand textarea
      e.preventDefault();
      
      const textarea = e.target as HTMLTextAreaElement;
      const cursorPosition = textarea.selectionStart;
      const textBefore = editValue.substring(0, cursorPosition);
      const textAfter = editValue.substring(cursorPosition);
      const newValue = textBefore + '\n' + textAfter;
      
      setEditValue(newValue);
      
      // Update rows based on new content
      const lines = newValue.split('\n').length;
      setEditTaskRows(Math.max(1, lines));
      
      // Set cursor position after the inserted newline
      setTimeout(() => {
        textarea.setSelectionRange(cursorPosition + 1, cursorPosition + 1);
      }, 0);
      
      return;
    }
  }

  // Toggle task completion - unified approach
  async function toggleTask(id: string) {
    try {
      const task = currentTasks.find(t => t.id === id);
      if (!task) return;
      
      // Determine which store this task belongs to
      const isLocalTask = localTasks.find(t => t.id === id);
      const isCloudTask = cloudTasks.find(t => t.id === id);
      
      if (user) {
        // Authenticated user
        if (isCloudTask && networkInfo?.isOnline && networkInfo?.canSync) {
          // Task exists in cloud and we're online - update cloud
          const success = await toggleUserTask(user.uid, id, !task.completed);
          if (success) {
            setCloudTasks(prev => prev.map(t => 
              t.id === id ? { ...t, completed: !t.completed } : t
            ));
            setToast({ 
              open: true, 
              message: task.completed ? "Task marked as incomplete" : "Task completed!", 
              type: "success" 
            });
          } else {
            setToast({ open: true, message: "Failed to update task", type: "error" });
          }
        } else if (isLocalTask) {
          // Task exists locally (either offline or not yet synced)
          const success = await toggleLocalTask(id, !task.completed);
          if (success) {
            // If we're online but this is a local task, queue it for cloud sync
            if (networkInfo?.isOnline && networkInfo?.canSync) {
              enqueueTaskUpdate(id, { completed: !task.completed }, user.uid, 'normal');
            }
            
            setToast({ 
              open: true, 
              message: networkInfo?.isOnline && networkInfo?.canSync
                ? "Task updated and synced!" 
                : networkInfo?.isOnline 
                  ? "Task updated! Will sync when connection improves." 
                  : "Task updated! Will sync when back online.", 
              type: "success" 
            });
          } else {
            setToast({ open: true, message: "Failed to update task", type: "error" });
          }
        } else {
          // Fallback - queue for later sync
          enqueueTaskUpdate(id, { completed: !task.completed }, user.uid, 'normal');
          setToast({ 
            open: true, 
            message: "Task update queued for sync.", 
            type: "success" 
          });
        }
      } else {
        // Guest user - update local storage only
        const success = await toggleLocalTask(id, !task.completed);
        if (success) {
          setToast({ 
            open: true, 
            message: "Task updated!", 
            type: "success" 
          });
        } else {
          setToast({ open: true, message: "Failed to update task", type: "error" });
        }
      }
    } catch (error) {
      console.error("Error toggling task:", error);
      setToast({ open: true, message: "Failed to update task", type: "error" });
    }
  }

  // Delete a task - unified approach
  async function deleteTask(id: string) {
    try {
      // Determine which store this task belongs to
      const isLocalTask = localTasks.find(t => t.id === id);
      const isCloudTask = cloudTasks.find(t => t.id === id);
      
      if (user) {
        // Authenticated user
        if (isCloudTask && networkInfo?.isOnline && networkInfo?.canSync) {
          // Task exists in cloud and we're online - delete from cloud
          const success = await deleteUserTask(user.uid, id);
          if (success) {
            setCloudTasks(prev => prev.filter(t => t.id !== id));
            setToast({ open: true, message: "Task deleted.", type: "info" });
          } else {
            setToast({ open: true, message: "Failed to delete task", type: "error" });
          }
        } else if (isLocalTask) {
          // Task exists locally (either offline or not yet synced)
          const success = await deleteLocalTask(id);
          if (success) {
            // If we're online but this is a local task, queue it for cloud sync
            if (networkInfo?.isOnline && networkInfo?.canSync) {
              enqueueTaskDelete(id, user.uid, 'high');
            }
            
            setToast({ 
              open: true, 
              message: networkInfo?.isOnline && networkInfo?.canSync
                ? "Task deleted and synced!" 
                : networkInfo?.isOnline 
                  ? "Task deleted! Will sync when connection improves." 
                  : "Task deleted! Will sync when back online.", 
              type: "info" 
            });
          } else {
            setToast({ open: true, message: "Failed to delete task", type: "error" });
          }
        } else {
          // Fallback - queue for later sync
          enqueueTaskDelete(id, user.uid, 'high');
          setToast({ 
            open: true, 
            message: "Task deletion queued for sync.", 
            type: "info" 
          });
        }
      } else {
        // Guest user - delete from local storage only
        const success = await deleteLocalTask(id);
        if (success) {
          setToast({ open: true, message: "Task deleted.", type: "info" });
        } else {
          setToast({ open: true, message: "Failed to delete task", type: "error" });
        }
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      setToast({ open: true, message: "Failed to delete task", type: "error" });
    }
  }

  // Add function to start editing
  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditValue(task.title);
    setEditNote(task.notes || "");
    setEditDueDate(task.dueDate || "");
    setEditTaskRows(Math.max(1, task.title.split('\n').length));
  }

  // Save edit - unified approach
  async function saveEdit(id: string) {
    try {
      const updates = {
        title: editValue,
        notes: editNote || undefined,
        dueDate: editDueDate || undefined
      };
      
      // Determine which store this task belongs to
      const isLocalTask = localTasks.find(t => t.id === id);
      const isCloudTask = cloudTasks.find(t => t.id === id);
      
      if (user) {
        // Authenticated user
        if (isCloudTask && networkInfo?.isOnline && networkInfo?.canSync) {
          // Task exists in cloud and we're online - update cloud
          const success = await updateUserTask(user.uid, id, updates);
          if (success) {
            setCloudTasks(prev => prev.map(t => 
              t.id === id ? { ...t, ...updates } : t
            ));
            setEditingId(null);
            setEditValue("");
            setEditNote("");
            setEditDueDate("");
            setEditTaskRows(1);
            setToast({ open: true, message: "Task updated!", type: "success" });
          } else {
            setToast({ open: true, message: "Failed to update task", type: "error" });
          }
        } else if (isLocalTask) {
          // Task exists locally (either offline or not yet synced)
          const success = await updateLocalTask(id, updates);
          if (success) {
            // If we're online but this is a local task, queue it for cloud sync
            if (networkInfo?.isOnline && networkInfo?.canSync) {
              enqueueTaskUpdate(id, updates, user.uid, 'normal');
            }
            
            setEditingId(null);
            setEditValue("");
            setEditNote("");
            setEditDueDate("");
            setEditTaskRows(1);
            setToast({ 
              open: true, 
              message: networkInfo?.isOnline && networkInfo?.canSync
                ? "Task updated and synced!" 
                : networkInfo?.isOnline 
                  ? "Task updated! Will sync when connection improves." 
                  : "Task updated! Will sync when back online.", 
              type: "success" 
            });
          } else {
            setToast({ open: true, message: "Failed to update task", type: "error" });
          }
        } else {
          // Fallback - queue for later sync
          enqueueTaskUpdate(id, updates, user.uid, 'normal');
          setEditingId(null);
          setEditValue("");
          setEditNote("");
          setEditDueDate("");
          setEditTaskRows(1);
          setToast({ 
            open: true, 
            message: "Task update queued for sync.", 
            type: "success" 
          });
        }
      } else {
        // Guest user - update local storage only
        const success = await updateLocalTask(id, updates);
        if (success) {
          setEditingId(null);
          setEditValue("");
          setEditNote("");
          setEditDueDate("");
          setEditTaskRows(1);
          setToast({ open: true, message: "Task updated!", type: "success" });
        } else {
          setToast({ open: true, message: "Failed to update task", type: "error" });
        }
      }
    } catch (error) {
      console.error("Error saving edit:", error);
      setToast({ open: true, message: "Failed to update task", type: "error" });
    }
  }

  // Filtered tasks
  const filteredTasks = currentTasks.filter(t => {
    if (filter === "all") return true;
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  // Drag and drop reordering
  function onDragStart(e: React.DragEvent<HTMLLIElement>, id: string) {
    e.dataTransfer.setData("text/plain", id);
  }
  function onDrop(e: React.DragEvent<HTMLLIElement>, id: string) {
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId === id) return;
    const draggedIdx = currentTasks.findIndex(t => t.id === draggedId);
    const dropIdx = currentTasks.findIndex(t => t.id === id);
    if (draggedIdx === -1 || dropIdx === -1) return;
    const newTasks = [...currentTasks];
    const [draggedTask] = newTasks.splice(draggedIdx, 1);
    newTasks.splice(dropIdx, 0, draggedTask);
    // TODO: Update local storage with new order
    // For now, we'll implement this in the next section
  }

  // Roving tabindex for accessibility
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

  // Group tasks by due date
  function groupTasksByDueDate(tasks: Task[]) {
    const groups: { [key: string]: Task[] } = {};
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    function dateKey(dateStr?: string) {
      if (!dateStr) return "No Due Date";
      const date = new Date(dateStr);
      if (date.toDateString() === today.toDateString()) return "Today";
      if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
      return date.toLocaleDateString();
    }
    for (const task of tasks) {
      const key = dateKey(task.dueDate);
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    }
    // Sort groups: Today, Tomorrow, then by date, then No Due Date last
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "Today") return -1;
      if (b === "Today") return 1;
      if (a === "Tomorrow") return -1;
      if (b === "Tomorrow") return 1;
      if (a === "No Due Date") return 1;
      if (b === "No Due Date") return -1;
      return new Date(a).getTime() - new Date(b).getTime();
    });
    return sortedKeys.map(key => ({ key, tasks: groups[key] }));
  }
  const groupedTasks = groupTasksByDueDate(filteredTasks);

  // Show loading state while tasks are loading or merging
  if (isLoadingTasks || isMergingTasks) {
    return (
      <div className="min-h-screen bg-bg-900 flex flex-col items-center justify-center py-16 px-4">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" className="text-brand-500" />
          <div className="text-text-200">
            {isMergingTasks ? "Syncing tasks..." : "Loading tasks..."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-900 flex flex-col items-center py-16 px-4" dir="auto">
      <div className="w-full max-w-xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex-1">
            {mergeError && user && (
              <div className="flex items-center gap-2 text-sm text-state-error bg-bg-800 border border-state-error rounded-lg px-3 py-2">
                <span>⚠️ {mergeError}</span>
                <button
                  onClick={retryMerge}
                  disabled={isMergingTasks}
                  className="text-brand-500 hover:underline disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isMergingTasks ? "Retrying..." : "Retry"}
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Offline Status Indicator */}
            {user && (
              <OfflineStatusIndicator 
                userId={user.uid}
                onQueueProcess={() => {
                  setToast({ 
                    open: true, 
                    message: "Pending actions processed successfully!", 
                    type: "success" 
                  });
                }}
              />
            )}
            
            {/* Auth Buttons */}
            {user ? (
              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-md border border-border-600 text-text-100 hover:bg-bg-700 active:bg-bg-600 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => router.push('/auth')}
                className="px-4 py-2 rounded-md bg-brand-500 text-bg-900 hover:bg-brand-600 active:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
        <h1 className="text-4xl font-semibold mb-8 text-text-100 tracking-tight" style={{letterSpacing: '-0.25px'}}>To-Do List</h1>
        
        {/* Create Task CTA or Form */}
        {!showCreateTask ? (
          <div className="mb-8">
            <button
              onClick={startCreateTask}
              className="w-full flex items-center justify-center gap-3 bg-transparent hover:bg-bg-700 active:bg-bg-600 border border-border-600 rounded-lg shadow-2 p-6 text-text-200 hover:text-text-100 font-medium transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label="Create a new task"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add new task
            </button>
          </div>
        ) : (
          <form
            onSubmit={addTask}
            className="mb-8 w-full bg-bg-800 rounded-lg shadow-2 p-4 border border-border-600"
            aria-label="Add a new task"
          >
            <div className="flex items-start gap-4">
              {/* Checkbox on the left */}
              <span className="flex items-start pt-2">
                <input
                  type="checkbox"
                  disabled
                  className="w-6 h-6 rounded-full border-2 border-border-600 bg-bg-900 cursor-default"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </span>
              {/* Main content */}
              <div className="flex-1 flex flex-col gap-1">
                <textarea
                  id="task-title"
                  ref={inputRef}
                  className="w-full bg-transparent border-none outline-none text-lg text-text-100 placeholder-text-300 font-medium resize-none focus:ring-0 focus:outline-none"
                  placeholder="Task"
                  value={input}
                  onChange={handleTaskInputChange}
                  aria-label="Task title"
                  style={{fontFamily: 'var(--font-sans)'}}
                  dir="auto"
                  rows={taskRows}
                  onKeyDown={e => handleTaskKeyDown(e)}
                />
                {/* Notes textarea */}
                <textarea
                  className="w-full bg-transparent border-none outline-none text-base text-text-100 placeholder-text-300 font-normal resize-none focus:ring-0 focus:outline-none mt-1"
                  placeholder="Description"
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  aria-label="Task description"
                  style={{fontFamily: 'var(--font-sans)'}}
                  dir="auto"
                  rows={2}
                  onKeyDown={e => handleTaskKeyDown(e, true)}
                />
                {/* Date pill and calendar dropdown */}
                <div className="relative flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    className="flex items-center gap-1 px-4 py-2 rounded-full bg-transparent border border-border-600 text-text-100 text-base font-medium cursor-pointer hover:bg-bg-700 active:bg-bg-600 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                    onClick={() => setShowCalendar(true)}
                  >
                    {dueDateInput
                      ? (() => {
                          const today = new Date();
                          const tomorrow = new Date();
                          tomorrow.setDate(today.getDate() + 1);
                          const selected = new Date(dueDateInput);
                          if (selected.toDateString() === today.toDateString()) return 'Today';
                          if (selected.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
                          return selected.toLocaleDateString();
                        })()
                      : 'Add date'}
                    {dueDateInput && (
                      <span
                        className="ml-2 text-text-300 cursor-pointer hover:text-state-error active:text-red-600 transition-all duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                        onClick={e => { e.stopPropagation(); setDueDateInput(""); }}
                        aria-label="Clear date"
                      >
                        ×
                      </span>
                    )}
                  </button>
                  {showCalendar && (
                    <CalendarDropdown
                      value={dueDateInput}
                      onChange={date => { setDueDateInput(date); setShowCalendar(false); }}
                      onClose={() => setShowCalendar(false)}
                    />
                  )}
                </div>
                
                {/* Save and Cancel buttons */}
                <div className="flex gap-2 mt-4">
                  <button 
                    type="submit" 
                    className={`px-4 py-2 rounded-md font-medium transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 ${
                      canCreateTask() 
                        ? "bg-brand-500 text-bg-900 hover:bg-brand-600 active:bg-brand-700" 
                        : "bg-bg-700 text-text-300 cursor-not-allowed opacity-50"
                    }`}
                    disabled={!canCreateTask()}
                  >
                    Save
                  </button>
                  <button 
                    type="button" 
                    onClick={cancelCreateTask}
                    className="px-4 py-2 rounded-md bg-transparent text-text-200 border border-border-600 hover:bg-bg-700 active:bg-bg-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
        
        <div className="flex gap-2 mb-6" role="tablist" aria-label="Task filters">
          {(["all", "active", "completed"] as Filter[]).map(f => (
            <button
              key={f}
              className={`px-4 py-2 rounded-full font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${filter === f ? "bg-brand-500 text-bg-900 hover:bg-brand-600 active:bg-brand-700" : "text-text-200 hover:bg-bg-800 active:bg-bg-700"}`}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              style={{fontFamily: 'var(--font-sans)'}}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <ol className="space-y-6" aria-label="Task list">
          {isLoadingTasks && (
            <li className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <LoadingSpinner size="lg" className="text-brand-500" />
                <div className="text-text-200">Loading tasks...</div>
              </div>
            </li>
          )}
          {!isLoadingTasks && groupedTasks.length === 0 && (
            <li className="flex flex-col items-center justify-center py-16 bg-bg-800 rounded-lg shadow-2 text-text-200 text-lg font-medium select-none">
              <span className="mb-2">Add your first task</span>
              <span className="text-sm text-text-300">Stay organized and productive</span>
            </li>
          )}
          {!isLoadingTasks && groupedTasks.map(group => (
            <li key={group.key}>
              <div className="mb-2 text-accent-amber font-semibold text-base">{group.key}</div>
              <ol className="space-y-3">
                {group.tasks.map((task, idx) => (
                  <li
                    key={task.id}
                    className={`${editingId === task.id 
                      ? "bg-bg-800 min-h-[56px] rounded-lg shadow-2 p-4 border border-border-600" 
                      : "flex items-center gap-3 bg-bg-800 min-h-[56px] rounded-lg shadow-2 px-4 py-3 group transition-all cursor-move"
                    }`}
                    draggable={editingId !== task.id}
                    onDragStart={editingId !== task.id ? e => onDragStart(e, task.id) : undefined}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => onDrop(e, task.id)}
                    tabIndex={focusedIdx === idx ? 0 : -1}
                    aria-label={task.title}
                    onFocus={() => setFocusedIdx(idx)}
                    onKeyDown={e => {
                      if (e.key === "ArrowDown" && idx < group.tasks.length - 1) {
                        setFocusedIdx(idx + 1);
                      } else if (e.key === "ArrowUp" && idx > 0) {
                        setFocusedIdx(idx - 1);
                      }
                    }}
                    dir="auto"
                  >
                    {editingId === task.id ? (
                      <form
                        onSubmit={e => { e.preventDefault(); saveEdit(task.id); }}
                        className="flex items-start gap-4 w-full"
                      >
                        {/* Checkbox on the left */}
                        <span className="flex items-start pt-2">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleTask(task.id)}
                            className="w-6 h-6 rounded-full border-2 border-border-600 bg-bg-900 accent-brand-500 hover:border-brand-500 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-all align-middle cursor-pointer"
                            aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
                            role="checkbox"
                            aria-checked={task.completed}
                          />
                        </span>
                        {/* Main content */}
                        <div className="flex-1 flex flex-col gap-1">
                          <textarea
                            className="w-full bg-transparent border-none outline-none text-lg text-text-100 placeholder-text-300 font-medium resize-none focus:ring-0 focus:outline-none"
                            placeholder="Task"
                            value={editValue}
                            onChange={handleEditTaskInputChange}
                            onKeyDown={handleEditTaskKeyDown}
                            aria-label="Edit task title"
                            style={{fontFamily: 'var(--font-sans)'}}
                            dir="auto"
                            rows={editTaskRows}
                          />
                          <textarea
                            className="w-full bg-transparent border-none outline-none text-base text-text-100 placeholder-text-300 font-normal resize-none focus:ring-0 focus:outline-none mt-1"
                            placeholder="Description"
                            value={editNote}
                            onChange={e => setEditNote(e.target.value)}
                            aria-label="Edit task description"
                            style={{fontFamily: 'var(--font-sans)'}}
                            dir="auto"
                            rows={2}
                          />
                          {/* Date pill and calendar dropdown */}
                          <div className="relative flex flex-wrap gap-2 mt-3">
                            <button
                              type="button"
                              className="flex items-center gap-1 px-4 py-2 rounded-full bg-transparent border border-border-600 text-text-100 text-base font-medium cursor-pointer hover:bg-bg-700 active:bg-bg-600 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                              onClick={() => setShowEditCalendar(task.id)}
                            >
                              {editDueDate
                                ? (() => {
                                    const today = new Date();
                                    const tomorrow = new Date();
                                    tomorrow.setDate(today.getDate() + 1);
                                    const selected = new Date(editDueDate);
                                    if (selected.toDateString() === today.toDateString()) return 'Today';
                                    if (selected.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
                                    return selected.toLocaleDateString();
                                  })()
                                : 'Add date'}
                              {editDueDate && (
                                <span
                                  className="ml-2 text-text-300 cursor-pointer hover:text-state-error active:text-red-600 transition-all duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                                  onClick={e => { e.stopPropagation(); setEditDueDate(""); }}
                                  aria-label="Clear date"
                                >
                                  ×
                                </span>
                              )}
                            </button>
                            {showEditCalendarId === task.id && (
                              <CalendarDropdown
                                value={editDueDate}
                                onChange={date => { setEditDueDate(date); setShowEditCalendar(null); }}
                                onClose={() => setShowEditCalendar(null)}
                              />
                            )}
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button type="submit" className="px-4 py-2 rounded-md bg-brand-500 text-bg-900 font-medium hover:bg-brand-600 active:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]">Save</button>
                            <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 rounded-md bg-transparent text-text-200 border border-border-600 hover:bg-bg-700 active:bg-bg-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]">Cancel</button>
                          </div>
                        </div>
                        {/* Delete button in edit mode */}
                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          className="ml-2 p-2 rounded-full text-text-200 hover:bg-state-error hover:text-text-100 active:brightness-90 focus:outline-none focus:ring-2 focus:ring-state-error focus:ring-offset-2 focus:ring-offset-bg-800 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                          aria-label="Delete task"
                        >
                          <Trash2 className="w-5 h-5" aria-hidden="true" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="flex items-center justify-center h-full mt-1">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleTask(task.id)}
                            className="w-5 h-5 accent-brand-500 rounded hover:border-brand-500 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-all align-middle cursor-pointer"
                            aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
                            role="checkbox"
                            aria-checked={task.completed}
                          />
                        </span>
                        <div className="flex-1 flex flex-col">
                          <span className={`text-lg select-text ${task.completed ? "line-through text-text-300" : "text-text-100"}`} style={{fontFamily: 'var(--font-sans)'}}>{task.title}</span>
                          {task.notes && <span className="text-sm text-text-300 mt-1 whitespace-pre-line">{task.notes}</span>}
                          {task.dueDate && <span className="text-xs text-accent-amber mt-1">Due: {task.dueDate}</span>}
                        </div>
                        {task.completed && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-state-success text-bg-900 ml-2" role="status">Done</span>
                        )}
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="ml-2 p-2 rounded-full text-text-200 opacity-0 group-hover:opacity-100 hover:bg-state-error hover:text-text-100 active:brightness-90 focus:outline-none focus:ring-2 focus:ring-state-error focus:ring-offset-2 focus:ring-offset-bg-800 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                          aria-label="Delete task"
                        >
                          <Trash2 className="w-5 h-5" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => startEdit(task)}
                          className={`ml-2 px-3 py-1 rounded-full text-sm font-medium transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                            editingId !== null 
                              ? "bg-bg-800 text-text-300 border border-border-600 cursor-not-allowed opacity-50" 
                              : "bg-transparent text-text-200 border border-border-600 hover:bg-bg-700 active:bg-bg-600"
                          }`}
                          aria-label="Edit task"
                          tabIndex={0}
                          disabled={editingId !== null}
                        >
                          Edit
                        </button>
                        <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                          <GripVertical className="w-5 h-5 text-text-300" />
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </div>
      <Toast
        message={toast.message}
        type={toast.type}
        open={toast.open}
        onClose={() => setToast({ ...toast, open: false })}
      />
    </div>
  );
}
