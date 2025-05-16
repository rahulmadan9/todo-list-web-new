"use client";
import { useEffect, useRef, useState, RefObject } from "react";
import Toast, { ToastType } from "./components/Toast";
import { Trash2, GripVertical, CheckCircle2 } from "lucide-react";

// Task type
interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  notes?: string;
  dueDate?: string; // ISO string
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
function isTomorrow(date: Date) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return date.getFullYear() === tomorrow.getFullYear() && date.getMonth() === tomorrow.getMonth() && date.getDate() === tomorrow.getDate();
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
      setMonth(today.getMonth());
      setYear(today.getFullYear());
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
        <button className="text-text-200 hover:text-text-100 px-2" onClick={prevMonth}>&lt;</button>
        <span className="text-text-100 font-medium">{new Date(year, month).toLocaleString(undefined, { month: 'long', year: 'numeric' })}</span>
        <button className="text-text-200 hover:text-text-100 px-2" onClick={nextMonth}>&gt;</button>
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
              className={`rounded-md w-8 h-8 flex items-center justify-center transition-colors ${isSelected ? 'bg-brand-500 text-bg-900' : isToday(d) ? 'border border-brand-500 text-brand-500' : 'hover:bg-bg-700 text-text-100'}`}
              onClick={() => { onChange(d.toISOString().slice(0,10)); setTimeout(onClose, 0); }}
            >{i+1}</button>
          );
        })}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; type: ToastType }>({ open: false, message: "", type: "info" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [dueDateInput, setDueDateInput] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showEditCalendarId, setShowEditCalendar] = useState<string | null>(null);

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
      { id: crypto.randomUUID(), title, completed: false, createdAt: Date.now(), notes: noteInput.trim(), dueDate: dueDateInput || undefined },
      ...tasks,
    ]);
    setInput("");
    setNoteInput("");
    setDueDateInput("");
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

  // Add function to start editing
  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditValue(task.title);
    setEditNote(task.notes || "");
    setEditDueDate(task.dueDate || "");
  }

  // Add function to save edit
  function saveEdit(id: string) {
    setTasks(tasks => tasks.map(t => t.id === id ? { ...t, title: editValue, notes: editNote, dueDate: editDueDate || undefined } : t));
    setEditingId(null);
    setEditValue("");
    setEditNote("");
    setEditDueDate("");
    setToast({ open: true, message: "Task updated!", type: "success" });
  }

  // Add function to cancel edit
  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
    setEditNote("");
    setEditDueDate("");
  }

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

  return (
    <div className="min-h-screen bg-bg-900 flex flex-col items-center py-16 px-4" dir="auto">
      <div className="w-full max-w-xl">
        <h1 className="text-4xl font-semibold mb-8 text-text-100 tracking-tight" style={{letterSpacing: '-0.25px'}}>To-Do List</h1>
        <form
          onSubmit={addTask}
          className="mb-8 w-full bg-bg-800 rounded-lg shadow-2 p-4 flex items-start gap-4 border border-border-600"
          aria-label="Add a new task"
        >
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
              onChange={e => setInput(e.target.value)}
              aria-label="Task title"
              style={{fontFamily: 'var(--font-sans)'}}
              dir="auto"
              rows={1}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  addTask(e);
                }
              }}
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
            />
            {/* Date pill and calendar dropdown */}
            <div className="relative flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                className="flex items-center gap-1 px-4 py-2 rounded-full bg-bg-900 border border-border-600 text-text-100 text-base font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                    className="ml-2 text-text-300 cursor-pointer hover:text-state-error"
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
                  onChange={date => setDueDateInput(date)}
                  onClose={() => setShowCalendar(false)}
                />
              )}
            </div>
          </div>
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
        <ol className="space-y-6" aria-label="Task list">
          {groupedTasks.length === 0 && (
            <li className="flex flex-col items-center justify-center py-16 bg-bg-800 rounded-lg shadow-2 text-text-200 text-lg font-medium select-none">
              <span className="mb-2">Add your first task</span>
              <span className="text-sm text-text-300">Stay organized and productive</span>
            </li>
          )}
          {groupedTasks.map(group => (
            <li key={group.key}>
              <div className="mb-2 text-accent-amber font-semibold text-base">{group.key}</div>
              <ol className="space-y-3">
                {group.tasks.map((task, idx) => (
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
                      if (e.key === "ArrowDown" && idx < group.tasks.length - 1) {
                        setFocusedIdx(idx + 1);
                      } else if (e.key === "ArrowUp" && idx > 0) {
                        setFocusedIdx(idx - 1);
                      }
                    }}
                    dir="auto"
                  >
                    <span className="flex items-center justify-center h-full mt-1">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id)}
                        className="w-5 h-5 accent-brand-500 rounded focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-all align-middle"
                        aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
                        role="checkbox"
                        aria-checked={task.completed}
                      />
                    </span>
                    {editingId === task.id ? (
                      <form
                        onSubmit={e => { e.preventDefault(); saveEdit(task.id); }}
                        className="w-full bg-bg-800 rounded-lg shadow-2 p-4 flex items-start gap-4 border border-border-600"
                      >
                        {/* Checkbox on the left */}
                        <span className="flex items-start pt-2">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleTask(task.id)}
                            className="w-6 h-6 rounded-full border-2 border-border-600 bg-bg-900 accent-brand-500 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-all align-middle"
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
                            onChange={e => setEditValue(e.target.value)}
                            aria-label="Edit task title"
                            style={{fontFamily: 'var(--font-sans)'}}
                            dir="auto"
                            rows={1}
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
                              className="flex items-center gap-1 px-4 py-2 rounded-full bg-bg-900 border border-border-600 text-text-100 text-base font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                                  className="ml-2 text-text-300 cursor-pointer hover:text-state-error"
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
                                onChange={date => setEditDueDate(date)}
                                onClose={() => setShowEditCalendar(null)}
                              />
                            )}
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button type="submit" className="px-4 py-2 rounded-md bg-brand-500 text-bg-900 font-medium">Save</button>
                            <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded-md bg-bg-700 text-text-200">Cancel</button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <div className="flex-1 flex flex-col">
                        <span className={`text-lg select-text ${task.completed ? "line-through text-text-300" : "text-text-100"}`} style={{fontFamily: 'var(--font-sans)'}}>{task.title}</span>
                        {task.notes && <span className="text-sm text-text-300 mt-1 whitespace-pre-line">{task.notes}</span>}
                        {task.dueDate && <span className="text-xs text-accent-amber mt-1">Due: {task.dueDate}</span>}
                      </div>
                    )}
                    {task.completed && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-state-success text-bg-900 ml-2" role="status">Done</span>
                    )}
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="ml-2 px-3 py-1 rounded-full bg-transparent text-state-error hover:bg-state-error hover:text-bg-900 focus:outline-none focus:ring-2 focus:ring-state-error focus:ring-offset-2 focus:ring-offset-bg-900 text-sm font-medium transition-all relative group"
                      aria-label="Delete task"
                      style={{fontFamily: 'var(--font-sans)'}}
                      tabIndex={0}
                    >
                      <Trash2 className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => startEdit(task)}
                      className="ml-2 px-3 py-1 rounded-full bg-bg-700 text-text-200 hover:bg-bg-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium transition-all"
                      aria-label="Edit task"
                      tabIndex={0}
                      disabled={editingId !== null}
                    >
                      Edit
                    </button>
                    <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                      <GripVertical className="w-5 h-5 text-text-300" />
                    </span>
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
