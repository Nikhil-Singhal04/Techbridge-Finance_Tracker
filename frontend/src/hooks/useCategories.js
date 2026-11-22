import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

/**
 * Hook to fetch and cache categories from /api/categories
 * @param {string} type - Optional filter: 'income' or 'expense'
 */
export const useCategories = (type = '') => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = type ? { type } : {};
      const res = await client.get('/categories', { params });
      if (res.data?.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      setError(err.friendlyMessage || err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, error, refetch: fetchCategories };
};

export default useCategories;
