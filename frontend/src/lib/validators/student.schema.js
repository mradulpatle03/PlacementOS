import { z } from 'zod';

export const profileSchema = z.object({
  rollNumber: z.string().trim().optional(),
  branch: z.enum(['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE', 'Other']).optional(),
  graduationYear: z.coerce.number().min(2000).max(2100).optional(),
  cgpa: z.coerce.number().min(0).max(10).optional(),
  backlogs: z.coerce.number().min(0).optional(),
  socialLinks: z.object({
    linkedin: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
    github: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
    portfolio: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  }).optional(),
});

export const projectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  techStack: z.array(z.string()).optional(),
  link: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
});