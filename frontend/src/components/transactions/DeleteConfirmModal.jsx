import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

const formatCurrency = (amount, type) => {
  const num = parseFloat(amount) || 0;
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);

  return type === 'income' ? `+${formatted}` : `-${formatted}`;
};

export const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  transaction,
  loading = false,
}) => {
  if (!isOpen || !transaction) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content modal-content-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon-badge danger">
            <AlertTriangle size={24} />
          </div>
          <h2 className="modal-title">Delete Transaction</h2>
        </div>

        <div className="modal-body text-center">
          <p className="confirm-text">
            Are you sure you want to permanently delete this transaction? This action cannot be undone.
          </p>

          <div className="delete-preview-card">
            <div className="preview-desc font-semibold">
              {transaction.description || 'No description'}
            </div>
            <div className="preview-meta">
              <span className="category-pill">
                {transaction.category_name || transaction.category || 'Other'}
              </span>
              <span
                className={`preview-amount ${
                  transaction.type === 'income' ? 'text-income' : 'text-expense'
                }`}
              >
                {formatCurrency(transaction.amount, transaction.type)}
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Loader2 size={16} className="spinner-inline" />}
            <span>Delete Transaction</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
