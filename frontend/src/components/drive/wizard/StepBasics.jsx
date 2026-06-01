import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { companyAPI } from '@/api/company.api';

const schema = z.object({
  company: z.string().min(1, 'Company is required'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  roles: z.array(z.object({
    title: z.string().min(1, 'Role title required'),
    ctc: z.coerce.number().min(0, 'CTC required'),
    openings: z.coerce.number().min(1).default(1),
    description: z.string().optional(),
  })).min(1, 'At least one role required'),
  location: z.string().optional(),
  mode: z.enum(['oncampus', 'offcampus', 'hybrid']),
  applicationDeadline: z.string().min(1, 'Deadline is required'),
  driveDate: z.string().optional(),
});

export default function StepBasics({ data, onNext }) {
  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      ...data,
      roles: data.roles?.length ? data.roles : [{ title: '', ctc: '', openings: 1, description: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'roles' });

  const { data: companiesData } = useQuery({
    queryKey: ['companies', {}],
    queryFn: async () => {
      const res = await companyAPI.getAll({ limit: 100 });
      return res.data.companies;
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      {/* company + title */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Company *</Label>
          <Select
            defaultValue={data.company}
            onValueChange={(v) => setValue('company', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              {(companiesData || []).map((c) => (
                <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.company && <p className="text-xs text-destructive">{errors.company.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>Drive Title *</Label>
          <Input placeholder="SDE 2025 Drive" {...register('title')} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>
      </div>

      {/* roles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Roles *</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ title: '', ctc: '', openings: 1, description: '' })}
          >
            <Plus className="h-3 w-3 mr-1" /> Add Role
          </Button>
        </div>

        {fields.map((field, i) => (
          <div key={field.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Role {i + 1}</p>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => remove(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Title *</Label>
                <Input placeholder="Software Engineer" {...register(`roles.${i}.title`)} />
                {errors.roles?.[i]?.title && (
                  <p className="text-xs text-destructive">{errors.roles[i].title.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CTC (LPA) *</Label>
                <Input type="number" placeholder="24" {...register(`roles.${i}.ctc`)} />
                {errors.roles?.[i]?.ctc && (
                  <p className="text-xs text-destructive">{errors.roles[i].ctc.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Openings</Label>
                <Input type="number" min={1} placeholder="5" {...register(`roles.${i}.openings`)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input placeholder="Brief role description" {...register(`roles.${i}.description`)} />
              </div>
            </div>
          </div>
        ))}
        {errors.roles && !Array.isArray(errors.roles) && (
          <p className="text-xs text-destructive">{errors.roles.message}</p>
        )}
      </div>

      <Separator />

      {/* location + mode */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Location</Label>
          <Input placeholder="Bangalore" {...register('location')} />
        </div>
        <div className="space-y-1">
          <Label>Mode</Label>
          <Select defaultValue={data.mode || 'oncampus'} onValueChange={(v) => setValue('mode', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="oncampus">On Campus</SelectItem>
              <SelectItem value="offcampus">Off Campus</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* deadlines */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Application Deadline *</Label>
          <Input
            type="datetime-local"
            {...register('applicationDeadline')}
            min={new Date().toISOString().slice(0, 16)}
          />
          {errors.applicationDeadline && (
            <p className="text-xs text-destructive">{errors.applicationDeadline.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Drive Date</Label>
          <Input type="datetime-local" {...register('driveDate')} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">Next: Eligibility →</Button>
      </div>
    </form>
  );
}