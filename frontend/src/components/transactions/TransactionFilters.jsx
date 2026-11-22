import React from 'react';
import { Search, RotateCcw, Filter, Calendar, DollarSign, ArrowUpDown, Layers } from 'lucide-react';

export const TransactionFilters = ({
  filters,
  categories = [],
  onFilterChange,
  onResetFilters,
  virtualizedMode,
  onToggleVirtualized,
}) => {
  // Filter category dropdown options based on selected type if specified
  const filteredCategories = filters.type
    ? categories.filter((c) => c.type === filters.type)
    : categories;

  return (
    <div className="filters-container card">
      <div className="filters-header">
        <div className="filters-title">
          <Filter size={18} />
          <span>Filters & Controls</span>
        </div>
        <div className="filters-actions">
          <button
            type="button"
            className={`btn btn-sm ${virtualizedMode ? 'btn-primary' : 'btn-outline'}`}
            onClick={onToggleVirtualized}
            title="Toggle virtual scrolling mode for up to 1000 items"
          >
            <Layers size={15} />
            <span>{virtualizedMode ? 'Virtualized Mode (Active)' : 'Show all (virtualized)'}</span>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline text-muted"
            onClick={onResetFilters}
            title="Reset all filters"
          >
            <RotateCcw size={15} />
            <span>Clear filters</span>
          </button>
        </div>
      </div>

      <div className="filters-grid">
        {/* Search Input */}
        <div className="filter-item search-filter">
          <label htmlFor="search-input">Search Description</label>
          <div className="input-with-icon">
            <Search size={16} className="input-icon" />
            <input
              id="search-input"
              type="text"
              className="input-field"
              placeholder="Search description or category..."
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
            />
          </div>
        </div>

        {/* Type Filter */}
        <div className="filter-item">
          <label htmlFor="type-select">Type</label>
          <select
            id="type-select"
            className="input-field"
            value={filters.type}
            onChange={(e) =>
              onFilterChange({
                type: e.target.value,
                // Clear category if it doesn't match new type
                categoryId: '',
              })
            }
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="filter-item">
          <label htmlFor="category-select">Category</label>
          <select
            id="category-select"
            className="input-field"
            value={filters.categoryId}
            onChange={(e) => onFilterChange({ categoryId: e.target.value })}
          >
            <option value="">All Categories</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
        </div>

        {/* Date Range: Start Date */}
        <div className="filter-item">
          <label htmlFor="start-date-input">Start Date</label>
          <div className="input-with-icon">
            <Calendar size={16} className="input-icon" />
            <input
              id="start-date-input"
              type="date"
              className="input-field"
              value={filters.startDate}
              onChange={(e) => onFilterChange({ startDate: e.target.value })}
            />
          </div>
        </div>

        {/* Date Range: End Date */}
        <div className="filter-item">
          <label htmlFor="end-date-input">End Date</label>
          <div className="input-with-icon">
            <Calendar size={16} className="input-icon" />
            <input
              id="end-date-input"
              type="date"
              className="input-field"
              value={filters.endDate}
              onChange={(e) => onFilterChange({ endDate: e.target.value })}
            />
          </div>
        </div>

        {/* Min Amount */}
        <div className="filter-item">
          <label htmlFor="min-amount-input">Min Amount ($)</label>
          <div className="input-with-icon">
            <DollarSign size={16} className="input-icon" />
            <input
              id="min-amount-input"
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              placeholder="0.00"
              value={filters.minAmount}
              onChange={(e) => onFilterChange({ minAmount: e.target.value })}
            />
          </div>
        </div>

        {/* Max Amount */}
        <div className="filter-item">
          <label htmlFor="max-amount-input">Max Amount ($)</label>
          <div className="input-with-icon">
            <DollarSign size={16} className="input-icon" />
            <input
              id="max-amount-input"
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              placeholder="Any"
              value={filters.maxAmount}
              onChange={(e) => onFilterChange({ maxAmount: e.target.value })}
            />
          </div>
        </div>

        {/* Sort Selector */}
        <div className="filter-item">
          <label htmlFor="sort-select">Sort By</label>
          <div className="input-with-icon">
            <ArrowUpDown size={16} className="input-icon" />
            <select
              id="sort-select"
              className="input-field"
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                onFilterChange({ sortBy, sortOrder });
              }}
            >
              <option value="date-desc">Date (Newest first)</option>
              <option value="date-asc">Date (Oldest first)</option>
              <option value="amount-desc">Amount (Highest first)</option>
              <option value="amount-asc">Amount (Lowest first)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionFilters;
