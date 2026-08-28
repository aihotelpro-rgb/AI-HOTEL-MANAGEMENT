'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface ThemeDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  label?: string;
  min?: string;
  max?: string;
  className?: string;
  placeholder?: string;
}

export default function ThemeDatePicker({
  value,
  onChange,
  label,
  min,
  max,
  className = '',
  placeholder = 'Select Date...'
}: ThemeDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Current view year & month state
  const initialDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(isNaN(initialDate.getTime()) ? new Date().getFullYear() : initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(isNaN(initialDate.getTime()) ? new Date().getMonth() : initialDate.getMonth());

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update view when value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const selectedDateStr = `${viewYear}-${monthStr}-${dayStr}`;
    onChange(selectedDateStr);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const monthStr = String(today.getMonth() + 1).padStart(2, '0');
    const dayStr = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${monthStr}-${dayStr}`;
    onChange(todayStr);
    setViewYear(year);
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  // Generate days matrix
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const prevMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => daysInPrevMonth - firstDayOfMonth + i + 1);
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalCells = prevMonthDays.length + currentMonthDays.length;
  const nextMonthDays = Array.from({ length: (42 - totalCells) % 7 }, (_, i) => i + 1);

  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

  const formattedDisplay = value ? (() => {
    const parts = value.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    return value;
  })() : placeholder;

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[10px] uppercase font-black text-amber-400/90 mb-1 tracking-wider">
          {label}
        </label>
      )}

      {/* Luxury Date Button / Input Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-neutral-950 border border-neutral-800 hover:border-amber-500/60 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-300 shadow-inner flex items-center justify-between gap-2 transition group"
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="h-4 w-4 text-amber-500 group-hover:scale-110 transition shrink-0" />
          <span className="truncate">{formattedDisplay}</span>
        </div>
        <span className="text-[10px] text-neutral-500 group-hover:text-amber-400 transition">📅</span>
      </button>

      {/* Custom Popover Calendar Modal */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-neutral-900 border border-neutral-800 rounded-3xl p-4 shadow-2xl w-72 animate-fadeIn text-xs">
          {/* Header Controls */}
          <div className="flex justify-between items-center pb-3 border-b border-neutral-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="h-7 w-7 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-neutral-300 flex items-center justify-center transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="font-extrabold text-white text-xs tracking-wide flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-400" />
              {monthNames[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="h-7 w-7 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-neutral-300 flex items-center justify-center transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 gap-1 py-2 text-center text-[10px] font-black text-neutral-500 uppercase tracking-wider">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono">
            {/* Previous Month Padding */}
            {prevMonthDays.map((d, i) => (
              <span key={`prev-${i}`} className="py-1.5 text-neutral-700 text-[11px] select-none">
                {d}
              </span>
            ))}

            {/* Current Month Days */}
            {currentMonthDays.map((day) => {
              const monthStr = String(viewMonth + 1).padStart(2, '0');
              const dayStr = String(day).padStart(2, '0');
              const cellDateStr = `${viewYear}-${monthStr}-${dayStr}`;
              const isSelected = value === cellDateStr;
              const isToday = cellDateStr === todayStr;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`py-1.5 rounded-xl font-bold transition flex items-center justify-center text-[11px] ${
                    isSelected
                      ? 'bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20 scale-105'
                      : isToday
                      ? 'border border-amber-500 text-amber-400 font-extrabold bg-amber-950/30'
                      : 'text-neutral-200 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  {day}
                </button>
              );
            })}

            {/* Next Month Padding */}
            {nextMonthDays.map((d, i) => (
              <span key={`next-${i}`} className="py-1.5 text-neutral-700 text-[11px] select-none">
                {d}
              </span>
            ))}
          </div>

          {/* Footer Shortcuts */}
          <div className="mt-3 pt-2.5 border-t border-neutral-800 flex justify-between items-center text-[11px]">
            <button
              type="button"
              onClick={handleSelectToday}
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold transition flex items-center gap-1"
            >
              ⚡ Select Today
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
