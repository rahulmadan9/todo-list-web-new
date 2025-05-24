import { db } from "../firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy
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

// Load all tasks for a specific user
export async function loadUserTasks(userId: string): Promise<Task[]> {
  try {
    const tasksRef = collection(db, "users", userId, "tasks");
    const q = query(tasksRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
  } catch (error) {
    console.error("Error loading tasks:", error);
    return [];
  }
}

// Add a new task for a specific user
export async function addUserTask(userId: string, taskData: Omit<Task, "id">): Promise<string | null> {
  try {
    console.log("Adding task for user:", userId);
    console.log("Task data:", taskData);
    
    // Clean the data to ensure Firestore compatibility
    const cleanTaskData = {
      title: taskData.title,
      completed: taskData.completed,
      createdAt: Date.now(),
      notes: taskData.notes || null,
      dueDate: taskData.dueDate || null
    };
    
    console.log("Clean task data:", cleanTaskData);
    
    const tasksRef = collection(db, "users", userId, "tasks");
    console.log("Adding to collection path: users/" + userId + "/tasks");
    
    const docRef = await addDoc(tasksRef, cleanTaskData);
    console.log("Task added successfully with ID:", docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error("Error adding task:", error);
    console.error("Error details:", (error as Error).message);
    return null;
  }
}

// Update an existing task
export async function updateUserTask(userId: string, taskId: string, updates: Partial<Omit<Task, "id">>): Promise<boolean> {
  try {
    const taskRef = doc(db, "users", userId, "tasks", taskId);
    
    // Clean the update data to ensure Firestore compatibility
    const cleanUpdates: Partial<Omit<Task, "id">> = {};
    
    // Only include defined values, convert empty strings to null
    if (updates.title !== undefined) {
      cleanUpdates.title = updates.title;
    }
    if (updates.completed !== undefined) {
      cleanUpdates.completed = updates.completed;
    }
    if (updates.notes !== undefined) {
      cleanUpdates.notes = updates.notes || undefined;
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
  } catch (error) {
    console.error("Error updating task:", error);
    console.error("Error details:", (error as Error).message);
    return false;
  }
}

// Delete a task
export async function deleteUserTask(userId: string, taskId: string): Promise<boolean> {
  try {
    const taskRef = doc(db, "users", userId, "tasks", taskId);
    await deleteDoc(taskRef);
    return true;
  } catch (error) {
    console.error("Error deleting task:", error);
    return false;
  }
}

// Toggle task completion
export async function toggleUserTask(userId: string, taskId: string, completed: boolean): Promise<boolean> {
  return updateUserTask(userId, taskId, { completed });
} 