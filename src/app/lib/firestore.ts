import { db } from "../firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
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
    const q = query(tasksRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
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
    
    // Clean the data to ensure Firestore compatibility
    const cleanTaskData = {
      title: taskData.title.trim(),
      completed: taskData.completed,
      createdAt: Date.now(),
      notes: taskData.notes?.trim() || null,
      dueDate: taskData.dueDate || null
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