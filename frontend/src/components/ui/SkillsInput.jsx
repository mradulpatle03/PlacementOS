import { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function SkillsInput({ skills = [], onChange, max = 30, disabled }) {
  const [input, setInput] = useState('');

  const addSkill = (raw) => {
    const skill = raw.trim();
    if (!skill) return;
    if (skills.includes(skill)) { setInput(''); return; }
    if (skills.length >= max) return;
    onChange([...skills, skill]);
    setInput('');
  };

  const removeSkill = (skill) => {
    onChange(skills.filter((s) => s !== skill));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(input);
    }
    if (e.key === 'Backspace' && input === '' && skills.length > 0) {
      removeSkill(skills[skills.length - 1]);
    }
  };

  return (
    <div className={cn('space-y-2')}>
      <div className="flex flex-wrap gap-2 min-h-10 p-2 border rounded-md bg-background">
        {skills.map((skill) => (
          <Badge key={skill} variant="secondary" className="gap-1 pr-1">
            {skill}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        {!disabled && (
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addSkill(input)}
            placeholder={skills.length === 0 ? 'Type skill and press Enter...' : ''}
            className="border-0 shadow-none p-0 h-6 w-32 focus-visible:ring-0 text-sm"
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {skills.length}/{max} skills · Press Enter or comma to add
      </p>
    </div>
  );
}