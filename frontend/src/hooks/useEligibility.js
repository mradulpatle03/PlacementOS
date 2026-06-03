import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';

// single drive — used in DriveDetail and the modal
export const useCheckEligibility = (driveId, options = {}) => {
  return useQuery({
    queryKey: ['eligibility', driveId],
    queryFn: async () => {
      const { data } = await api.get(`/drives/${driveId}/check-eligibility`);
      return data.data;
    },
    enabled: !!driveId,
    staleTime: 1000 * 60 * 5, // 5 min — eligibility doesn't change mid-session
    ...options,
  });
};