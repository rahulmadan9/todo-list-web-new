"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

interface CalendarDropdownProps {
  value?: string;
  onChange: (date: string) => void;
  onClose: () => void;
  className?: string;
}

// Calendar utility functions
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatDateForInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const CalendarDropdown: React.FC<CalendarDropdownProps> = React.memo(({ 
  value, 
  onChange, 
  onClose, 
  className = "" 
}) => {
  const today = new Date();
  const [month, setMonth] = useState(value ? new Date(value).getMonth() : today.getMonth());
  const [year, setYear] = useState(value ? new Date(value).getFullYear() : today.getFullYear());
  const ref = useRef<HTMLDivElement>(null);

  // Update month and year when value changes
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

  // Handle clicks outside the calendar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const prevMonth = useCallback(() => {
    if (month === 0) {
      setMonth(11);
      setYear(prevYear => prevYear - 1);
    } else {
      setMonth(prevMonth => prevMonth - 1);
    }
  }, [month]);

  const nextMonth = useCallback(() => {
    if (month === 11) {
      setMonth(0);
      setYear(prevYear => prevYear + 1);
    } else {
      setMonth(prevMonth => prevMonth + 1);
    }
  }, [month]);

  const handleDateClick = useCallback((day: number) => {
    const selectedDate = new Date(year, month, day);
    onChange(formatDateForInput(selectedDate));
  }, [year, month, onChange]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const selected = value ? new Date(value) : undefined;

  return (
    <div 
      ref={ref} 
      className={`absolute z-50 mt-2 border border-border-600 rounded-lg shadow-2 p-4 backdrop-blur bg-[rgba(20,23,32,0.85)] ${className}`}
      style={{ minWidth: 260 }}
    >
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-2">
        <button 
          type="button"
          className="text-text-200 hover:text-text-100 active:text-text-100 hover:bg-bg-800 active:bg-bg-700 px-2 py-1 rounded transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]" 
          onClick={prevMonth}
          aria-label="Previous month"
        >
          &lt;
        </button>
        
        <span className="text-text-100 font-medium">
          {new Date(year, month).toLocaleString(undefined, { 
            month: 'long', 
            year: 'numeric' 
          })}
        </span>
        
        <button 
          type="button"
          className="text-text-200 hover:text-text-100 active:text-text-100 hover:bg-bg-800 active:bg-bg-700 px-2 py-1 rounded transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]" 
          onClick={nextMonth}
          aria-label="Next month"
        >
          &gt;
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-text-200 text-sm mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
          <div key={day} className="font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before month start */}
        {Array(firstDay).fill(null).map((_, i) => (
          <div key={`empty-${i}`} className="w-8 h-8" />
        ))}

        {/* Days of the month */}
        {Array(daysInMonth).fill(null).map((_, i) => {
          const day = i + 1;
          const date = new Date(year, month, day);
          const isSelected = selected && date.toDateString() === selected.toDateString();
          const isTodayDate = isToday(date);

          return (
            <button
              key={day}
              type="button"
              className={`rounded-md w-8 h-8 flex items-center justify-center text-sm font-medium transition-colors duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                isSelected 
                  ? 'bg-brand-500 text-bg-900 hover:bg-brand-600 active:bg-brand-700' 
                  : isTodayDate 
                    ? 'border border-brand-500 text-brand-500 hover:bg-bg-700 active:bg-bg-600' 
                    : 'hover:bg-bg-800 active:bg-bg-700 text-text-100'
              }`}
              onClick={() => handleDateClick(day)}
              aria-label={`Select ${date.toLocaleDateString()}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
});

CalendarDropdown.displayName = 'CalendarDropdown';

export default CalendarDropdown;