"use client";
import React, { useState, useCallback, useEffect } from "react";
import { Trash2, GripVertical } from "lucide-react";
import { Task } from "../lib/firestore";
import CalendarDropdown from "./CalendarDropdown";

interface TaskItemProps {
  task: Task;
  isEditing: boolean;
  isDragging: boolean;
  editingDisabled: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onStartEdit: (task: Task) => void;
  onSaveEdit: (id: string, updates: { title: string; notes?: string; dueDate?: string }) => void;
  onCancelEdit: () => void;
  onDragStart: (e: React.DragEvent<HTMLSpanElement>, id: string) => void;
  onDragEnd: () => void;
  className?: string;
}

const TaskItem: React.FC<TaskItemProps> = React.memo(({
  task,
  isEditing,
  isDragging,
  editingDisabled,
  onToggle,
  onDelete,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDragStart,
  onDragEnd,
  className = ""
}) => {
  // Edit state
  const [editValue, setEditValue] = useState(task.title);
  const [editNote, setEditNote] = useState(task.notes || "");
  const [editDueDate, setEditDueDate] = useState(task.dueDate || "");
  const [editTaskRows, setEditTaskRows] = useState(1);
  const [showEditCalendar, setShowEditCalendar] = useState(false);

  // Update edit state when task or editing state changes
  useEffect(() => {
    if (isEditing) {
      setEditValue(task.title);
      setEditNote(task.notes || "");
      setEditDueDate(task.dueDate || "");
      setEditTaskRows(Math.max(1, task.title.split('\n').length));
    }
  }, [isEditing, task]);

  // Handle edit task input change and auto-resize
  const handleEditTaskInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value);
    
    // Auto-resize based on content
    const lines = e.target.value.split('\n').length;
    setEditTaskRows(Math.max(1, lines));
  }, []);

  // Handle key down events for edit task
  const handleEditTaskKeyDown = useCallback((e: React.KeyboardEvent) => {
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
    }
  }, [editValue]);

  // Handle save edit
  const handleSaveEdit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSaveEdit(task.id, {
      title: editValue,
      notes: editNote || undefined,
      dueDate: editDueDate || undefined
    });
  }, [task.id, editValue, editNote, editDueDate, onSaveEdit]);

  // Handle toggle
  const handleToggle = useCallback(() => {
    onToggle(task.id);
  }, [task.id, onToggle]);

  // Handle delete
  const handleDelete = useCallback(() => {
    onDelete(task.id);
  }, [task.id, onDelete]);

  // Handle start edit
  const handleStartEdit = useCallback(() => {
    onStartEdit(task);
  }, [task, onStartEdit]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent<HTMLSpanElement>) => {
    onDragStart(e, task.id);
  }, [task.id, onDragStart]);

  // Format due date display
  const formatDueDate = useCallback((dateStr: string) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const selected = new Date(dateStr);
    
    if (selected.toDateString() === today.toDateString()) return 'Today';
    if (selected.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return selected.toLocaleDateString();
  }, []);

  if (isEditing) {
    return (
      <form
        onSubmit={handleSaveEdit}
        className={`flex items-start gap-4 w-full ${className}`}
      >
        {/* Checkbox on the left */}
        <span className="flex items-start pt-2">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={handleToggle}
            className="w-6 h-6 rounded-full border-2 border-border-600 bg-bg-900 accent-brand-500 hover:border-brand-500 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-all align-middle cursor-pointer"
            aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
            role="checkbox"
            aria-checked={task.completed}
          />
        </span>

        {/* Main content */}
        <div className="flex-1 flex flex-col gap-1">
          {/* Title textarea */}
          <textarea
            className="w-full bg-transparent border-none outline-none text-lg text-text-100 placeholder-text-300 font-medium resize-none focus:ring-0 focus:outline-none"
            placeholder="Task"
            value={editValue}
            onChange={handleEditTaskInputChange}
            onKeyDown={handleEditTaskKeyDown}
            aria-label="Edit task title"
            style={{ fontFamily: 'var(--font-sans)' }}
            dir="auto"
            rows={editTaskRows}
            autoFocus
          />

          {/* Notes textarea */}
          <textarea
            className="w-full bg-transparent border-none outline-none text-base text-text-100 placeholder-text-300 font-normal resize-none focus:ring-0 focus:outline-none mt-1"
            placeholder="Description"
            value={editNote}
            onChange={e => setEditNote(e.target.value)}
            aria-label="Edit task description"
            style={{ fontFamily: 'var(--font-sans)' }}
            dir="auto"
            rows={2}
          />

          {/* Date picker */}
          <div className="relative flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              className="flex items-center gap-1 px-4 py-2 rounded-full bg-transparent border border-border-600 text-text-100 text-base font-medium cursor-pointer hover:bg-bg-700 active:bg-bg-600 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
              onClick={() => setShowEditCalendar(true)}
            >
              {editDueDate ? formatDueDate(editDueDate) : 'Add date'}
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
            
            {showEditCalendar && (
              <CalendarDropdown
                value={editDueDate}
                onChange={date => { setEditDueDate(date); setShowEditCalendar(false); }}
                onClose={() => setShowEditCalendar(false)}
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            <button 
              type="submit" 
              className="px-4 py-2 rounded-md bg-brand-500 text-bg-900 font-medium hover:bg-brand-600 active:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            >
              Save
            </button>
            <button 
              type="button" 
              onClick={onCancelEdit}
              className="px-4 py-2 rounded-md bg-transparent text-text-200 border border-border-600 hover:bg-bg-700 active:bg-bg-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Delete button in edit mode */}
        <button
          type="button"
          onClick={handleDelete}
          className="ml-2 p-2 rounded-full text-text-200 hover:bg-state-error hover:text-text-100 active:brightness-90 focus:outline-none focus:ring-2 focus:ring-state-error focus:ring-offset-2 focus:ring-offset-bg-800 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          aria-label="Delete task"
        >
          <Trash2 className="w-5 h-5" aria-hidden="true" />
        </button>
      </form>
    );
  }

  // Display mode
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Checkbox */}
      <span className="flex items-center justify-center h-full mt-1">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={handleToggle}
          className="w-5 h-5 accent-brand-500 rounded hover:border-brand-500 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-all align-middle cursor-pointer"
          aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
          role="checkbox"
          aria-checked={task.completed}
        />
      </span>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <span 
          className={`text-lg select-text ${task.completed ? "line-through text-text-300" : "text-text-100"}`} 
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {task.title}
        </span>
        
        {task.notes && (
          <span className="text-sm text-text-300 mt-1 whitespace-pre-line">
            {task.notes}
          </span>
        )}
        
        {task.dueDate && (
          <span className="text-xs text-accent-amber mt-1">
            Due: {task.dueDate}
          </span>
        )}
      </div>

      {/* Status badge */}
      {task.completed && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-state-success text-bg-900 ml-2" role="status">
          Done
        </span>
      )}

      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="ml-2 p-2 rounded-full text-text-200 opacity-0 group-hover:opacity-100 hover:bg-state-error hover:text-text-100 active:brightness-90 focus:outline-none focus:ring-2 focus:ring-state-error focus:ring-offset-2 focus:ring-offset-bg-800 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        aria-label="Delete task"
      >
        <Trash2 className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* Edit button */}
      <button
        onClick={handleStartEdit}
        className={`ml-2 px-3 py-1 rounded-full text-sm font-medium transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none focus:ring-2 focus:ring-brand-500 ${
          editingDisabled 
            ? "bg-bg-800 text-text-300 border border-border-600 cursor-not-allowed opacity-50" 
            : "bg-transparent text-text-200 border border-border-600 hover:bg-bg-700 active:bg-bg-600"
        }`}
        aria-label="Edit task"
        disabled={editingDisabled}
      >
        Edit
      </button>

      {/* Drag handle */}
      <span 
        className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing select-none" 
        draggable={!editingDisabled}
        onDragStart={!editingDisabled ? handleDragStart : undefined}
        onDragEnd={onDragEnd}
        aria-label="Drag to reorder task"
        title="Drag to reorder"
        style={{
          touchAction: 'none',
          userSelect: 'none'
        }}
      >
        <GripVertical className="w-5 h-5 text-text-300 hover:text-text-100 transition-colors" />
      </span>
    </div>
  );
});

TaskItem.displayName = 'TaskItem';

export default TaskItem;