import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Receipt, Info } from 'lucide-react';

const Transactions = () => {
  const { user, isReadOnly } = useAuth();

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">Track and filter all your income and expenses.</p>
        </div>
        {!isReadOnly && (
          <button className="btn btn-primary">
            <span>+ Add Transaction</span>
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-body text-center py-5">
          <Receipt size={48} className="text-muted mb-3" />
          <h3>Transaction UI Foundation Ready</h3>
          <p className="text-muted max-w-md mx-auto">
            {isReadOnly
              ? 'You are viewing with Read-Only permissions. You will be able to search and inspect transactions in Phase 8.'
              : 'Full transactions table with virtual scrolling, category filters, and modals will be activated in Phase 8.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
