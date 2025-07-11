import { db } from "../firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  enableNetwork,
  disableNetwork
} from "firebase/firestore";

// Task type (matching the existing interface)
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  notes?: string;
  dueDate?: string;
  order?: number;
}

// Error handling with retry logic
async function withRetry<T>(
  operation: () => Promise<T>, 
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error("Max retries exceeded");
}

// Load all tasks for a specific user with retry logic
export async function loadUserTasks(userId: string): Promise<Task[]> {
  return withRetry(async () => {
    const tasksRef = collection(db, "users", userId, "tasks");
    // Simple query - we'll sort in JavaScript to avoid complex indexing
    const querySnapshot = await getDocs(tasksRef);
    
    const tasks = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
    
    // For backward compatibility, assign order values to tasks that don't have them
    let hasTasksWithoutOrder = false;
    const tasksWithOrder = tasks.map((task, index) => {
      if (task.order === undefined || task.order === null) {
        hasTasksWithoutOrder = true;
        return { ...task, order: task.createdAt + index };
      }
      return task;
    });
    
    // If we found tasks without order, update them in Firestore
    if (hasTasksWithoutOrder) {
      try {
        await updateTasksOrder(userId, tasksWithOrder);
      } catch (error) {
        console.warn('Failed to migrate tasks to use order field:', error);
      }
    }
    
    // Sort in JavaScript: by order first, then by createdAt for backward compatibility
    return tasksWithOrder.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      } else if (a.order !== undefined) {
        return -1; // Tasks with order come first
      } else if (b.order !== undefined) {
        return 1; // Tasks with order come first
      } else {
        return b.createdAt - a.createdAt; // Fallback to creation time (newest first)
      }
    });
  });
}

// Add a new task for a specific user with validation
export async function addUserTask(userId: string, taskData: Omit<Task, "id">): Promise<string | null> {
  return withRetry(async () => {
    // Validate input
    if (!taskData.title?.trim()) {
      throw new Error("Task title is required");
    }
    
    if (taskData.title.length > 500) {
      throw new Error("Task title is too long (max 500 characters)");
    }
    
    if (taskData.notes && taskData.notes.length > 2000) {
      throw new Error("Task notes are too long (max 2000 characters)");
    }
    
    console.log("Adding task for user:", userId);
    console.log("Task data:", taskData);
    
    // Assign order value - if not provided, add to the end of existing tasks
    let orderValue = taskData.order;
    if (orderValue === undefined || orderValue === null) {
      try {
        const tasksRef = collection(db, "users", userId, "tasks");
        const snapshot = await getDocs(tasksRef);
        
        if (!snapshot.empty) {
          // Find the maximum order value from all tasks
          let maxOrder = 0;
          snapshot.docs.forEach(doc => {
            const task = doc.data() as Task;
            if (task.order && task.order > maxOrder) {
              maxOrder = task.order;
            }
          });
          orderValue = maxOrder + 1000;
        } else {
          orderValue = 1000; // First task
        }
      } catch (error) {
        console.warn('Failed to get next order value, using timestamp:', error);
        orderValue = Date.now();
      }
    }
    
    // Clean the data to ensure Firestore compatibility
    const cleanTaskData = {
      title: taskData.title.trim(),
      completed: taskData.completed,
      createdAt: Date.now(),
      notes: taskData.notes?.trim() || null,
      dueDate: taskData.dueDate || null,
      order: orderValue
    };
    
    console.log("Clean task data:", cleanTaskData);
    
    const tasksRef = collection(db, "users", userId, "tasks");
    console.log("Adding to collection path: users/" + userId + "/tasks");
    
    const docRef = await addDoc(tasksRef, cleanTaskData);
    console.log("Task added successfully with ID:", docRef.id);
    
    return docRef.id;
  });
}

// Update an existing task with validation
export async function updateUserTask(userId: string, taskId: string, updates: Partial<Omit<Task, "id">>): Promise<boolean> {
  return withRetry(async () => {
    // Validate input
    if (updates.title !== undefined && updates.title.length > 500) {
      throw new Error("Task title is too long (max 500 characters)");
    }
    
    if (updates.notes !== undefined && updates.notes && updates.notes.length > 2000) {
      throw new Error("Task notes are too long (max 2000 characters)");
    }
    
    const taskRef = doc(db, "users", userId, "tasks", taskId);
    
    // Clean the update data to ensure Firestore compatibility
    const cleanUpdates: Partial<Omit<Task, "id">> = {};
    
    // Only include defined values, convert empty strings to null
    if (updates.title !== undefined) {
      cleanUpdates.title = updates.title.trim();
    }
    if (updates.completed !== undefined) {
      cleanUpdates.completed = updates.completed;
    }
    if (updates.notes !== undefined) {
      cleanUpdates.notes = updates.notes?.trim() || undefined;
    }
    if (updates.dueDate !== undefined) {
      cleanUpdates.dueDate = updates.dueDate || undefined;
    }
    if (updates.createdAt !== undefined) {
      cleanUpdates.createdAt = updates.createdAt;
    }
    if (updates.order !== undefined) {
      cleanUpdates.order = updates.order;
    }
    
    console.log("Updating task with cleaned data:", cleanUpdates);
    
    await updateDoc(taskRef, cleanUpdates);
    return true;
  });
}

// Delete a task
export async function deleteUserTask(userId: string, taskId: string): Promise<boolean> {
  return withRetry(async () => {
    const taskRef = doc(db, "users", userId, "tasks", taskId);
    await deleteDoc(taskRef);
    return true;
  });
}

// Toggle task completion
export async function toggleUserTask(userId: string, taskId: string, completed: boolean): Promise<boolean> {
  return updateUserTask(userId, taskId, { completed });
}

// Update the order of multiple tasks using batch write
export async function updateTasksOrder(userId: string, tasks: Task[]): Promise<boolean> {
  return withRetry(async () => {
    const batch = writeBatch(db);
    
    tasks.forEach((task) => {
      const taskRef = doc(db, "users", userId, "tasks", task.id);
      batch.update(taskRef, { order: task.order });
    });
    
    await batch.commit();
    return true;
  });
}

// Reorder tasks by updating their order values
export async function reorderUserTasks(userId: string, taskIds: string[]): Promise<boolean> {
  return withRetry(async () => {
    const batch = writeBatch(db);
    
    // Assign new order values starting from 1000, incrementing by 1000
    taskIds.forEach((taskId, index) => {
      const taskRef = doc(db, "users", userId, "tasks", taskId);
      const newOrder = (index + 1) * 1000;
      batch.update(taskRef, { order: newOrder });
    });
    
    await batch.commit();
    return true;
  });
}

// Network status helpers for offline support
export async function enableFirestoreNetwork(): Promise<void> {
  try {
    await enableNetwork(db);
  } catch (error) {
    console.warn("Failed to enable network:", error);
  }
}

export async function disableFirestoreNetwork(): Promise<void> {
  try {
    await disableNetwork(db);
  } catch (error) {
    console.warn("Failed to disable network:", error);
  }
} 