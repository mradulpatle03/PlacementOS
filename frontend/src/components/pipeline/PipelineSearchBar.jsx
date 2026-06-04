import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, SlidersHorizontal, X } from 'lucide-react';

export default function PipelineSearchBar({
  search,
  onSearchChange,
  onOpenFilters,
  hasActiveFilters,
  activeFilterCount,
  onClearSearch,
}) {
  const inputRef = useRef(null);

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {/* search input */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name, email, roll no…"
          className="pl-8 pr-8 h-8 text-sm"
        />
        {search && (
          <button
            onClick={() => {
              onClearSearch();
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* filter trigger button */}
      <Button
        variant={hasActiveFilters ? 'default' : 'outline'}
        size="sm"
        onClick={onOpenFilters}
        className="shrink-0"
      >
        <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
        Filters
        {activeFilterCount > 0 && (
          <Badge
            variant="secondary"
            className="ml-1.5 h-4 px-1 text-[10px] font-bold bg-primary-foreground text-primary"
          >
            {activeFilterCount}
          </Badge>
        )}
      </Button>
    </div>
  );
}