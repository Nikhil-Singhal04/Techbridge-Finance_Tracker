import React from 'react';
import { Calendar, RefreshCw, Zap, Database, BarChart3, CalendarDays } from 'lucide-react';

const MONTHS = [
  { value: '', label: 'Whole year (12 months)' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export const DashboardControls = ({
  year,
  month,
  viewMode, // 'monthly' | 'yearly'
  cacheStatus, // 'HIT' | 'MISS' | null
  onYearChange,
  onMonthChange,
  onViewModeChange,
  onRefresh,
  loading = false,
  availableYears = [2026, 2025, 2024],
}) => {
  const isCached = cacheStatus === 'HIT';

  return (
    <div className="card dashboard-controls-bar">
      <div className="controls-left">
        {/* View Mode Toggle: Monthly / Yearly */}
        <div className="view-mode-toggle">
          <button
            type="button"
            className={`toggle-tab ${viewMode === 'monthly' ? 'active' : ''}`}
            onClick={() => onViewModeChange('monthly')}
          >
            <CalendarDays size={15} />
            <span>Monthly View</span>
          </button>
          <button
            type="button"
            className={`toggle-tab ${viewMode === 'yearly' ? 'active' : ''}`}
            onClick={() => onViewModeChange('yearly')}
          >
            <BarChart3 size={15} />
            <span>Yearly View</span>
          </button>
        </div>

        {/* Year Selector */}
        <div className="control-select-group">
          <label htmlFor="year-select">Year</label>
          <select
            id="year-select"
            className="input-field control-select"
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Month Selector (active in monthly view) */}
        {viewMode === 'monthly' && (
          <div className="control-select-group">
            <label htmlFor="month-select">Period</label>
            <select
              id="month-select"
              className="input-field control-select"
              value={month}
              onChange={(e) => onMonthChange(e.target.value)}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="controls-right">
        {/* Cache Indicator Badge */}
        {cacheStatus && (
          <div
            className={`cache-badge ${isCached ? 'cache-hit' : 'cache-miss'}`}
            title={`Redis caching status for this view: ${cacheStatus}`}
          >
            {isCached ? <Zap size={14} /> : <Database size={14} />}
            <span>{isCached ? 'Cached (Redis)' : 'Fresh (Database)'}</span>
          </div>
        )}

        {/* Refresh Button */}
        <button
          type="button"
          className="btn btn-outline btn-sm refresh-btn"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh analytics data"
        >
          <RefreshCw size={14} className={loading ? 'spinner-inline' : ''} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
};

export default DashboardControls;
