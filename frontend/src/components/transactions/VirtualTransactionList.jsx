import React, { memo } from 'react';
import { FixedSizeList as List, areEqual } from 'react-window';
import { Eye, Edit2, Trash2 } from 'lucide-react';

const formatCurrency = (amount, type) => {
  const num = parseFloat(amount) || 0;
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);

  return type === 'income' ? `+${formatted}` : `-${formatted}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return dateStr;
};

// Virtualized single row renderer with consistent height
const VirtualRow = memo(({ index, style, data }) => {
  const { items, onEdit, onDelete, onView, canWrite } = data;
  const item = items[index];
  if (!item) return null;

  const isIncome = item.type === 'income';

  return (
    <div style={style} className="virtual-row">
      <div className="v-col v-col-date text-muted">
        {formatDate(item.transaction_date || item.transactionDate)}
      </div>
      <div className="v-col v-col-desc" title={item.description}>
        {item.description || 'No description'}
      </div>
      <div className="v-col v-col-category">
        <span className="category-pill">{item.category_name || item.category || 'Other'}</span>
      </div>
      <div className="v-col v-col-type">
        <span className={`badge ${isIncome ? 'badge-income' : 'badge-expense'}`}>
          {item.type}
        </span>
      </div>
      <div className={`v-col v-col-amount ${isIncome ? 'text-income' : 'text-expense'}`}>
        {formatCurrency(item.amount, item.type)}
      </div>
      <div className="v-col v-col-actions">
        <div className="action-buttons">
          <button
            type="button"
            className="btn-action-icon view-btn"
            onClick={() => onView(item)}
            title="View transaction details"
          >
            <Eye size={15} />
          </button>
          <button
            type="button"
            className={`btn-action-icon edit-btn ${!canWrite ? 'disabled-action' : ''}`}
            onClick={() => canWrite && onEdit(item)}
            disabled={!canWrite}
            title={canWrite ? 'Edit transaction' : 'Read-only access'}
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            className={`btn-action-icon delete-btn ${!canWrite ? 'disabled-action' : ''}`}
            onClick={() => canWrite && onDelete(item)}
            disabled={!canWrite}
            title={canWrite ? 'Delete transaction' : 'Read-only access'}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}, areEqual);

VirtualRow.displayName = 'VirtualRow';

export const VirtualTransactionList = ({
  items = [],
  onEdit,
  onDelete,
  onView,
  canWrite,
  height = 540,
  rowHeight = 54,
}) => {
  const itemData = {
    items,
    onEdit,
    onDelete,
    onView,
    canWrite,
  };

  return (
    <div className="virtual-list-container">
      {/* Fixed Header */}
      <div className="virtual-header">
        <div className="v-col v-col-date">Date</div>
        <div className="v-col v-col-desc">Description</div>
        <div className="v-col v-col-category">Category</div>
        <div className="v-col v-col-type">Type</div>
        <div className="v-col v-col-amount">Amount</div>
        <div className="v-col v-col-actions">Actions</div>
      </div>

      {/* Virtualized Body */}
      <List
        height={height}
        itemCount={items.length}
        itemSize={rowHeight}
        itemData={itemData}
        width="100%"
        className="virtual-scroll-body"
      >
        {VirtualRow}
      </List>
    </div>
  );
};

export default VirtualTransactionList;
