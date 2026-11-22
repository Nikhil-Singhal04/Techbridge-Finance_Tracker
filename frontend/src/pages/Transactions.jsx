import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import client from '../api/client';

import TransactionFilters from '../components/transactions/TransactionFilters';
import TransactionSummaryStrip from '../components/transactions/TransactionSummaryStrip';
import TransactionRow from '../components/transactions/TransactionRow';
import VirtualTransactionList from '../components/transactions/VirtualTransactionList';
import TransactionModal from '../components/transactions/TransactionModal';
import TransactionDetailModal from '../components/transactions/TransactionDetailModal';
import DeleteConfirmModal from '../components/transactions/DeleteConfirmModal';
import SkeletonRow from '../components/common/SkeletonRow';
import Toast from '../components/common/Toast';

import {
  Plus,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Inbox,
  AlertCircle,
  Layers,
  Table as TableIcon,
} from 'lucide-react';

const Transactions = () => {
  const { user, canWrite, isReadOnly } = useAuth();

  // Transactions hook managing filters, pagination, debounced search & virtualized mode
  const {
    transactions,
    pagination,
    loading,
    error,
    filters,
    page,
    limit,
    virtualizedMode,
    setPage,
    setLimit,
    setVirtualizedMode,
    updateFilters,
    resetFilters,
    refetch,
  } = useTransactions();

  // Categories hook
  const { categories } = useCategories();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingTransaction, setDeletingTransaction] = useState(null);
  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Handlers memoized with useCallback
  const handleOpenAdd = useCallback(() => {
    if (!canWrite) return;
    setIsAddModalOpen(true);
  }, [canWrite]);

  const handleOpenEdit = useCallback((transaction) => {
    if (!canWrite) return;
    setEditingTransaction(transaction);
  }, [canWrite]);

  const handleOpenDelete = useCallback((transaction) => {
    if (!canWrite) return;
    setDeletingTransaction(transaction);
  }, [canWrite]);

  const handleOpenView = useCallback((transaction) => {
    setViewingTransaction(transaction);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsAddModalOpen(false);
    setEditingTransaction(null);
  }, []);

  const handleToggleVirtualized = useCallback(() => {
    setVirtualizedMode((prev) => !prev);
  }, [setVirtualizedMode]);

  // Submit handler for both Add and Edit
  const handleSubmitTransaction = useCallback(
    async (payload) => {
      setModalLoading(true);
      try {
        if (editingTransaction) {
          const res = await client.put(`/transactions/${editingTransaction.id}`, payload);
          if (res.data?.success) {
            addToast('Transaction updated successfully!', 'success');
            handleCloseModal();
            refetch();
          }
        } else {
          const res = await client.post('/transactions', payload);
          if (res.data?.success) {
            addToast('Transaction created successfully!', 'success');
            handleCloseModal();
            refetch();
          }
        }
      } catch (err) {
        addToast(
          err.response?.data?.error?.message ||
            err.friendlyMessage ||
            'Failed to save transaction. Please check your inputs.',
          'error'
        );
      } finally {
        setModalLoading(false);
      }
    },
    [editingTransaction, handleCloseModal, refetch, addToast]
  );

  // Confirm Delete handler
  const handleConfirmDelete = useCallback(async () => {
    if (!deletingTransaction) return;
    setModalLoading(true);
    try {
      const res = await client.delete(`/transactions/${deletingTransaction.id}`);
      if (res.data?.success) {
        addToast('Transaction deleted successfully!', 'success');
        setDeletingTransaction(null);
        refetch();
      }
    } catch (err) {
      addToast(
        err.response?.data?.error?.message ||
          err.friendlyMessage ||
          'Failed to delete transaction.',
        'error'
      );
    } finally {
      setModalLoading(false);
    }
  }, [deletingTransaction, refetch, addToast]);

  // Determine whether to render the virtualized list:
  // Render virtualized list if "Show all (virtualized)" is on OR if current items > 50
  const shouldUseVirtualList = virtualizedMode || (!loading && transactions.length > 50);

  // Pagination navigation helpers
  const totalPages = pagination?.totalPages || 1;
  const canPrevPage = page > 1;
  const canNextPage = page < totalPages;

  return (
    <div className="page-container transactions-page">
      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* Read-only banner */}
      {isReadOnly && (
        <div className="readonly-alert-banner">
          <ShieldAlert size={18} />
          <span>
            <strong>Read-only access:</strong> You are browsing in read-only mode. Adding, editing,
            and deleting transactions is restricted.
          </span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">
            Manage, filter, and track all your income and expenses in real-time.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className={`btn btn-primary ${!canWrite ? 'disabled-btn' : ''}`}
            onClick={handleOpenAdd}
            disabled={!canWrite}
            title={canWrite ? 'Add new transaction' : 'Read-only access'}
          >
            <Plus size={18} />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Summary Strip (useMemo client-side totals) */}
      <TransactionSummaryStrip transactions={transactions} />

      {/* Filter Controls Bar */}
      <TransactionFilters
        filters={filters}
        categories={categories}
        onFilterChange={updateFilters}
        onResetFilters={resetFilters}
        virtualizedMode={virtualizedMode}
        onToggleVirtualized={handleToggleVirtualized}
      />

      {/* Transactions Table / List Card */}
      <div className="card transactions-card">
        <div className="card-header transactions-card-header">
          <div className="table-header-info">
            <span className="card-title">All Transactions</span>
            <span className="badge badge-neutral">
              {virtualizedMode
                ? `${transactions.length} loaded (Virtualized)`
                : `${pagination.total || 0} total`}
            </span>
          </div>

          <div className="table-view-indicator">
            {shouldUseVirtualList ? (
              <span className="badge badge-info-subtle">
                <Layers size={13} />
                <span>Virtual Scroll Active</span>
              </span>
            ) : (
              <span className="badge badge-neutral-subtle">
                <TableIcon size={13} />
                <span>Paginated Table</span>
              </span>
            )}
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="alert alert-error mx-4 my-3">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Table Content */}
        <div className="card-body p-0">
          {loading && !shouldUseVirtualList ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <SkeletonRow count={8} />
                </tbody>
              </table>
            </div>
          ) : !loading && transactions.length === 0 ? (
            <div className="empty-state">
              <Inbox size={48} className="empty-icon text-muted" />
              <h3 className="empty-title">No transactions found</h3>
              <p className="empty-description text-muted">
                {filters.search || filters.type || filters.categoryId || filters.startDate
                  ? 'No transactions matched your filter criteria. Try clearing some filters.'
                  : 'Start tracking your finances by creating your first transaction.'}
              </p>
              <div className="empty-actions">
                {filters.search || filters.type || filters.categoryId || filters.startDate ? (
                  <button type="button" className="btn btn-outline" onClick={resetFilters}>
                    Clear all filters
                  </button>
                ) : (
                  canWrite && (
                    <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
                      <Plus size={16} />
                      <span>Add your first transaction</span>
                    </button>
                  )
                )}
              </div>
            </div>
          ) : shouldUseVirtualList ? (
            <VirtualTransactionList
              items={transactions}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
              onView={handleOpenView}
              canWrite={canWrite}
              height={520}
              rowHeight={54}
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>Date</th>
                    <th>Description</th>
                    <th style={{ width: '140px' }}>Category</th>
                    <th style={{ width: '100px' }}>Type</th>
                    <th style={{ width: '130px' }} className="text-right">
                      Amount
                    </th>
                    <th style={{ width: '120px' }} className="text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      onEdit={handleOpenEdit}
                      onDelete={handleOpenDelete}
                      onView={handleOpenView}
                      canWrite={canWrite}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Bar (visible in normal paginated mode) */}
        {!virtualizedMode && pagination.total > 0 && (
          <div className="card-footer pagination-bar">
            <div className="pagination-info text-muted">
              Showing {(page - 1) * limit + 1} to{' '}
              {Math.min(page * limit, pagination.total)} of {pagination.total} entries
            </div>

            <div className="pagination-controls">
              {/* Page Size Selector */}
              <div className="page-size-selector">
                <label htmlFor="limit-select" className="text-muted">
                  Rows:
                </label>
                <select
                  id="limit-select"
                  className="input-field input-field-sm"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Prev Button */}
              <button
                type="button"
                className="btn btn-icon-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrevPage}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page Number indicator */}
              <span className="page-indicator">
                Page {page} of {totalPages}
              </span>

              {/* Next Button */}
              <button
                type="button"
                className="btn btn-icon-sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={!canNextPage}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isAddModalOpen || Boolean(editingTransaction)}
        onClose={handleCloseModal}
        onSubmit={handleSubmitTransaction}
        initialData={editingTransaction}
        categories={categories}
        loading={modalLoading}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingTransaction)}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={handleConfirmDelete}
        transaction={deletingTransaction}
        loading={modalLoading}
      />

      {/* Transaction Details Drawer/Modal */}
      <TransactionDetailModal
        isOpen={Boolean(viewingTransaction)}
        onClose={() => setViewingTransaction(null)}
        transaction={viewingTransaction}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
        canWrite={canWrite}
      />
    </div>
  );
};

export default Transactions;
