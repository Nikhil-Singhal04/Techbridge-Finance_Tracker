import React from 'react';
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
  // Avoid timezone skew by parsing YYYY-MM-DD directly
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

export const TransactionRow = React.memo(
  ({ transaction, onEdit, onDelete, onView, canWrite }) => {
    const isIncome = transaction.type === 'income';

    return (
      <tr className="transaction-row">
        {/* Date */}
        <td className="col-date text-muted">
          {formatDate(transaction.transaction_date || transaction.transactionDate)}
        </td>

        {/* Description */}
        <td className="col-desc">
          <div className="desc-text" title={transaction.description}>
            {transaction.description || 'No description'}
          </div>
        </td>

        {/* Category */}
        <td className="col-category">
          <span className="category-pill">
            {transaction.category_name || transaction.category || 'Uncategorized'}
          </span>
        </td>

        {/* Type */}
        <td className="col-type">
          <span className={`badge ${isIncome ? 'badge-income' : 'badge-expense'}`}>
            {transaction.type}
          </span>
        </td>

        {/* Amount */}
        <td className={`col-amount ${isIncome ? 'text-income' : 'text-expense'}`}>
          {formatCurrency(transaction.amount, transaction.type)}
        </td>

        {/* Actions */}
        <td className="col-actions">
          <div className="action-buttons">
            {/* View Details - Always available to all roles */}
            <button
              type="button"
              className="btn-action-icon view-btn"
              onClick={() => onView(transaction)}
              title="View transaction details"
              aria-label="View details"
            >
              <Eye size={16} />
            </button>

            {/* Edit - Disabled with tooltip if read-only */}
            <button
              type="button"
              className={`btn-action-icon edit-btn ${!canWrite ? 'disabled-action' : ''}`}
              onClick={() => canWrite && onEdit(transaction)}
              disabled={!canWrite}
              title={canWrite ? 'Edit transaction' : 'Read-only access'}
              aria-label="Edit transaction"
            >
              <Edit2 size={16} />
            </button>

            {/* Delete - Disabled with tooltip if read-only */}
            <button
              type="button"
              className={`btn-action-icon delete-btn ${!canWrite ? 'disabled-action' : ''}`}
              onClick={() => canWrite && onDelete(transaction)}
              disabled={!canWrite}
              title={canWrite ? 'Delete transaction' : 'Read-only access'}
              aria-label="Delete transaction"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  }
);

TransactionRow.displayName = 'TransactionRow';

export default TransactionRow;
