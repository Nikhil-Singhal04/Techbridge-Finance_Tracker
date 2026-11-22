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
import { CalendarRange, Info } from 'lucide-react';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatters';

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
        <div className="tooltip-title font-semibold">Year {label}</div>
        <div className="tooltip-row">
          <span className="text-muted">Total Income:</span>
          <span className="font-semibold text-income">{formatCurrency(income)}</span>
        </div>
        <div className="tooltip-row">
          <span className="text-muted">Total Expense:</span>
          <span className="font-semibold text-expense">{formatCurrency(expense)}</span>
        </div>
        <div className="tooltip-divider"></div>
        <div className="tooltip-row">
          <span className="text-muted">Net Growth:</span>
          <span className={`font-semibold ${net >= 0 ? 'text-income' : 'text-expense'}`}>
            {formatCurrency(net)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const YearlyBarChart = ({ data = [], loading = false }) => {
  const { isDark } = useTheme();

  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const hasData = (data || []).some((d) => d.income > 0 || d.expense > 0);

  if (!loading && !hasData) {
    return (
      <div className="card chart-card">
        <div className="card-header">
          <div className="card-title-with-icon">
            <CalendarRange size={18} />
            <h3 className="card-title">Year-over-Year Historical Financials</h3>
          </div>
        </div>
        <div className="card-body chart-empty-state">
          <Info size={36} className="text-muted mb-2" />
          <p className="text-muted font-medium">No annual data available</p>
          <span className="text-muted text-sm">Historical records will populate here</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card chart-card">
      <div className="card-header">
        <div className="card-title-with-icon">
          <CalendarRange size={18} />
          <h3 className="card-title">Year-over-Year Historical Financials</h3>
        </div>
        <span className="badge badge-neutral-subtle">Annual Totals</span>
      </div>

      <div className="card-body">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="year"
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
              tickFormatter={formatCompactCurrency}
            />
            <Tooltip content={<CustomTooltip isDark={isDark} />} />
            <Legend
              wrapperStyle={{ paddingTop: 10, fontSize: '0.85rem' }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              name="Total Income"
              dataKey="income"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              maxBarSize={45}
            />
            <Bar
              name="Total Expense"
              dataKey="expense"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              maxBarSize={45}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default YearlyBarChart;
