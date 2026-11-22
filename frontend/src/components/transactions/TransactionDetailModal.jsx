import React from 'react';
import { X, Calendar, Tag, ArrowUpRight, ArrowDownLeft, Clock, User, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return d.toLocaleDateString('en-IN', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return dateStr;
};

export const TransactionDetailModal = ({
  isOpen,
  onClose,
  transaction,
  onEdit,
  onDelete,
  canWrite,
}) => {
  if (!isOpen || !transaction) return null;

  const isIncome = transaction.type === 'income';

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content modal-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <span className="detail-id-label">Transaction #{transaction.id}</span>
            <h2 className="modal-title">Transaction Details</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close details"
          >
            <X size={20} />
          </button>
        </div>

        {/* Amount Hero */}
        <div className={`detail-hero ${isIncome ? 'hero-income' : 'hero-expense'}`}>
          <div className="hero-badge-type">
            {isIncome ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
            <span className="capitalize">{transaction.type}</span>
          </div>
          <div className="hero-amount">
            {formatCurrency(transaction.amount, transaction.type)}
          </div>
          <div className="hero-category">
            <Tag size={15} />
            <span>{transaction.category_name || transaction.category || 'Uncategorized'}</span>
          </div>
        </div>

        {/* Read-Only Banner inside Details if applicable */}
        {!canWrite && (
          <div className="readonly-inline-notice">
            <ShieldAlert size={16} />
            <span>Read-only access: Editing and deleting are disabled for your account.</span>
          </div>
        )}

        {/* Details Grid */}
        <div className="detail-grid">
          <div className="detail-item full-width">
            <span className="detail-label">Description</span>
            <span className="detail-value font-medium">
              {transaction.description || 'No description provided'}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">
              <Calendar size={14} className="inline-icon" /> Transaction Date
            </span>
            <span className="detail-value">
              {formatDate(transaction.transaction_date || transaction.transactionDate)}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">
              <Clock size={14} className="inline-icon" /> Recorded At
            </span>
            <span className="detail-value">
              {transaction.created_at
                ? new Date(transaction.created_at).toLocaleString()
                : '—'}
            </span>
          </div>

          {transaction.user_id && (
            <div className="detail-item">
              <span className="detail-label">
                <User size={14} className="inline-icon" /> User ID
              </span>
              <span className="detail-value">{transaction.user_id}</span>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="modal-footer">
          {canWrite && (
            <>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  onClose();
                  onEdit(transaction);
                }}
              >
                <Edit2 size={16} />
                <span>Edit</span>
              </button>
              <button
                type="button"
                className="btn btn-danger-outline"
                onClick={() => {
                  onClose();
                  onDelete(transaction);
                }}
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </>
          )}
          <button type="button" className="btn btn-outline ml-auto" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;
