import { useState, useMemo } from 'react';

const DEFAULT_FILTERS = {
  search:      '',   // matches name, email, rollNumber
  branch:      '',   // 'CSE' | 'IT' | etc.
  minCGPA:     '',   // numeric string
  maxCGPA:     '',
  minScore:    '',   // resume score
  placementStatus: '', // 'unplaced' | 'placed' | 'dream_placed'
};

/**
 * Applies all active filters to a flat list of applications.
 * Returns only apps that pass every active filter.
 */
function applyFilters(applications, filters) {
  return applications.filter((app) => {
    const student = app.student;
    const user    = student?.user;
    const resume  = app.resume;

    // search
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const inName  = user?.name?.toLowerCase().includes(q);
      const inEmail = user?.email?.toLowerCase().includes(q);
      const inRoll  = student?.rollNumber?.toLowerCase().includes(q);
      if (!inName && !inEmail && !inRoll) return false;
    }

    // branch
    if (filters.branch && student?.branch !== filters.branch) return false;

    // CGPA
    if (filters.minCGPA !== '' && student?.cgpa != null) {
      if (student.cgpa < parseFloat(filters.minCGPA)) return false;
    }
    if (filters.maxCGPA !== '' && student?.cgpa != null) {
      if (student.cgpa > parseFloat(filters.maxCGPA)) return false;
    }

    // resume score
    if (filters.minScore !== '' && resume?.score != null) {
      if (resume.score < parseFloat(filters.minScore)) return false;
    }

    // placement status
    if (filters.placementStatus && student?.placementStatus !== filters.placementStatus) {
      return false;
    }

    return true;
  });
}

export function usePipelineFilters(pipeline) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const setFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const hasActiveFilters = Object.entries(filters).some(
    ([, v]) => v !== ''
  );

  // apply filters to every stage column
  const filteredPipeline = useMemo(() => {
    if (!pipeline) return null;
    const result = {};
    for (const stage of Object.keys(pipeline)) {
      result[stage] = applyFilters(pipeline[stage] || [], filters);
    }
    return result;
  }, [pipeline, filters]);

  // total visible after filtering
  const visibleCount = useMemo(() => {
    if (!filteredPipeline) return 0;
    return Object.values(filteredPipeline).reduce((sum, arr) => sum + arr.length, 0);
  }, [filteredPipeline]);

  return {
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    filteredPipeline,
    visibleCount,
  };
}