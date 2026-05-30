import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SkillsInput from '@/components/ui/SkillsInput';
import { projectSchema } from '@/lib/validators/student.schema';

export default function ProjectFormModal({ open, onClose, onSubmit, project, loading }) {
  const [techStack, setTechStack] = useState([]);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(projectSchema),
  });

  useEffect(() => {
    if (project) {
      reset({
        title: project.title,
        description: project.description || '',
        link: project.link || '',
      });
      setTechStack(project.techStack || []);
    } else {
      reset({ title: '', description: '', link: '' });
      setTechStack([]);
    }
  }, [project, reset]);

  const handleFormSubmit = (data) => {
    onSubmit({ ...data, techStack });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? 'Edit Project' : 'Add Project'}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 mt-2">
        <div className="space-y-1">
          <Label>Title *</Label>
          <Input placeholder="PlacementOS" {...register('title')} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>Description</Label>
          <Textarea
            placeholder="Brief description of the project..."
            rows={3}
            {...register('description')}
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>Tech Stack</Label>
          <SkillsInput
            skills={techStack}
            onChange={setTechStack}
            max={15}
          />
        </div>

        <div className="space-y-1">
          <Label>Project Link</Label>
          <Input placeholder="https://github.com/..." {...register('link')} />
          {errors.link && <p className="text-xs text-destructive">{errors.link.message}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {project ? 'Save Changes' : 'Add Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}