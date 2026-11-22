import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

import DashboardSummaryCards from '../components/dashboard/DashboardSummaryCards';
import DashboardControls from '../components/dashboard/DashboardControls';
import ChartSkeleton from '../components/dashboard/ChartSkeleton';
import { ShieldAlert, AlertCircle, TrendingUp, BarChart2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

// Lazy-load chart components so Recharts and charting code is split into separate chunks
const ExpensePieChart = lazy(() => import('../components/dashboard/ExpensePieChart'));
const MonthlyBarChart = lazy(() => import('../components/dashboard/MonthlyBarChart'));
const TrendLineChart = lazy(() => import('../components/dashboard/TrendLineChart'));
const YearlyBarChart = lazy(() => import('../components/dashboard/YearlyBarChart'));

const CURRENT_YEAR = String(new Date().getFullYear());

export const Dashboard = () => {
  const { user, isReadOnly, canWrite } = useAuth();

  // Control state
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(''); // '' means whole year
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'yearly'

  // Data states
  const [summary, setSummary] = useState({});
  const [monthlyData, setMonthlyData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [trendsData, setTrendsData] = useState([]);

  // Cache & Loading states
  const [cacheStatus, setCacheStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all analytics data with parallel requests
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const summaryParams = { year };
      if (month) summaryParams.month = month;

      const categoryParams = { type: 'expense', year };
      if (month) categoryParams.month = month;

      const [summaryRes, monthlyRes, yearlyRes, categoryRes, trendsRes] = await Promise.all([
        client.get('/analytics/summary', { params: summaryParams }),
        client.get('/analytics/monthly', { params: { year } }),
        client.get('/analytics/yearly'),
        client.get('/analytics/category-breakdown', { params: categoryParams }),
        client.get('/analytics/trends', { params: { months: 12 } }),
      ]);

      // Inspect X-Cache header from the primary summary endpoint
      const rawCacheHeader =
        summaryRes.headers['x-cache'] ||
        summaryRes.headers['X-Cache'] ||
        (summaryRes.headers.get ? summaryRes.headers.get('x-cache') : null);

      if (rawCacheHeader) {
        setCacheStatus(rawCacheHeader.toUpperCase().includes('HIT') ? 'HIT' : 'MISS');
      }

      if (summaryRes.data?.success) setSummary(summaryRes.data.data);
      if (monthlyRes.data?.success) setMonthlyData(monthlyRes.data.data);
      if (yearlyRes.data?.success) setYearlyData(yearlyRes.data.data);
      if (categoryRes.data?.success) setCategoryBreakdown(categoryRes.data.data);
      if (trendsRes.data?.success) setTrendsData(trendsRes.data.data);
    } catch (err) {
      setError(
        err.friendlyMessage ||
          err.response?.data?.error?.message ||
          'Failed to load analytics dashboard data'
      );
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  // Refetch when filters change
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Compute available years dynamically from yearly data + current year
  const availableYears = useMemo(() => {
    const yearsSet = new Set([parseInt(CURRENT_YEAR, 10), 2025, 2024]);
    if (Array.isArray(yearlyData)) {
      yearlyData.forEach((item) => {
        if (item.year) yearsSet.add(parseInt(item.year, 10));
      });
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [yearlyData]);

  // Handlers wrapped in useCallback
  const handleYearChange = useCallback((newYear) => {
    setYear(newYear);
  }, []);

  const handleMonthChange = useCallback((newMonth) => {
    setMonth(newMonth);
  }, []);

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    if (mode === 'yearly') {
      setMonth(''); // Reset month filter when entering yearly view
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="page-container dashboard-page">
      {/* Read-Only Access Banner */}
      {isReadOnly && (
        <div className="readonly-alert-banner">
          <ShieldAlert size={18} />
          <span>
            <strong>Read-only demo access:</strong> You have full visibility into all personal
            financial metrics, breakdowns, and trend charts.
          </span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial Analytics & Insights</h1>
          <p className="page-subtitle">
            Welcome back, {user?.name || 'User'}! Track your income, cashflow trends, and expense
            distributions.
          </p>
        </div>

        <div className="page-header-actions">
          {canWrite && (
            <Link to="/transactions" className="btn btn-primary">
              <Plus size={18} />
              <span>Add Transaction</span>
            </Link>
          )}
        </div>
      </div>

      {/* Global Dashboard Controls (Year, Month, View Mode, Cache Badge) */}
      <DashboardControls
        year={year}
        month={month}
        viewMode={viewMode}
        cacheStatus={cacheStatus}
        onYearChange={handleYearChange}
        onMonthChange={handleMonthChange}
        onViewModeChange={handleViewModeChange}
        onRefresh={handleRefresh}
        loading={loading}
        availableYears={availableYears}
      />

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Summary Cards (Total Income, Total Expense, Net Balance, Savings Rate) */}
      <DashboardSummaryCards summary={summary} loading={loading} />

      {/* Charts Grid */}
      {viewMode === 'monthly' ? (
        <>
          {/* Top Row: Grouped Monthly Bar Chart & Category Expense Pie Chart */}
          <div className="dashboard-charts-grid">
            <Suspense fallback={<ChartSkeleton title="Loading monthly comparison..." />}>
              <MonthlyBarChart data={monthlyData} year={year} loading={loading} />
            </Suspense>

            <Suspense fallback={<ChartSkeleton title="Loading expense breakdown..." />}>
              <ExpensePieChart data={categoryBreakdown} loading={loading} />
            </Suspense>
          </div>

          {/* Bottom Row: 12-Month Cashflow & Net Trends Line Chart */}
          <div className="dashboard-trend-full">
            <Suspense fallback={<ChartSkeleton height={340} title="Loading trend chart..." />}>
              <TrendLineChart data={trendsData} loading={loading} />
            </Suspense>
          </div>
        </>
      ) : (
        <>
          {/* Yearly View: Historical Bar Chart & Overall Category Distribution */}
          <div className="dashboard-charts-grid">
            <Suspense fallback={<ChartSkeleton title="Loading yearly comparison..." />}>
              <YearlyBarChart data={yearlyData} loading={loading} />
            </Suspense>

            <Suspense fallback={<ChartSkeleton title="Loading category distribution..." />}>
              <ExpensePieChart data={categoryBreakdown} loading={loading} />
            </Suspense>
          </div>

          {/* Bottom Row: Multi-Month Cashflow Trends */}
          <div className="dashboard-trend-full">
            <Suspense fallback={<ChartSkeleton height={340} title="Loading trend chart..." />}>
              <TrendLineChart data={trendsData} loading={loading} />
            </Suspense>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
