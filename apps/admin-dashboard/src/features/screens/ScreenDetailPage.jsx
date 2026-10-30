import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Monitor,
  Layers,
  Info,
  CheckCircle,
  AlertCircle,
  Building2,
  Users,
  Calendar,
  Tag,
} from 'lucide-react';
import { adminScreensApi } from '../../services/api/admin-screens.api';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDate, formatCompactNumber } from '../../utils/formatters';

// ─── Helper: format number with locale ────────────────────────────────────────

function fmt(n) {
  if (n === undefined || n === null) return '—';
  return Number(n).toLocaleString('en-IN');
}

// ─── Projection badge colours ──────────────────────────────────────────────

const PROJECTION_BADGE_COLORS = {
  IMAX: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  '4DX': 'bg-purple-100 text-purple-700 border-purple-200',
  '3D': 'bg-sky-100 text-sky-700 border-sky-200',
  '2D': 'bg-slate-100 text-slate-600 border-slate-200',
};

function ProjectionBadge({ type }) {
  const color =
    PROJECTION_BADGE_COLORS[type?.toUpperCase()] ||
    'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-widest uppercase ${color}`}
    >
      {type}
    </span>
  );
}

// ─── Audio badge ──────────────────────────────────────────────────────────────

function AudioBadge({ system }) {
  return (
    <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
      {system}
    </span>
  );
}

// ─── Category colour band (uses server-provided hex or falls back to a palette)

const FALLBACK_PALETTE = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#0ea5e9', // sky
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#ec4899', // pink
];

function CategoryBadge({ name, color, index }) {
  const bg = color || FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
  return (
    <span
      style={{ backgroundColor: bg + '1a', borderColor: bg, color: bg }}
      className="inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-bold tracking-wide uppercase"
    >
      {name}
    </span>
  );
}

// ─── Section Card wrapper ──────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, iconClass = 'text-indigo-600', children, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/60 px-6 py-4">
        <Icon className={`h-4 w-4 ${iconClass}`} />
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Detail Row ───────────────────────────────────────────────────────────────

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-xs">
      <span className="flex-shrink-0 font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span className="text-right font-medium text-slate-800">{value ?? '—'}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScreenDetailPage() {
  const { screenId } = useParams();
  const navigate = useNavigate();

  // ── Screen Info ────────────────────────────────────────────────────────────
  const {
    data: screen,
    isLoading: screenLoading,
    isError: screenError,
    error: screenFetchError,
  } = useQuery({
    queryKey: ['admin-screen-detail', screenId],
    queryFn: () => adminScreensApi.getScreenById(screenId),
    enabled: !!screenId,
  });

  // ── Published Layout ───────────────────────────────────────────────────────
  const {
    data: layout,
    isLoading: layoutLoading,
  } = useQuery({
    queryKey: ['admin-screen-layout', screenId],
    queryFn: () => adminScreensApi.getScreenLayout(screenId),
    enabled: !!screenId,
    // A null layout is a valid state — don't retry aggressively on 404
    retry: (failureCount, err) => {
      if (err?.response?.status === 404) return false;
      return failureCount < 2;
    },
  });

  // ── Loading ────────────────────────────────────────────────────────────────
  if (screenLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" text="Loading screen details..." />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (screenError || !screen) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertCircle className="h-12 w-12 text-rose-400" />
        <p className="text-sm font-semibold text-slate-700">Screen Not Found</p>
        <p className="max-w-sm text-center text-xs text-slate-500">
          {screenFetchError?.response?.data?.message ||
            screenFetchError?.message ||
            'The requested screen could not be loaded.'}
        </p>
        <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/screens')}>
          Back to Screens
        </Button>
      </div>
    );
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const projectionTypes = screen.projectionTypes?.length
    ? screen.projectionTypes
    : screen.projectionType
    ? [screen.projectionType]
    : [];

  const audioSystems = screen.audioSystems?.length
    ? screen.audioSystems
    : screen.audioSystem
    ? [screen.audioSystem]
    : [];

  const categories = layout?.categories || layout?.seatCategories || [];

  const totalLayoutSeats = categories.reduce(
    (sum, cat) => sum + (cat.totalSeats ?? cat.seats?.length ?? 0),
    0,
  );

  // Compute global price range across all categories
  const allPrices = categories.flatMap((cat) => {
    const prices = [];
    if (cat.price !== undefined) prices.push(cat.price);
    if (cat.basePrice !== undefined) prices.push(cat.basePrice);
    if (cat.priceRange) {
      if (cat.priceRange.min !== undefined) prices.push(cat.priceRange.min);
      if (cat.priceRange.max !== undefined) prices.push(cat.priceRange.max);
    }
    return prices;
  });
  const minPrice = allPrices.length ? Math.min(...allPrices) : null;
  const maxPrice = allPrices.length ? Math.max(...allPrices) : null;

  const priceRangeLabel =
    minPrice !== null && maxPrice !== null
      ? minPrice === maxPrice
        ? `₹${fmt(minPrice)}`
        : `₹${fmt(minPrice)} – ₹${fmt(maxPrice)}`
      : '—';

  return (
    <div className="space-y-6">
      {/* ── Back navigation ───────────────────────────────────────────────── */}
      <div>
        <Link
          to="/screens"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to All Screens
        </Link>
      </div>

      {/* ── Page Header Card ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
              <Monitor className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {screen.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Building2 className="h-3.5 w-3.5" />
                  {screen.theatre?.name || screen.theatreName || 'Theatre N/A'}
                </span>
                {screen.theatre?.city && (
                  <span className="text-xs text-slate-400">· {screen.theatre.city}</span>
                )}
              </div>
              <div className="mt-2">
                <StatusBadge status={screen.isActive ? 'ACTIVE' : 'INACTIVE'} />
              </div>
            </div>
          </div>

          {/* Capacity pill */}
          <div className="flex flex-shrink-0 flex-col items-center rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-center">
            <Users className="mx-auto h-4 w-4 text-slate-400" />
            <span className="mt-1 text-2xl font-bold text-slate-900">
              {fmt(screen.capacity ?? screen.totalSeats)}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Total Capacity
            </span>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — Technical Specs */}
        <div className="space-y-6 lg:col-span-1">
          <SectionCard title="Technical Specifications" icon={Monitor}>
            <div className="divide-y divide-slate-100">
              {/* Projection Types */}
              <div className="pb-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Projection Formats
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {projectionTypes.length ? (
                    projectionTypes.map((pt) => <ProjectionBadge key={pt} type={pt} />)
                  ) : (
                    <span className="text-xs text-slate-400">Not specified</span>
                  )}
                </div>
              </div>

              {/* Audio Systems */}
              <div className="py-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Audio Systems
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {audioSystems.length ? (
                    audioSystems.map((audio) => <AudioBadge key={audio} system={audio} />)
                  ) : (
                    <span className="text-xs text-slate-400">Not specified</span>
                  )}
                </div>
              </div>

              {/* Dimensions */}
              <div className="pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Screen Dimensions
                </p>
                {screen.dimensions ? (
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                    {screen.dimensions.width !== undefined && (
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-center">
                        <p className="text-lg font-bold text-slate-900">
                          {screen.dimensions.width}
                          <span className="ml-0.5 text-xs font-normal text-slate-500">ft</span>
                        </p>
                        <p className="text-[10px] font-medium text-slate-400">Width</p>
                      </div>
                    )}
                    {screen.dimensions.height !== undefined && (
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-center">
                        <p className="text-lg font-bold text-slate-900">
                          {screen.dimensions.height}
                          <span className="ml-0.5 text-xs font-normal text-slate-500">ft</span>
                        </p>
                        <p className="text-[10px] font-medium text-slate-400">Height</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Dimensions not on record</span>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Screen meta */}
          <SectionCard title="Record Info" icon={Info} iconClass="text-slate-500">
            <div className="divide-y divide-slate-100">
              <DetailRow label="Screen ID" value={<span className="font-mono text-[10px]">{screen._id}</span>} />
              <DetailRow
                label="Created"
                value={formatDate(screen.createdAt)}
              />
              <DetailRow
                label="Last Updated"
                value={formatDate(screen.updatedAt)}
              />
            </div>
          </SectionCard>
        </div>

        {/* Right column — Layout Overview */}
        <div className="space-y-6 lg:col-span-2">
          {layoutLoading ? (
            <div className="flex h-40 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
              <LoadingSpinner size="md" text="Loading published layout..." />
            </div>
          ) : layout ? (
            <>
              {/* Published Layout Overview Card */}
              <SectionCard
                title="Published Layout Overview"
                icon={Layers}
                iconClass="text-emerald-600"
              >
                {/* Summary stats row */}
                <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-center">
                    <p className="text-xl font-bold text-slate-900">{fmt(totalLayoutSeats)}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Total Seats
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-center">
                    <p className="text-xl font-bold text-slate-900">{categories.length}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Categories
                    </p>
                  </div>
                  <div className="col-span-2 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-center sm:col-span-1">
                    <p className="text-xl font-bold text-slate-900">{priceRangeLabel}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Seat Price Range
                    </p>
                  </div>
                </div>

                {/* Version Info */}
                {(layout.version || layout.publishedAt || layout.createdAt) && (
                  <div className="mb-5 flex flex-wrap items-center gap-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-800">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="font-semibold">Version</span>
                      <span className="font-mono font-bold">
                        {layout.version ?? layout.versionNumber ?? 'v1'}
                      </span>
                    </div>
                    {(layout.publishedAt || layout.createdAt) && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-800">
                        <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Published</span>
                        <span className="font-semibold">
                          {formatDate(layout.publishedAt || layout.createdAt)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Immutability Notice */}
                <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <p className="text-xs leading-relaxed text-blue-800">
                    <span className="font-semibold">Published layouts are immutable.</span>{' '}
                    Historical seat references are preserved to ensure booking integrity and audit compliance.
                  </p>
                </div>

                {/* Categories List */}
                {categories.length > 0 && (
                  <div>
                    <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <Tag className="h-3 w-3" />
                      Seat Categories
                    </p>
                    <div className="space-y-2">
                      {categories.map((cat, idx) => {
                        const catSeats =
                          cat.totalSeats ?? cat.seats?.length ?? cat.seatCount ?? null;
                        const catPrice =
                          cat.price ?? cat.basePrice ?? cat.priceRange?.min ?? null;
                        const catMaxPrice = cat.priceRange?.max ?? null;
                        return (
                          <div
                            key={cat._id || cat.name || idx}
                            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <CategoryBadge
                                name={cat.name || cat.categoryName || `Category ${idx + 1}`}
                                color={cat.color}
                                index={idx}
                              />
                            </div>
                            <div className="flex items-center gap-4 text-right">
                              {catSeats !== null && (
                                <div>
                                  <p className="text-xs font-bold text-slate-900">
                                    {fmt(catSeats)}
                                  </p>
                                  <p className="text-[10px] text-slate-500">seats</p>
                                </div>
                              )}
                              {catPrice !== null && (
                                <div>
                                  <p className="text-xs font-bold text-slate-900">
                                    ₹{fmt(catPrice)}
                                    {catMaxPrice && catMaxPrice !== catPrice
                                      ? ` – ₹${fmt(catMaxPrice)}`
                                      : ''}
                                  </p>
                                  <p className="text-[10px] text-slate-500">price</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </SectionCard>
            </>
          ) : (
            /* No Published Layout */
            <SectionCard title="Published Layout Overview" icon={Layers} iconClass="text-slate-400">
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <Layers className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No Published Layout</p>
                <p className="max-w-xs text-center text-xs text-slate-400">
                  This screen does not have a published seat layout yet. The theatre owner must
                  publish a layout from the Owner Dashboard before shows can be scheduled.
                </p>
              </div>
              {/* Still show the immutability note for reference */}
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                <p className="text-xs leading-relaxed text-blue-800">
                  <span className="font-semibold">Published layouts are immutable.</span>{' '}
                  Historical seat references are preserved to ensure booking integrity and audit compliance.
                </p>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
