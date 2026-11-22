import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, Loader2, AlertCircle } from 'lucide-react';

const getTodayDateString = () => new Date().toISOString().split('T')[0];

export const TransactionModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  categories = [],
  loading = false,
}) => {
  const isEditing = Boolean(initialData && initialData.id);

  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    categoryId: '',
    transactionDate: getTodayDateString(),
    description: '',
  });

  const [errors, setErrors] = useState({});

  // Reset or populate form state when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          type: initialData.type || 'expense',
          amount: initialData.amount ? String(initialData.amount) : '',
          categoryId: initialData.category_id || initialData.categoryId || '',
          transactionDate: initialData.transaction_date
            ? initialData.transaction_date.split('T')[0]
            : getTodayDateString(),
          description: initialData.description || '',
        });
      } else {
        // New transaction: default to expense and first expense category
        const firstExpenseCategory = categories.find((c) => c.type === 'expense');
        setFormData({
          type: 'expense',
          amount: '',
          categoryId: firstExpenseCategory ? String(firstExpenseCategory.id) : '',
          transactionDate: getTodayDateString(),
          description: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, initialData, categories]);

  // Categories filtered by the selected transaction type
  const availableCategories = categories.filter((c) => c.type === formData.type);

  // Field change handler memoized with useCallback
  const handleChange = useCallback((field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // If type changed, reset or adjust categoryId to match new type
      if (field === 'type') {
        const matchingCategory = categories.find((c) => c.type === value);
        updated.categoryId = matchingCategory ? String(matchingCategory.id) : '';
      }

      return updated;
    });

    // Clear validation error on change
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  }, [categories]);

  // Validate form inputs
  const validate = useCallback(() => {
    const errs = {};
    const parsedAmount = parseFloat(formData.amount);

    if (!formData.amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      errs.amount = 'Amount must be a positive number greater than 0';
    }

    if (!formData.categoryId) {
      errs.categoryId = 'Please select a valid category';
    }

    if (!formData.transactionDate) {
      errs.transactionDate = 'Please select a valid date';
    }

    if (formData.description && formData.description.length > 255) {
      errs.description = 'Description cannot exceed 255 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formData]);

  // Form submit handler memoized with useCallback
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validate()) return;

      const payload = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        categoryId: parseInt(formData.categoryId, 10),
        transactionDate: formData.transactionDate,
        description: formData.description.trim(),
      };

      await onSubmit(payload);
    },
    [formData, validate, onSubmit]
  );

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditing ? 'Edit Transaction' : 'Add New Transaction'}
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="modal-body">
          {/* Type Toggle: Income vs Expense */}
          <div className="form-group">
            <label>Transaction Type</label>
            <div className="type-toggle-group">
              <button
                type="button"
                className={`type-toggle-btn income ${
                  formData.type === 'income' ? 'active' : ''
                }`}
                onClick={() => handleChange('type', 'income')}
              >
                <ArrowDownLeft size={16} />
                <span>Income</span>
              </button>
              <button
                type="button"
                className={`type-toggle-btn expense ${
                  formData.type === 'expense' ? 'active' : ''
                }`}
                onClick={() => handleChange('type', 'expense')}
              >
                <ArrowUpRight size={16} />
                <span>Expense</span>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label htmlFor="modal-amount">
              Amount ($) <span className="text-danger">*</span>
            </label>
            <input
              id="modal-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className={`input-field ${errors.amount ? 'input-error' : ''}`}
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              autoFocus
            />
            {errors.amount && (
              <div className="field-error">
                <AlertCircle size={14} />
                <span>{errors.amount}</span>
              </div>
            )}
          </div>

          {/* Category Filtered by Type */}
          <div className="form-group">
            <label htmlFor="modal-category">
              Category <span className="text-danger">*</span>
            </label>
            <select
              id="modal-category"
              className={`input-field ${errors.categoryId ? 'input-error' : ''}`}
              value={formData.categoryId}
              onChange={(e) => handleChange('categoryId', e.target.value)}
            >
              <option value="">Select a {formData.type} category</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <div className="field-error">
                <AlertCircle size={14} />
                <span>{errors.categoryId}</span>
              </div>
            )}
          </div>

          {/* Date */}
          <div className="form-group">
            <label htmlFor="modal-date">
              Date <span className="text-danger">*</span>
            </label>
            <input
              id="modal-date"
              type="date"
              className={`input-field ${errors.transactionDate ? 'input-error' : ''}`}
              value={formData.transactionDate}
              onChange={(e) => handleChange('transactionDate', e.target.value)}
            />
            {errors.transactionDate && (
              <div className="field-error">
                <AlertCircle size={14} />
                <span>{errors.transactionDate}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <div className="label-with-hint">
              <label htmlFor="modal-desc">Description</label>
              <span className="char-count text-muted">
                {formData.description.length}/255
              </span>
            </div>
            <textarea
              id="modal-desc"
              rows={3}
              placeholder="E.g. Weekly grocery shopping at Whole Foods"
              className={`input-field ${errors.description ? 'input-error' : ''}`}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              maxLength={255}
            />
            {errors.description && (
              <div className="field-error">
                <AlertCircle size={14} />
                <span>{errors.description}</span>
              </div>
            )}
          </div>

          {/* Modal Footer */}
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
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading && <Loader2 size={16} className="spinner-inline" />}
              <span>{isEditing ? 'Save Changes' : 'Create Transaction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
