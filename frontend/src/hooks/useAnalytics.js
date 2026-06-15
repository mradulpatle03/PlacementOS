import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { analyticsAPI } from '@/api/analytics.api';

// staleTime mirrors server Redis TTL
const STALE = {
  tpo:     5 * 60 * 1000,
  branch:  5 * 60 * 1000,
  company: 5 * 60 * 1000,
  student: 2 * 60 * 1000,
  funnel:  5 * 60 * 1000,
  drive:   60 * 1000,
};

export const useTPOAnalytics = (year) =>
  useQuery({
    queryKey:  ['analytics', 'tpo', year],
    queryFn:   () => analyticsAPI.getTpo({ year }).then((r) => r.data.data),
    staleTime: STALE.tpo,
  });

export const useBranchAnalytics = (branch, year) =>
  useQuery({
    queryKey:  ['analytics', 'branch', branch, year],
    queryFn:   () => analyticsAPI.getBranch(branch, { year }).then((r) => r.data.data),
    staleTime: STALE.branch,
    enabled:   !!branch,
  });

export const useCompanyAnalytics = (companyId) =>
  useQuery({
    queryKey:  ['analytics', 'company', companyId],
    queryFn:   () => analyticsAPI.getCompany(companyId).then((r) => r.data.data),
    staleTime: STALE.company,
    enabled:   !!companyId,
  });

export const useStudentAnalytics = () => {
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  return useQuery({
    queryKey:  ['analytics', 'student', 'me'],
    queryFn:   () => analyticsAPI.getStudentMe().then((r) => r.data.data),
    staleTime: STALE.student,
    enabled:   isAuthenticated && user?.role === 'student',
  });
};

export const useOverallFunnel = (year) =>
  useQuery({
    queryKey:  ['analytics', 'funnel', 'overall', year],
    queryFn:   () => analyticsAPI.getOverallFunnel({ year }).then((r) => r.data.data),
    staleTime: STALE.funnel,
  });

export const useDriveFunnel = (driveId) =>
  useQuery({
    queryKey:     ['analytics', 'funnel', 'drive', driveId],
    queryFn:      () => analyticsAPI.getDriveFunnel(driveId).then((r) => r.data.data),
    staleTime:    STALE.drive,
    enabled:      !!driveId,
    refetchInterval: 60 * 1000,
  });

export const useDriveConversionSummary = (limit = 10) =>
  useQuery({
    queryKey:  ['analytics', 'funnel', 'drives', limit],
    queryFn:   () => analyticsAPI.getDriveConversion({ limit }).then((r) => r.data.data),
    staleTime: STALE.funnel,
  });

export const useInvalidateAnalyticsCache = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => analyticsAPI.invalidateCache(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Analytics cache cleared');
    },
    onError: () => toast.error('Failed to clear cache'),
  });
};