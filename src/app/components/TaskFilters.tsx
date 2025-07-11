"use client";
import React, { useCallback } from "react";

export type Filter = "all" | "active" | "completed";

interface TaskFiltersProps {
  currentFilter: Filter;
  onFilterChange: (filter: Filter) => void;
  className?: string;
}

const filterOptions: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" }
];

const TaskFilters: React.FC<TaskFiltersProps> = React.memo(({ 
  currentFilter, 
  onFilterChange, 
  className = "" 
}) => {
  const handleFilterClick = useCallback((filter: Filter) => {
    onFilterChange(filter);
  }, [onFilterChange]);

  return (
    <div 
      className={`flex gap-2 ${className}`}
      role="tablist" 
      aria-label="Task filters"
    >
      {filterOptions.map(option => (
        <button
          key={option.value}
          className={`px-4 py-2 rounded-full font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
            currentFilter === option.value 
              ? "bg-brand-500 text-bg-900 hover:bg-brand-600 active:bg-brand-700" 
              : "text-text-200 hover:bg-bg-800 active:bg-bg-700"
          }`}
          onClick={() => handleFilterClick(option.value)}
          aria-pressed={currentFilter === option.value}
          role="tab"
          aria-selected={currentFilter === option.value}
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
});

TaskFilters.displayName = 'TaskFilters';

export default TaskFilters;