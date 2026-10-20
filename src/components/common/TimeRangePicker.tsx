import React, { useState, useEffect } from 'react';
import { Calendar, ArrowRight, X } from 'lucide-react';

interface TimeRangePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
}

// Convert YYYY-MM-DD to DD/MM/YYYY
function formatToDMY(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

// Convert DD/MM/YYYY to YYYY-MM-DD for <input type="date">
function parseDMYToISO(dmyStr: string): string {
  if (!dmyStr) return '';
  const match = dmyStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return '';
  const [, d, m, y] = match;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// Parse value string like "Từ ngày 15/10/2026 đến ngày 20/12/2026" or "2026-10-15"
function parseRangeValue(val: string): { start: string; end: string } {
  if (!val) return { start: '', end: '' };

  // Look for two dates dd/mm/yyyy
  const dates = val.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g);
  if (dates && dates.length >= 2) {
    return {
      start: parseDMYToISO(dates[0]),
      end: parseDMYToISO(dates[1]),
    };
  }
  if (dates && dates.length === 1) {
    return {
      start: parseDMYToISO(dates[0]),
      end: '',
    };
  }

  // Look for ISO dates YYYY-MM-DD
  const isoDates = val.match(/\b\d{4}-\d{2}-\d{2}\b/g);
  if (isoDates && isoDates.length >= 2) {
    return { start: isoDates[0], end: isoDates[1] };
  }
  if (isoDates && isoDates.length === 1) {
    return { start: isoDates[0], end: '' };
  }

  return { start: '', end: '' };
}

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  value,
  onChange,
  hasError = false,
}) => {
  const [startDate, setStartDate] = useState<string>(() => parseRangeValue(value).start);
  const [endDate, setEndDate] = useState<string>(() => parseRangeValue(value).end);

  // Sync with incoming value if changed from outside
  useEffect(() => {
    const parsed = parseRangeValue(value);
    setStartDate(parsed.start);
    setEndDate(parsed.end);
  }, [value]);

  const updateRange = (newStart: string, newEnd: string) => {
    setStartDate(newStart);
    setEndDate(newEnd);

    if (newStart && newEnd) {
      onChange(`Từ ngày ${formatToDMY(newStart)} đến ngày ${formatToDMY(newEnd)}`);
    } else if (newStart) {
      onChange(`Từ ngày ${formatToDMY(newStart)}`);
    } else if (newEnd) {
      onChange(`Đến ngày ${formatToDMY(newEnd)}`);
    } else {
      onChange('');
    }
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateRange(e.target.value, endDate);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateRange(startDate, e.target.value);
  };

  const handleClear = () => {
    updateRange('', '');
  };

  return (
    <div className="space-y-1.5 w-full">
      {/* 2 Clean Date Pickers */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        {/* Start Date */}
        <div className="flex-1">
          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-xs font-semibold text-slate-500 select-none pointer-events-none">
              Từ:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={handleStartChange}
              className={`w-full pl-9 pr-3 py-1.5 text-xs font-medium border rounded-md text-slate-900 bg-white focus:outline-none focus:ring-1 transition-colors ${
                hasError
                  ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/20'
                  : 'border-slate-300 hover:border-slate-400 focus:ring-blue-600 focus:border-blue-600'
              }`}
            />
          </div>
        </div>

        {/* Arrow separator */}
        <div className="hidden sm:flex items-center justify-center text-slate-400">
          <ArrowRight className="w-3.5 h-3.5" />
        </div>

        {/* End Date */}
        <div className="flex-1">
          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-xs font-semibold text-slate-500 select-none pointer-events-none">
              Đến:
            </span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={handleEndChange}
              className={`w-full pl-11 pr-3 py-1.5 text-xs font-medium border rounded-md text-slate-900 bg-white focus:outline-none focus:ring-1 transition-colors ${
                hasError
                  ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/20'
                  : 'border-slate-300 hover:border-slate-400 focus:ring-blue-600 focus:border-blue-600'
              }`}
            />
          </div>
        </div>

        {/* Clear Button */}
        {(startDate || endDate || value) && (
          <button
            type="button"
            onClick={handleClear}
            className="self-center p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            title="Xóa khoảng thời gian"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Formatted Text Preview */}
      {value && (
        <div className="flex items-center gap-1.5 text-[11px] text-blue-700 bg-blue-50/60 border border-blue-100 px-2.5 py-1 rounded-md">
          <Calendar className="w-3.5 h-3.5 shrink-0 text-blue-600" />
          <span className="font-medium truncate">{value}</span>
        </div>
      )}
    </div>
  );
};
