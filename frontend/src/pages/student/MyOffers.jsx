import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format, isPast, differenceInHours } from 'date-fns';
import {
  FileText, Award, Building2, MapPin, Calendar,
  Clock, CheckCircle2, XCircle, Eye, Loader2,
  ShieldCheck, AlertCircle, BriefcaseBusiness,
} from 'lucide-react';
import { toast } from 'sonner';

import { offerAPI }      from '@/api/offer.api';
import { Button }        from '@/components/ui/button';
import { Badge }         from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton }      from '@/components/ui/skeleton';
import PageHeader        from '@/components/ui/PageHeader';
import EmptyState        from '@/components/ui/EmptyState';
import ConfirmDialog     from '@/components/ui/ConfirmDialog';
import PDFPreviewModal   from '@/components/ui/PDFPreviewModal';
import { cn }            from '@/lib/utils';

// ── status config ─────────────────────────────────────────────
const STATUS_CONFIG = {
  uploaded: {
    label: 'Awaiting Verification',
    icon:  Clock,
    class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    desc:  'The TPO is reviewing your offer letter before you can respond.',
  },
  verified: {
    label: 'Ready to Respond',
    icon:  ShieldCheck,
    class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    desc:  'Your offer letter has been verified. Please accept or decline before the deadline.',
  },
  accepted: {
    label: 'Accepted 🎉',
    icon:  Award,
    class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    desc:  'You have accepted this offer. Congratulations!',
  },
  rejected: {
    label: 'Declined',
    icon:  XCircle,
    class: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    desc:  'You declined this offer.',
  },
  expired: {
    label: 'Expired',
    icon:  AlertCircle,
    class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    desc:  'The response deadline has passed.',
  },
};

// ── deadline countdown ────────────────────────────────────────
function DeadlineCountdown({ deadline }) {
  if (!deadline) return null;
  const d       = new Date(deadline);
  const expired = isPast(d);
  const hours   = differenceInHours(d, new Date());
  const urgent  = !expired && hours < 24;

  return (
    <div className={cn(
      'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
      expired
        ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
        : urgent
        ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 animate-pulse'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    )}>
      <Clock className="w-3 h-3" />
      {expired
        ? `Expired ${formatDistanceToNow(d, { addSuffix: true })}`
        : `Respond by ${format(d, 'dd MMM yyyy')} · ${formatDistanceToNow(d, { addSuffix: true })}`}
    </div>
  );
}

// ── reject reason modal ───────────────────────────────────────
function RejectModal({ open, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-background rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b">
          <h2 className="text-base font-semibold">Decline Offer</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Are you sure you want to decline this offer? This cannot be undone.
          </p>
        </div>
        <div className="px-6 py-4 space-y-3">
          <label className="text-xs font-medium text-muted-foreground block">
            Reason (optional)
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Accepting another offer, personal reasons…"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/20">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
            className="gap-1.5"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <XCircle className="w-4 h-4" />}
            Decline Offer
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── single offer card ─────────────────────────────────────────
function OfferCard({ offer, onAccept, onReject, onPreview, accepting, rejecting }) {
  const cfg        = STATUS_CONFIG[offer.status] || STATUS_CONFIG.uploaded;
  const StatusIcon = cfg.icon;
  const canRespond = offer.status === 'verified';
  const isExpired  = offer.responseDeadline && isPast(new Date(offer.responseDeadline));

  return (
    <Card className="overflow-hidden">
      {/* coloured top strip */}
      <div className={cn(
        'h-1.5 w-full',
        offer.status === 'accepted' ? 'bg-emerald-500' :
        offer.status === 'verified' ? 'bg-blue-500'    :
        offer.status === 'rejected' ? 'bg-red-400'     :
        offer.status === 'expired'  ? 'bg-gray-300'    :
        'bg-amber-400'
      )} />

      <CardContent className="pt-5 pb-5 px-5 space-y-4">

        {/* header row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {/* company logo placeholder */}
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {offer.company?.name || offer.drive?.title || 'Offer Letter'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {offer.drive?.title || ''}
              </p>
            </div>
          </div>

          <Badge className={cn('gap-1 border-0 text-[11px] shrink-0', cfg.class)}>
            <StatusIcon className="w-3 h-3" />
            {cfg.label}
          </Badge>
        </div>

        {/* offer details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {offer.ctc && (
            <div className="bg-muted/40 rounded-lg px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">CTC</p>
              <p className="text-sm font-bold text-emerald-600 mt-0.5">₹{offer.ctc} LPA</p>
            </div>
          )}
          {offer.designation && (
            <div className="bg-muted/40 rounded-lg px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Role</p>
              <p className="text-sm font-medium mt-0.5 truncate">{offer.designation}</p>
            </div>
          )}
          {offer.location && (
            <div className="bg-muted/40 rounded-lg px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Location</p>
              <p className="text-sm font-medium mt-0.5 flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                {offer.location}
              </p>
            </div>
          )}
          {offer.joiningDate && (
            <div className="bg-muted/40 rounded-lg px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Joining</p>
              <p className="text-sm font-medium mt-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 shrink-0" />
                {format(new Date(offer.joiningDate), 'dd MMM yyyy')}
              </p>
            </div>
          )}
        </div>

        {/* status description */}
        <p className="text-xs text-muted-foreground">{cfg.desc}</p>

        {/* deadline countdown — only when pending response */}
        {canRespond && offer.responseDeadline && (
          <DeadlineCountdown deadline={offer.responseDeadline} />
        )}

        {/* rejection reason */}
        {offer.status === 'rejected' && offer.rejectionReason && (
          <p className="text-xs text-muted-foreground italic">
            Reason: {offer.rejectionReason}
          </p>
        )}

        {/* footer actions */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {/* view PDF */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onPreview(offer)}
          >
            <Eye className="w-4 h-4" />
            View Offer Letter
          </Button>

          {/* accept / reject — only when verified and not expired */}
          {canRespond && !isExpired && (
            <>
              <Button
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => onAccept(offer._id)}
                disabled={accepting === offer._id || rejecting === offer._id}
              >
                {accepting === offer._id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />}
                Accept Offer
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={() => onReject(offer._id)}
                disabled={accepting === offer._id || rejecting === offer._id}
              >
                {rejecting === offer._id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <XCircle className="w-4 h-4" />}
                Decline
              </Button>
            </>
          )}

          {/* expired notice */}
          {canRespond && isExpired && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Deadline passed — contact the TPO
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── skeleton ──────────────────────────────────────────────────
function OfferCardSkeleton() {
  return (
    <Card>
      <div className="h-1.5 bg-muted" />
      <CardContent className="pt-5 pb-5 px-5 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
        <Skeleton className="h-3 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── main page ─────────────────────────────────────────────────
export default function MyOffers() {
  const queryClient = useQueryClient();

  const [acceptId,    setAcceptId]    = useState(null); // offer._id to accept
  const [rejectId,    setRejectId]    = useState(null); // offer._id to reject
  const [previewOffer, setPreviewOffer] = useState(null);
  const [accepting,   setAccepting]   = useState(null);
  const [rejecting,   setRejecting]   = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-offers'],
    queryFn:  () => offerAPI.getMy().then((r) => r.data.data),
  });

  const offers = data?.offers || [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['my-offers'] });

  // accept mutation
  const acceptMutation = useMutation({
    mutationFn: (id) => offerAPI.accept(id),
    onMutate:   (id) => setAccepting(id),
    onSuccess:  (res) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      const msg = res.data.message || 'Offer accepted!';
      toast.success(msg);
      setAcceptId(null);
      setAccepting(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to accept offer');
      setAcceptId(null);
      setAccepting(null);
    },
  });

  // reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => offerAPI.reject(id, reason),
    onMutate:   ({ id }) => setRejecting(id),
    onSuccess:  () => {
      invalidate();
      toast.success('Offer declined');
      setRejectId(null);
      setRejecting(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to decline offer');
      setRejectId(null);
      setRejecting(null);
    },
  });

  // counts
  const pending  = offers.filter((o) => o.status === 'verified').length;
  const accepted = offers.filter((o) => o.status === 'accepted').length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="My Offer Letters"
        subtitle={
          pending > 0
            ? `${pending} offer${pending > 1 ? 's' : ''} awaiting your response`
            : accepted > 0
            ? `${accepted} offer accepted — you're placed! 🎉`
            : `${offers.length} offer letter${offers.length !== 1 ? 's' : ''}`
        }
      />

      {/* list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <OfferCardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <p className="text-center text-sm text-destructive py-16">
          Failed to load offer letters.
        </p>
      ) : offers.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="No offer letters yet"
          description="When a recruiter uploads an offer letter for you, it will appear here."
        />
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => (
            <OfferCard
              key={offer._id}
              offer={offer}
              onAccept={(id) => setAcceptId(id)}
              onReject={(id) => setRejectId(id)}
              onPreview={(o) => setPreviewOffer(o)}
              accepting={accepting}
              rejecting={rejecting}
            />
          ))}
        </div>
      )}

      {/* accept confirm dialog */}
      <ConfirmDialog
        open={!!acceptId}
        onClose={() => setAcceptId(null)}
        onConfirm={() => acceptMutation.mutate(acceptId)}
        loading={acceptMutation.isPending}
        title="Accept this offer?"
        description="By accepting, you confirm your placement. If the one-offer policy is active, all your other active applications will be automatically withdrawn."
        confirmLabel="Yes, Accept Offer"
        variant="default"
      />

      {/* reject modal with optional reason */}
      <RejectModal
        open={!!rejectId}
        onClose={() => setRejectId(null)}
        onConfirm={(reason) => rejectMutation.mutate({ id: rejectId, reason })}
        loading={rejectMutation.isPending}
      />

      {/* PDF preview */}
      <PDFPreviewModal
        open={!!previewOffer}
        onClose={() => setPreviewOffer(null)}
        previewUrl={previewOffer?.fileUrl}
        title={`Offer Letter — ${previewOffer?.company?.name || 'Offer'}`}
      />
    </div>
  );
}