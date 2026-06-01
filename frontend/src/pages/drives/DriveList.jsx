import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Search, Plus, Briefcase, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '@/components/ui/Spinner';
import DriveCard from '@/components/drive/DriveCard';
import DriveFilters from '@/components/drive/DriveFilters';
import { driveAPI } from '@/api/drive.api';
import { useDriveFilters } from '@/hooks/useDriveFilters';

export default function DriveList() {
  const { user } = useSelector((s) => s.auth);
  const canCreate = ['tpo', 'admin'].includes(user?.role);
  const { filters, setFilter, clearFilters, hasActiveFilters, params } = useDriveFilters();

  const { data, isLoading } = useQuery({
    queryKey: ['drives', params],
    queryFn: async () => {
      const res = await driveAPI.getAll(params);
      return res.data;
    },
    keepPreviousData: true,
  });

  const drives = data?.drives || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Placement Drives"
        subtitle={pagination ? `${pagination.total} drive${pagination.total !== 1 ? 's' : ''} found` : ''}
        actions={
          canCreate && (
            <Button asChild>
              <Link to="/drives/create">
                <Plus className="h-4 w-4 mr-2" /> Create Drive
              </Link>
            </Button>
          )
        }
      />

      <div className="flex gap-6">
        {/* ── sidebar filters — desktop ── */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-24 bg-background border rounded-lg p-4">
            <DriveFilters
              filters={filters}
              setFilter={setFilter}
              clearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
              role={user?.role}
            />
          </div>
        </aside>

        {/* ── main content ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* search + mobile filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drives..."
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
                className="pl-9"
              />
            </div>

            {/* mobile filter button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <div className="pt-6">
                  <DriveFilters
                    filters={filters}
                    setFilter={setFilter}
                    clearFilters={clearFilters}
                    hasActiveFilters={hasActiveFilters}
                    role={user?.role}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(filters).map(([key, val]) => {
                if (!val || key === 'sortBy' || key === 'sortOrder') return null;
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                  >
                    {key}: {val}
                    <button onClick={() => setFilter(key, '')} className="hover:text-destructive">×</button>
                  </span>
                );
              })}
            </div>
          )}

          {/* results */}
          {isLoading && <Spinner className="mt-10" />}

          {!isLoading && drives.length === 0 && (
            <EmptyState
              icon={Briefcase}
              title="No drives found"
              description={hasActiveFilters ? 'Try adjusting your filters' : 'No placement drives available yet'}
              action={hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
              )}
            />
          )}

          <div className="space-y-3">
            {drives.map((drive) => (
              <DriveCard
                key={drive._id}
                drive={drive}
                actions={
                  canCreate ? (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/drives/${drive._id}`}>View</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/drives/${drive._id}/edit`}>Edit</Link>
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" asChild>
                      <Link to={`/drives/${drive._id}`}>View Details</Link>
                    </Button>
                  )
                }
              />
            ))}
          </div>

          {/* pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setFilter('page', pagination.page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setFilter('page', pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}