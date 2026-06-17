import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { format } from 'date-fns';
import {
  ArrowLeft, Upload, CheckCircle2, XCircle,
  FileText, Loader2, Eye, Building2,
  ShieldCheck, Clock, Award,
} from 'lucide-react';
import { toast } from 'sonner';

import { offerAPI }  from '@/api/offer.api';
import { Button }    from '@/components/ui/button';
import { Badge }     from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader    from '@/components/ui/PageHeader';
import EmptyState    from '@/components/ui/EmptyState';
import StatCard      from '@/components/ui/StatCard';
import { Skeleton }  from '@/components/ui/skeleton';
import { cn }        from '@/lib/utils';
import UploadOfferModal from '@/components/offers/UploadOfferModal';

// ── status config ─────────────────────────────────────────────
const STATUS_CONFIG = {
  uploaded: {
    label: 'Pending Verification',
    icon:  Clock,
    class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  verified: {
    label: 'Verified',
    icon:  ShieldCheck,
    class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  accepted: {
    label: 'Accepted',
    icon:  Award,
    class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  rejected: {
    label: 'Rejected',
    icon:  XCircle,
    class: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
  expired: {
    label: 'Expired',
    icon:  Clock,
    class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
};

function OfferStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.uploaded;
  return (
    <Badge className={cn('gap-1 border-0 text-[11px]', cfg.class)}>
      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
    </Badge>
  );
}

// ── single offer row ──────────────────────────────────────────
function OfferRow({ offer, canVerify, onVerify, verifying }) {
  const student  = offer.student;
  const userName = student?.user?.name || 'Unknown';
  const email    = student?.user?.email || '';

  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
      {/* avatar */}
      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-sm font-semibold text-primary">
          {userName.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{userName}</p>
        <p className="text-xs text-muted-foreground truncate">{email}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {student?.branch && (
            <span className="text-[11px] text-muted-foreground">{student.branch}</span>
          )}
          {offer.ctc && (
            <span className="text-[11px] font-medium text-emerald-600">
              ₹{offer.ctc} LPA
            </span>
          )}
          {offer.designation && (
            <span className="text-[11px] text-muted-foreground">{offer.designation}</span>
          )}
          {offer.joiningDate && (
            <span className="text-[11px] text-muted-foreground">
              Joining: {format(new Date(offer.joiningDate), 'dd MMM yyyy')}
            </span>
          )}
        </div>
      </div>

      {/* deadline */}
      {offer.responseDeadline && (
        <div className="text-right hidden sm:block shrink-0">
          <p className="text-[11px] text-muted-foreground">Respond by</p>
          <p className="text-xs font-medium">
            {format(new Date(offer.responseDeadline), 'dd MMM yyyy')}
          </p>
        </div>
      )}

      {/* status + actions */}
      <div className="flex items-center gap-2 shrink-0">
        <OfferStatusBadge status={offer.status} />

        {/* view PDF */}
        <a
          href={offer.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="View offer letter"
        >
          <Eye className="w-4 h-4" />
        </a>

        {/* verify button — TPO only, only for uploaded status */}
        {canVerify && offer.status === 'uploaded' && (
          <Button
            size="sm"
            className="h-7 px-3 text-xs gap-1"
            onClick={() => onVerify(offer._id)}
            disabled={verifying === offer._id}
          >
            {verifying === offer._id
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <ShieldCheck className="w-3 h-3" />}
            Verify
          </Button>
        )}
      </div>
    </div>
  );
}

// ── skeleton ──────────────────────────────────────────────────
function OfferRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-xl border bg-card">
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-6 w-20" />
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────
export default function OfferManager() {
  const { driveId }   = useParams();
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const { user }      = useSelector((s) => s.auth);

  const [uploadOpen, setUploadOpen]   = useState(false);
  const [verifying, setVerifying]     = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const isTpo    = ['tpo', 'admin'].includes(user?.role);
  const canUpload = ['recruiter', 'tpo', 'admin'].includes(user?.role);

  // fetch offers for this drive
  const { data, isLoading } = useQuery({
    queryKey: ['offers', driveId, statusFilter],
    queryFn:  () =>
      offerAPI.getByDrive(driveId, statusFilter !== 'all' ? { status: statusFilter } : {})
        .then((r) => r.data.data),
  });

  const offers = data?.offers || [];
  const total  = data?.total  || 0;

  // stats
  const stats = {
    total:    offers.length,
    uploaded: offers.filter((o) => o.status === 'uploaded').length,
    verified: offers.filter((o) => o.status === 'verified').length,
    accepted: offers.filter((o) => o.status === 'accepted').length,
    rejected: offers.filter((o) => o.status === 'rejected').length,
  };

  // verify mutation
  const verifyMutation = useMutation({
    mutationFn: (id) => offerAPI.verify(id),
    onMutate:   (id) => setVerifying(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['offers', driveId] });
      toast.success('Offer letter verified');
      setVerifying(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Verification failed');
      setVerifying(null);
    },
  });

  const STATUS_FILTERS = ['all', 'uploaded', 'verified', 'accepted', 'rejected', 'expired'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offer Letters"
        subtitle={`${total} offer letter${total !== 1 ? 's' : ''} for this drive`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            {canUpload && (
              <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5">
                <Upload className="w-4 h-4" /> Upload Offer
              </Button>
            )}
          </div>
        }
      />

      {/* stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Offers"    value={stats.total}    icon={FileText}      />
        <StatCard title="Pending"         value={stats.uploaded} icon={Clock}         />
        <StatCard title="Verified"        value={stats.verified} icon={ShieldCheck}   />
        <StatCard title="Accepted"        value={stats.accepted} icon={CheckCircle2}  />
      </div>

      {/* filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              statusFilter === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/40'
            )}
          >
            {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
            {s !== 'all' && stats[s] > 0 && (
              <span className="ml-1.5 opacity-70">{stats[s]}</span>
            )}
          </button>
        ))}
      </div>

      {/* offer list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <OfferRowSkeleton key={i} />)}
        </div>
      ) : offers.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No offer letters yet"
          description={
            statusFilter !== 'all'
              ? `No offers with status "${statusFilter}".`
              : 'Upload offer letters for students who have been extended an offer.'
          }
          action={
            canUpload && statusFilter === 'all' ? (
              <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5">
                <Upload className="w-4 h-4" /> Upload First Offer
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-2">
          {offers.map((offer) => (
            <OfferRow
              key={offer._id}
              offer={offer}
              canVerify={isTpo}
              onVerify={(id) => verifyMutation.mutate(id)}
              verifying={verifying}
            />
          ))}
        </div>
      )}

      {/* upload modal */}
      <UploadOfferModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        driveId={driveId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['offers', driveId] });
          setUploadOpen(false);
        }}
      />
    </div>
  );
}