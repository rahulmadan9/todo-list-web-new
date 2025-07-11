"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import CalendarDropdown from "./CalendarDropdown";

interface TaskFormProps {
  onSubmit: (taskData: { title: string; notes: string; dueDate: string }) => void;
  loading?: boolean;
  className?: string;
}

const TaskForm: React.FC<TaskFormProps> = React.memo(({ 
  onSubmit, 
  loading = false, 
  className = "" 
}) => {
  // Form state
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [input, setInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [dueDateInput, setDueDateInput] = useState("");
  const [taskRows, setTaskRows] = useState(1);
  const [showCalendar, setShowCalendar] = useState(false);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when creating a new task
  useEffect(() => {
    if (showCreateTask && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCreateTask]);

  // Check if task creation should be allowed
  const canCreateTask = useCallback(() => {
    const titleHasContent = input.trim().length > 0;
    const notesHasContent = noteInput.trim().length > 0;
    const hasDate = dueDateInput.length > 0;
    
    // Allow creation if any field has actual content (not just spaces)
    return titleHasContent || notesHasContent || hasDate;
  }, [input, noteInput, dueDateInput]);

  // Start creating a new task
  const startCreateTask = useCallback(() => {
    setShowCreateTask(true);
    setInput("");
    setNoteInput("");
    setDueDateInput("");
    setTaskRows(1);
  }, []);

  // Cancel creating a new task
  const cancelCreateTask = useCallback(() => {
    setShowCreateTask(false);
    setInput("");
    setNoteInput("");
    setDueDateInput("");
    setTaskRows(1);
  }, []);

  // Handle task input change and auto-resize
  const handleTaskInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Auto-resize based on content
    const lines = e.target.value.split('\n').length;
    setTaskRows(Math.max(1, lines));
  }, []);

  // Handle key down events for task creation
  const handleTaskKeyDown = useCallback((e: React.KeyboardEvent, isDescriptionField = false) => {
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
          handleSubmit(e as React.FormEvent);
        }
        return;
      }
    }
  }, [input, canCreateTask]);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const title = input.trim();
    
    if (!canCreateTask()) return;

    const taskData = {
      title,
      notes: noteInput.trim(),
      dueDate: dueDateInput
    };

    onSubmit(taskData);
    
    // Reset form
    setInput("");
    setNoteInput("");
    setDueDateInput("");
    setTaskRows(1);
    setShowCreateTask(false);
  }, [input, noteInput, dueDateInput, canCreateTask, onSubmit]);

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

  return (
    <div className={`mb-8 ${className}`}>
      {!showCreateTask ? (
        // CTA Button
        <button
          onClick={startCreateTask}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-3 bg-transparent hover:bg-bg-700 active:bg-bg-600 border border-border-600 rounded-lg shadow-2 p-6 text-text-200 hover:text-text-100 font-medium transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none focus:ring-2 focus:ring-brand-500 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          aria-label="Create a new task"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {loading ? 'Creating...' : 'Add new task'}
        </button>
      ) : (
        // Task Creation Form
        <form
          onSubmit={handleSubmit}
          className="w-full bg-bg-800 rounded-lg shadow-2 p-4 border border-border-600"
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
              {/* Title textarea */}
              <textarea
                id="task-title"
                ref={inputRef}
                className="w-full bg-transparent border-none outline-none text-lg text-text-100 placeholder-text-300 font-medium resize-none focus:ring-0 focus:outline-none"
                placeholder="Task"
                value={input}
                onChange={handleTaskInputChange}
                onKeyDown={e => handleTaskKeyDown(e)}
                aria-label="Task title"
                style={{ fontFamily: 'var(--font-sans)' }}
                dir="auto"
                rows={taskRows}
                disabled={loading}
              />

              {/* Notes textarea */}
              <textarea
                className="w-full bg-transparent border-none outline-none text-base text-text-100 placeholder-text-300 font-normal resize-none focus:ring-0 focus:outline-none mt-1"
                placeholder="Description"
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => handleTaskKeyDown(e, true)}
                aria-label="Task description"
                style={{ fontFamily: 'var(--font-sans)' }}
                dir="auto"
                rows={2}
                disabled={loading}
              />

              {/* Date picker */}
              <div className="relative flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  className="flex items-center gap-1 px-4 py-2 rounded-full bg-transparent border border-border-600 text-text-100 text-base font-medium cursor-pointer hover:bg-bg-700 active:bg-bg-600 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setShowCalendar(true)}
                  disabled={loading}
                >
                  {dueDateInput ? formatDueDate(dueDateInput) : 'Add date'}
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
              
              {/* Action buttons */}
              <div className="flex gap-2 mt-4">
                <button 
                  type="submit" 
                  className={`px-4 py-2 rounded-md font-medium transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 ${
                    canCreateTask() && !loading
                      ? "bg-brand-500 text-bg-900 hover:bg-brand-600 active:bg-brand-700" 
                      : "bg-bg-700 text-text-300 cursor-not-allowed opacity-50"
                  }`}
                  disabled={!canCreateTask() || loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button 
                  type="button" 
                  onClick={cancelCreateTask}
                  className="px-4 py-2 rounded-md bg-transparent text-text-200 border border-border-600 hover:bg-bg-700 active:bg-bg-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
});

TaskForm.displayName = 'TaskForm';

export default TaskForm;