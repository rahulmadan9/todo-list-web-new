"use client";
import { useEffect, useRef, useState } from "react";
import Toast, { ToastType } from "./components/Toast";
import { Trash2, GripVertical, CheckCircle2 } from "lucide-react";

// Task type
interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

type Filter = "all" | "active" | "completed";

const TASKS_KEY = "todo-list-tasks";

function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; type: ToastType }>({ open: false, message: "", type: "info" });

  // Load tasks from localStorage on mount
  useEffect(() => {
    setTasks(loadTasks());
  }, []);

  // Save tasks to localStorage on change
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  // Add a new task
  function addTask(e: React.FormEvent) {
    e.preventDefault();
    const title = input.trim();
    if (!title) return;
    setTasks([
      { id: crypto.randomUUID(), title, completed: false, createdAt: Date.now() },
      ...tasks,
    ]);
    setInput("");
    inputRef.current?.focus();
    setToast({ open: true, message: "Task added!", type: "success" });
  }

  // Toggle task completion
  function toggleTask(id: string) {
    setTasks(tasks =>
      tasks.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  // Delete a task
  function deleteTask(id: string) {
    setTasks(tasks => tasks.filter(t => t.id !== id));
    setToast({ open: true, message: "Task deleted.", type: "info" });
  }

  // Filtered tasks
  const filteredTasks = tasks.filter(t => {
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
    const draggedIdx = tasks.findIndex(t => t.id === draggedId);
    const dropIdx = tasks.findIndex(t => t.id === id);
    if (draggedIdx === -1 || dropIdx === -1) return;
    const newTasks = [...tasks];
    const [draggedTask] = newTasks.splice(draggedIdx, 1);
    newTasks.splice(dropIdx, 0, draggedTask);
    setTasks(newTasks);
  }

  // Roving tabindex for accessibility
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-bg-900 flex flex-col items-center py-16 px-4" dir="auto">
      <div className="w-full max-w-xl">
        <h1 className="text-4xl font-semibold mb-8 text-text-100 tracking-tight" style={{letterSpacing: '-0.25px'}}>To-Do List</h1>
        <form
          onSubmit={addTask}
          className="flex gap-3 mb-8"
          aria-label="Add a new task"
        >
          <input
            ref={inputRef}
            type="text"
            className="flex-1 rounded-md bg-bg-800 border border-border-600 px-4 py-3 text-lg text-text-100 placeholder-text-300 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-1 transition-all"
            placeholder="Add a new task..."
            value={input}
            onChange={e => setInput(e.target.value)}
            aria-label="Task title"
            style={{fontFamily: 'var(--font-sans)'}}
            dir="auto"
          />
          <button
            type="submit"
            className="rounded-md bg-brand-500 text-text-100 px-6 py-3 font-medium text-lg shadow-1 hover:bg-brand-600 active:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-all"
            aria-label="Add task"
          >
            Add
          </button>
        </form>
        <div className="flex gap-2 mb-6" role="tablist" aria-label="Task filters">
          {(["all", "active", "completed"] as Filter[]).map(f => (
            <button
              key={f}
              className={`px-4 py-2 rounded-full font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-all ${filter === f ? "bg-brand-500 text-bg-900" : "bg-bg-800 text-text-200 hover:bg-bg-700 border border-border-600"}`}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              role="tab"
              style={{fontFamily: 'var(--font-sans)'}}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <ol className="space-y-3" aria-label="Task list">
          {filteredTasks.length === 0 && (
            <li className="flex flex-col items-center justify-center py-16 bg-bg-800 rounded-lg shadow-2 text-text-200 text-lg font-medium select-none">
              <span className="mb-2">Add your first task</span>
              <span className="text-sm text-text-300">Stay organized and productive</span>
            </li>
          )}
          {filteredTasks.map((task, idx) => (
            <li
              key={task.id}
              className="flex items-center gap-3 bg-bg-800 min-h-[56px] rounded-lg shadow-2 px-4 py-3 group transition-all cursor-move"
              draggable
              onDragStart={e => onDragStart(e, task.id)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => onDrop(e, task.id)}
              tabIndex={focusedIdx === idx ? 0 : -1}
              aria-label={task.title}
              onFocus={() => setFocusedIdx(idx)}
              onKeyDown={e => {
                if (e.key === "ArrowDown" && idx < filteredTasks.length - 1) {
                  setFocusedIdx(idx + 1);
                } else if (e.key === "ArrowUp" && idx > 0) {
                  setFocusedIdx(idx - 1);
                }
              }}
              dir="auto"
            >
              <span className="flex items-center justify-center w-6 h-6 mr-2">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id)}
                  className="w-5 h-5 accent-brand-500 rounded focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-all"
                  aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
                  role="checkbox"
                  aria-checked={task.completed}
                />
              </span>
              <span className={`flex-1 text-lg select-text ${task.completed ? "line-through text-text-300" : "text-text-100"}`} style={{fontFamily: 'var(--font-sans)'}}>{task.title}</span>
              {task.completed && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-state-success text-bg-900 ml-2" role="status">Done</span>
              )}
              <button
                onClick={() => deleteTask(task.id)}
                className="ml-2 px-3 py-1 rounded-full bg-transparent text-state-error hover:bg-bg-700 focus:outline-none focus:ring-2 focus:ring-state-error focus:ring-offset-2 focus:ring-offset-bg-900 text-sm font-medium transition-all relative group"
                aria-label="Delete task"
                style={{fontFamily: 'var(--font-sans)'}}
                tabIndex={0}
              >
                <Trash2 className="w-5 h-5" aria-hidden="true" />
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 group-focus:opacity-100 bg-bg-700 text-text-100 text-xs rounded px-2 py-1 shadow-2 transition-opacity pointer-events-none z-10" role="tooltip">Delete</span>
              </button>
              <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                <GripVertical className="w-5 h-5 text-text-300" />
              </span>
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
