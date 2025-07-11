"use client";
import React, { Fragment, useMemo } from "react";
import { Task } from "../lib/firestore";
import LoadingSpinner from "./LoadingSpinner";

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  editingId: string | null;
  draggedTaskId: string | null;
  dropTargetId: string | null;
  dropPosition: 'above' | 'below' | null;
  isDragActive: boolean;
  onTaskEdit: (task: Task) => void;
  onTaskToggle: (id: string) => void;
  onTaskDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent<HTMLSpanElement>, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragEnter: (e: React.DragEvent<HTMLLIElement>, id: string) => void;
  onDragLeave: (e: React.DragEvent<HTMLLIElement>) => void;
  onDrop: (e: React.DragEvent<HTMLLIElement>, dropId: string) => void;
  onSetTaskRef: (taskId: string, element: HTMLElement | null) => void;
  renderTaskItem: (task: Task, index: number) => React.ReactNode;
  className?: string;
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

const TaskList: React.FC<TaskListProps> = React.memo(({
  tasks,
  loading,
  editingId,
  draggedTaskId,
  dropTargetId,
  dropPosition,
  isDragActive,
  onTaskEdit,
  onTaskToggle,
  onTaskDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onSetTaskRef,
  renderTaskItem,
  className = ""
}) => {
  const groupedTasks = useMemo(() => groupTasksByDueDate(tasks), [tasks]);

  // Loading state
  if (loading) {
    return (
      <ol className={`space-y-6 relative ${className}`} aria-label="Task list">
        <li className="flex justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" className="text-brand-500" />
            <div className="text-text-200">Loading tasks...</div>
          </div>
        </li>
      </ol>
    );
  }

  // Empty state
  if (groupedTasks.length === 0) {
    return (
      <ol className={`space-y-6 relative ${className}`} aria-label="Task list">
        <li className="flex flex-col items-center justify-center py-16 bg-bg-800 rounded-lg shadow-2 text-text-200 text-lg font-medium select-none">
          <span className="mb-2">Add your first task</span>
          <span className="text-sm text-text-300">Stay organized and productive</span>
        </li>
      </ol>
    );
  }

  return (
    <ol 
      className={`space-y-6 relative ${className}`} 
      aria-label="Task list"
      style={{
        isolation: 'isolate',
        overflow: 'visible',
        minHeight: '200px',
        paddingTop: '8px',
        paddingBottom: '8px'
      }}
    >
      {groupedTasks.map(group => (
        <li key={group.key}>
          {/* Group header */}
          <div className="mb-2 text-accent-amber font-semibold text-base">
            {group.key}
          </div>
          
          {/* Tasks in group */}
          <ol className={`transition-all duration-300 ease-out ${isDragActive ? 'space-y-4' : 'space-y-3'}`}>
            {group.tasks.map((task, idx) => (
              <Fragment key={task.id}>
                {/* Drop zone indicator above task */}
                {isDragActive && dropTargetId === task.id && dropPosition === 'above' && (
                  <li className="h-1 bg-brand-500 rounded-full mx-4 shadow-lg shadow-brand-500/50 transition-all duration-300 ease-out relative">
                    <div className="absolute inset-0 bg-brand-500 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 bg-brand-500/30 rounded-full scale-150 animate-ping"></div>
                  </li>
                )}
                
                {/* Task item */}
                <li
                  ref={(el) => onSetTaskRef(task.id, el)}
                  className={`${editingId === task.id 
                    ? "bg-bg-800 min-h-[56px] rounded-lg shadow-2 p-4 border border-border-600" 
                    : `flex items-center gap-3 bg-bg-800 min-h-[56px] rounded-lg shadow-2 px-4 py-3 group transition-all duration-300 ease-out ${
                        draggedTaskId === task.id 
                          ? 'opacity-30 scale-[0.98] blur-sm' 
                          : dropTargetId === task.id && dropPosition 
                            ? `scale-[1.02] shadow-xl border-2 border-brand-500/30 ${
                                dropPosition === 'above' 
                                  ? 'translate-y-4 mb-4' 
                                  : '-translate-y-4 mt-4'
                              }` 
                            : ''
                      }`
                  }`}
                  onDragOver={onDragOver}
                  onDragEnter={e => onDragEnter(e, task.id)}
                  onDragLeave={onDragLeave}
                  onDrop={e => onDrop(e, task.id)}
                  tabIndex={0}
                  aria-label={task.title}
                  dir="auto"
                >
                  {renderTaskItem(task, idx)}
                </li>
                
                {/* Drop zone indicator below task */}
                {isDragActive && dropTargetId === task.id && dropPosition === 'below' && (
                  <li className="h-1 bg-brand-500 rounded-full mx-4 shadow-lg shadow-brand-500/50 transition-all duration-300 ease-out relative">
                    <div className="absolute inset-0 bg-brand-500 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 bg-brand-500/30 rounded-full scale-150 animate-ping"></div>
                  </li>
                )}
              </Fragment>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
});

TaskList.displayName = 'TaskList';

export default TaskList;