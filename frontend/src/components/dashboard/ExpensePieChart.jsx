import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { PieChart as PieIcon, Info } from 'lucide-react';

const COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#84cc16', // Lime
  '#a855f7', // Purple
];

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(val || 0);
};

// Render active enlarged shape on hover or click
const renderActiveShape = (props) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props;

  return (
    <g>
      <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill="var(--text-primary)" fontSize={15} fontWeight={700}>
        {payload.category}
      </text>
      <text x={cx} y={cy + 14} dy={8} textAnchor="middle" fill={fill} fontSize={14} fontWeight={600}>
        {formatCurrency(value)}
      </text>
      <text x={cx} y={cy + 34} dy={8} textAnchor="middle" fill="var(--text-muted)" fontSize={12}>
        {`${(percent * 100).toFixed(1)}%`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 14}
        fill={fill}
      />
    </g>
  );
};

// Custom Tooltip
const CustomTooltip = ({ active, payload, isDark }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div
        className="chart-custom-tooltip"
        style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderColor: isDark ? '#334155' : '#cbd5e1',
          color: isDark ? '#f8fafc' : '#0f172a',
        }}
      >
        <div className="tooltip-title font-semibold">{item.category}</div>
        <div className="tooltip-row">
          <span className="text-muted">Total:</span>
          <span className="font-semibold text-expense">{formatCurrency(item.total)}</span>
        </div>
        <div className="tooltip-row">
          <span className="text-muted">Share:</span>
          <span className="font-semibold">{item.percentage}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export const ExpensePieChart = ({ data = [], loading = false }) => {
  const { isDark } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);

  // Filter out any 0 or negative items
  const validData = useMemo(() => {
    return (data || []).filter((item) => parseFloat(item.total) > 0);
  }, [data]);

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onPieClick = (_, index) => {
    setActiveIndex(index);
  };

  if (!loading && validData.length === 0) {
    return (
      <div className="card chart-card">
        <div className="card-header">
          <div className="card-title-with-icon">
            <PieIcon size={18} />
            <h3 className="card-title">Expense Breakdown by Category</h3>
          </div>
        </div>
        <div className="card-body chart-empty-state">
          <Info size={36} className="text-muted mb-2" />
          <p className="text-muted font-medium">No expense records found for this period</p>
          <span className="text-muted text-sm">Add transactions to visualize category spending</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card chart-card">
      <div className="card-header">
        <div className="card-title-with-icon">
          <PieIcon size={18} />
          <h3 className="card-title">Expense Breakdown by Category</h3>
        </div>
        <span className="badge badge-neutral-subtle">
          {validData.length} categories
        </span>
      </div>

      <div className="card-body pie-chart-layout">
        {/* Pie Chart Interactive Canvas */}
        <div className="pie-canvas-wrapper">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Tooltip content={<CustomTooltip isDark={isDark} />} />
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={validData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                dataKey="total"
                nameKey="category"
                onMouseEnter={onPieEnter}
                onClick={onPieClick}
                cursor="pointer"
                paddingAngle={2}
              >
                {validData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke={isDark ? '#1e293b' : '#ffffff'}
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend List beside chart */}
        <div className="pie-legend-container">
          <div className="legend-header text-muted">
            <span>Category</span>
            <span>Amount / Share</span>
          </div>
          <div className="legend-scroll-list">
            {validData.map((item, index) => {
              const color = COLORS[index % COLORS.length];
              const isSelected = activeIndex === index;

              return (
                <div
                  key={item.category || index}
                  className={`legend-item-row ${isSelected ? 'active' : ''}`}
                  onClick={() => setActiveIndex(index)}
                  onMouseEnter={() => setActiveIndex(index)}
                  style={{
                    borderColor: isSelected ? color : 'transparent',
                  }}
                >
                  <div className="legend-category-info">
                    <span
                      className="legend-color-dot"
                      style={{ backgroundColor: color }}
                    ></span>
                    <span className="legend-category-name" title={item.category}>
                      {item.category}
                    </span>
                  </div>
                  <div className="legend-category-values">
                    <span className="font-semibold">{formatCurrency(item.total)}</span>
                    <span className="legend-percentage text-muted">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpensePieChart;
