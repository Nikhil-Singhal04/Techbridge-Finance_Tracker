import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { TrendingUp, Info } from 'lucide-react';

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
        {payload.map((entry) => (
          <div key={entry.name} className="tooltip-row">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-semibold">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const TrendLineChart = ({ data = [], loading = false }) => {
  const { isDark } = useTheme();

  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const hasData = (data || []).some((d) => d.income > 0 || d.expense > 0 || d.net !== 0);

  if (!loading && !hasData) {
    return (
      <div className="card chart-card">
        <div className="card-header">
          <div className="card-title-with-icon">
            <TrendingUp size={18} />
            <h3 className="card-title">12-Month Cashflow & Net Trends</h3>
          </div>
        </div>
        <div className="card-body chart-empty-state">
          <Info size={36} className="text-muted mb-2" />
          <p className="text-muted font-medium">No trend data available</p>
          <span className="text-muted text-sm">Historical trends will appear as transactions are added</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card chart-card">
      <div className="card-header">
        <div className="card-title-with-icon">
          <TrendingUp size={18} />
          <h3 className="card-title">12-Month Cashflow & Net Trends</h3>
        </div>
        <span className="badge badge-neutral-subtle">Smooth Curves</span>
      </div>

      <div className="card-body">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
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
            <Line
              type="monotone"
              name="Income"
              dataKey="income"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#10b981' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              name="Expense"
              dataKey="expense"
              stroke="#ef4444"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#ef4444' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              name="Net Savings"
              dataKey="net"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3, fill: '#3b82f6' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendLineChart;
