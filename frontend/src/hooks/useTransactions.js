import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import useDebounce from './useDebounce';

/**
 * Hook to manage transactions fetching, filtering, pagination, and virtual scrolling data
 */
export const useTransactions = (initialFilters = {}) => {
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    categoryId: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    sortBy: 'date',
    sortOrder: 'desc',
    ...initialFilters,
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [virtualizedMode, setVirtualizedMode] = useState(false);
  const [virtualizedTransactions, setVirtualizedTransactions] = useState([]);
  const [loadingVirtualized, setLoadingVirtualized] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounce search query by 400ms
  const debouncedSearch = useDebounce(filters.search, 400);

  // Normal paginated fetch
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      if (debouncedSearch && debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (filters.type) params.type = filters.type;
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.minAmount !== '' && filters.minAmount !== undefined) params.minAmount = filters.minAmount;
      if (filters.maxAmount !== '' && filters.maxAmount !== undefined) params.maxAmount = filters.maxAmount;

      const res = await client.get('/transactions', { params });
      if (res.data?.success) {
        setTransactions(res.data.data || []);
        setPagination(res.data.pagination || { page: 1, limit, total: 0, totalPages: 1 });
      }
    } catch (err) {
      setError(err.friendlyMessage || err.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    debouncedSearch,
    filters.type,
    filters.categoryId,
    filters.startDate,
    filters.endDate,
    filters.minAmount,
    filters.maxAmount,
    filters.sortBy,
    filters.sortOrder,
  ]);

  // Virtualized mode fetch: loads up to 1000 items in chunks of 100
  const fetchVirtualizedTransactions = useCallback(async () => {
    setLoadingVirtualized(true);
    setError(null);

    try {
      const baseParams = {
        limit: 100,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      if (debouncedSearch && debouncedSearch.trim()) baseParams.search = debouncedSearch.trim();
      if (filters.type) baseParams.type = filters.type;
      if (filters.categoryId) baseParams.categoryId = filters.categoryId;
      if (filters.startDate) baseParams.startDate = filters.startDate;
      if (filters.endDate) baseParams.endDate = filters.endDate;
      if (filters.minAmount !== '' && filters.minAmount !== undefined) baseParams.minAmount = filters.minAmount;
      if (filters.maxAmount !== '' && filters.maxAmount !== undefined) baseParams.maxAmount = filters.maxAmount;

      const firstRes = await client.get('/transactions', { params: { ...baseParams, page: 1 } });
      if (!firstRes.data?.success) {
        throw new Error(firstRes.data?.message || 'Failed to fetch initial page');
      }

      let allRows = [...(firstRes.data.data || [])];
      const totalPages = Math.min(10, firstRes.data.pagination.totalPages || 1); // Cap at 1000 items (10 x 100)

      if (totalPages > 1) {
        const pagePromises = [];
        for (let p = 2; p <= totalPages; p++) {
          pagePromises.push(client.get('/transactions', { params: { ...baseParams, page: p } }));
        }
        const responses = await Promise.all(pagePromises);
        for (const r of responses) {
          if (r.data?.success && Array.isArray(r.data.data)) {
            allRows = allRows.concat(r.data.data);
          }
        }
      }

      setVirtualizedTransactions(allRows);
    } catch (err) {
      setError(err.friendlyMessage || err.message || 'Failed to fetch virtualized transactions');
    } finally {
      setLoadingVirtualized(false);
    }
  }, [
    debouncedSearch,
    filters.type,
    filters.categoryId,
    filters.startDate,
    filters.endDate,
    filters.minAmount,
    filters.maxAmount,
    filters.sortBy,
    filters.sortOrder,
  ]);

  // Trigger fetch when parameters or mode change
  useEffect(() => {
    if (virtualizedMode) {
      fetchVirtualizedTransactions();
    } else {
      fetchTransactions();
    }
  }, [virtualizedMode, fetchTransactions, fetchVirtualizedTransactions]);

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to page 1 on filter changes
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      type: '',
      categoryId: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      sortBy: 'date',
      sortOrder: 'desc',
    });
    setPage(1);
  }, []);

  const refetch = useCallback(() => {
    if (virtualizedMode) {
      return fetchVirtualizedTransactions();
    }
    return fetchTransactions();
  }, [virtualizedMode, fetchTransactions, fetchVirtualizedTransactions]);

  return {
    transactions: virtualizedMode ? virtualizedTransactions : transactions,
    pagination: virtualizedMode
      ? {
          page: 1,
          limit: virtualizedTransactions.length,
          total: virtualizedTransactions.length,
          totalPages: 1,
        }
      : pagination,
    loading: virtualizedMode ? loadingVirtualized : loading,
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
  };
};

export default useTransactions;
