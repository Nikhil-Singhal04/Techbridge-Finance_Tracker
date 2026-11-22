import React from 'react';
import { TrendingUp, TrendingDown, Wallet, Percent, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(val || 0);
};

export const DashboardSummaryCards = ({ summary = {}, loading = false }) => {
  if (loading) {
    return (
      <div className="summary-cards-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card summary-metric-card skeleton-card">
            <div className="skeleton-box w-20 mb-2"></div>
            <div className="skeleton-box w-36 h-8 mb-2"></div>
            <div className="skeleton-box w-24"></div>
          </div>
        ))}
      </div>
    );
  }

  const {
    totalIncome = 0,
    totalExpense = 0,
    balance = 0,
    savingsRate = 0,
    transactionCount = 0,
    averageExpense = 0,
  } = summary;

  const isPositiveBalance = balance >= 0;
  const isGoodSavingsRate = savingsRate >= 20;

  return (
    <div className="summary-cards-grid">
      {/* Total Income */}
      <div className="card summary-metric-card income-card">
        <div className="metric-header">
          <span className="metric-title">Total Income</span>
          <div className="metric-icon-badge income-badge">
            <TrendingUp size={18} />
          </div>
        </div>
        <div className="metric-value text-income">{formatCurrency(totalIncome)}</div>
        <div className="metric-footer text-muted">
          <span className="metric-tag tag-success">
            <ArrowUpRight size={13} />
            Inflow
          </span>
          <span>From all recorded sources</span>
        </div>
      </div>

      {/* Total Expense */}
      <div className="card summary-metric-card expense-card">
        <div className="metric-header">
          <span className="metric-title">Total Expense</span>
          <div className="metric-icon-badge expense-badge">
            <TrendingDown size={18} />
          </div>
        </div>
        <div className="metric-value text-expense">{formatCurrency(totalExpense)}</div>
        <div className="metric-footer text-muted">
          <span className="metric-tag tag-danger">
            <ArrowDownRight size={13} />
            Avg {formatCurrency(averageExpense)}/tx
          </span>
          <span>{transactionCount} total txs</span>
        </div>
      </div>

      {/* Net Balance */}
      <div className="card summary-metric-card balance-card">
        <div className="metric-header">
          <span className="metric-title">Net Balance</span>
          <div className="metric-icon-badge balance-badge">
            <Wallet size={18} />
          </div>
        </div>
        <div className={`metric-value ${isPositiveBalance ? 'text-income' : 'text-expense'}`}>
          {formatCurrency(balance)}
        </div>
        <div className="metric-footer text-muted">
          <span className={`metric-tag ${isPositiveBalance ? 'tag-success' : 'tag-danger'}`}>
            {isPositiveBalance ? 'Net Surplus' : 'Net Deficit'}
          </span>
          <span>Income minus Expenses</span>
        </div>
      </div>

      {/* Savings Rate */}
      <div className="card summary-metric-card rate-card">
        <div className="metric-header">
          <span className="metric-title">Savings Rate</span>
          <div className="metric-icon-badge rate-badge">
            <Percent size={18} />
          </div>
        </div>
        <div className={`metric-value ${isGoodSavingsRate ? 'text-income' : 'text-primary'}`}>
          {savingsRate.toFixed(1)}%
        </div>
        <div className="metric-footer text-muted">
          <span className={`metric-tag ${isGoodSavingsRate ? 'tag-success' : 'tag-neutral'}`}>
            {isGoodSavingsRate ? 'Healthy target' : 'Below 20% target'}
          </span>
          <span>Of total earnings</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardSummaryCards;
