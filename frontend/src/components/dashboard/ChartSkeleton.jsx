import React from 'react';

export const ChartSkeleton = ({ height = 320, title = 'Loading chart data...' }) => {
  return (
    <div className="card chart-card">
      <div className="card-header chart-header-skeleton">
        <div className="skeleton-box w-36"></div>
      </div>
      <div className="card-body chart-body-skeleton" style={{ height }}>
        <div className="chart-skeleton-bars">
          <div className="chart-bar-skeleton h-40"></div>
          <div className="chart-bar-skeleton h-64"></div>
          <div className="chart-bar-skeleton h-48"></div>
          <div className="chart-bar-skeleton h-80"></div>
          <div className="chart-bar-skeleton h-56"></div>
          <div className="chart-bar-skeleton h-72"></div>
        </div>
        <span className="chart-skeleton-text text-muted">{title}</span>
      </div>
    </div>
  );
};

export default ChartSkeleton;
