import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(val || 0);
};

export const TransactionSummaryStrip = ({ transactions = [] }) => {
  // Memoize summary calculations for transactions on the current page/view
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let expenseCount = 0;

    for (const t of transactions) {
      const num = parseFloat(t.amount) || 0;
      if (t.type === 'income') {
        income += num;
      } else if (t.type === 'expense') {
        expense += num;
        expenseCount += 1;
      }
    }

    const net = income - expense;
    const avgExpense = expenseCount > 0 ? expense / expenseCount : 0;

    return {
      income,
      expense,
      net,
      avgExpense,
      count: transactions.length,
    };
  }, [transactions]);

  return (
    <div className="summary-strip">
      <div className="summary-card">
        <div className="summary-icon income-icon">
          <TrendingUp size={20} />
        </div>
        <div className="summary-content">
          <div className="summary-label">Total Income</div>
          <div className="summary-value text-income">{formatCurrency(summary.income)}</div>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-icon expense-icon">
          <TrendingDown size={20} />
        </div>
        <div className="summary-content">
          <div className="summary-label">Total Expense</div>
          <div className="summary-value text-expense">{formatCurrency(summary.expense)}</div>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-icon balance-icon">
          <DollarSign size={20} />
        </div>
        <div className="summary-content">
          <div className="summary-label">Net Balance</div>
          <div className={`summary-value ${summary.net >= 0 ? 'text-income' : 'text-expense'}`}>
            {formatCurrency(summary.net)}
          </div>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-icon avg-icon">
          <Activity size={20} />
        </div>
        <div className="summary-content">
          <div className="summary-label">Average Expense</div>
          <div className="summary-value">{formatCurrency(summary.avgExpense)}</div>
        </div>
      </div>
    </div>
  );
};

export default TransactionSummaryStrip;
