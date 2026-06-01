import { useState, useCallback } from 'react';

const defaultFilters = {
  search: '',
  status: '',
  mode: '',
  branch: '',
  minCTC: '',
  maxCTC: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,   
  limit: 20, 
};

export function useDriveFilters() {
  const [filters, setFilters] = useState(defaultFilters);

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const hasActiveFilters = Object.entries(filters).some(([key, val]) => {
    if (key === 'sortBy' || key === 'sortOrder') return false;
    return val !== '';
  });

  // build params object — strip empty values
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '')
  );

  return { filters, setFilter, clearFilters, hasActiveFilters, params };
}