import { z } from 'zod';

export const companySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  sector: z.enum([
    'Technology', 'Finance', 'Consulting', 'Manufacturing',
    'Healthcare', 'E-commerce', 'Automobile', 'Education',
    'Media', 'Government', 'Other',
  ]).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  description: z.string().max(1000).optional(),
  packageRange: z.object({
    min: z.coerce.number().min(0).optional(),
    max: z.coerce.number().min(0).optional(),
  }).optional(),
});