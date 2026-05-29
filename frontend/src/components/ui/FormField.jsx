// Wraps label + input + error message — used with react-hook-form
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function FormField({
  label, id, error, className, ...inputProps
}) {
  return (
    <div className={cn('space-y-1', className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <Input id={id} {...inputProps} className={cn(error && 'border-destructive')} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}