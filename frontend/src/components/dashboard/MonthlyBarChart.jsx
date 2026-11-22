import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { BarChart3, Info } from 'lucide-react';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const CustomTooltip = ({ active, payload, label, isDark }) => {
  if (active && payload && payload.length) {
    const incomeItem = payload.find((p) => p.dataKey === 'income');
    const expenseItem = payload.find((p) => p.dataKey === 'expense');

    const income = incomeItem ? incomeItem.value : 0;
    const expense = expenseItem ? expenseItem.value : 0;
    const net = income - expense;

    return (
      <div
        className="chart-custom-tooltip"
        style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderColor: isDark ? '#334155' : '#cbd5e1',
          color: isDark ? '#f8fafc' : '#0f172a',
        }}
      >
        <div className="tooltip-title font-semibold">{label}</div>
        <div className="tooltip-row">
          <span className="text-muted">Income:</span>
          <span className="font-semibold text-income">{formatCurrency(income)}</span>
        </div>
        <div className="tooltip-row">
          <span className="text-muted">Expense:</span>
          <span className="font-semibold text-expense">{formatCurrency(expense)}</span>
        </div>
        <div className="tooltip-divider"></div>
        <div className="tooltip-row">
          <span className="text-muted">Net:</span>
          <span className={`font-semibold ${net >= 0 ? 'text-income' : 'text-expense'}`}>
            {formatCurrency(net)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const MonthlyBarChart = ({ data = [], year = 2026, loading = false }) => {
  const { isDark } = useTheme();

  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const hasData = (data || []).some((d) => d.income > 0 || d.expense > 0);

  if (!loading && !hasData) {
    return (
      <div className="card chart-card">
        <div className="card-header">
          <div className="card-title-with-icon">
            <BarChart3 size={18} />
            <h3 className="card-title">Monthly Income vs. Expenses ({year})</h3>
          </div>
        </div>
        <div className="card-body chart-empty-state">
          <Info size={36} className="text-muted mb-2" />
          <p className="text-muted font-medium">No transaction activity recorded for {year}</p>
          <span className="text-muted text-sm">Create transactions to view monthly financial comparisons</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card chart-card">
      <div className="card-header">
        <div className="card-title-with-icon">
          <BarChart3 size={18} />
          <h3 className="card-title">Monthly Income vs. Expenses ({year})</h3>
        </div>
        <span className="badge badge-neutral-subtle">Grouped Bar</span>
      </div>

      <div className="card-body">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="monthName"
              stroke={textColor}
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              stroke={textColor}
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
            />
            <Tooltip content={<CustomTooltip isDark={isDark} />} />
            <Legend
              wrapperStyle={{ paddingTop: 10, fontSize: '0.85rem' }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              name="Income"
              dataKey="income"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              name="Expense"
              dataKey="expense"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonthlyBarChart;
