import { z } from 'zod';

export const recruiterProfileSchema = z.object({
  designation: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(15).optional(),
  linkedinProfile: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  bio: z.string().max(500).optional(),
});

export const verifyRecruiterSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
}).refine((d) => {
  if (d.action === 'reject' && !d.rejectionReason?.trim()) return false;
  return true;
}, { message: 'Rejection reason is required', path: ['rejectionReason'] });