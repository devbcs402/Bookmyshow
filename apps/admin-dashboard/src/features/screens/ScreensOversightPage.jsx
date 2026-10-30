import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Monitor,
  Search,
  SlidersHorizontal,
  Eye,
  ChevronDown,
  LayoutGrid,
  AlertCircle,
} from 'lucide-react';
import { adminScreensApi } from '../../services/api/admin-screens.api';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';

// ─── Constants ───────────────────────────────────────────────────────────────

const PROJECTION_TYPES = ['2D', '3D', 'IMAX', '4DX'];
const PAGE_SIZE = 12;

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Projection type badge ────────────────────────────────────────────────────

const PROJECTION_BADGE_COLORS = {
  IMAX: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  '4DX': 'bg-purple-100 text-purple-700 border border-purple-200',
  '3D': 'bg-sky-100 text-sky-700 border border-sky-200',
  '2D': 'bg-slate-100 text-slate-600 border border-slate-200',
};

function ProjectionBadge({ type }) {
  const color =
    PROJECTION_BADGE_COLORS[type?.toUpperCase()] ||
    'bg-slate-100 text-slate-600 border border-slate-200';
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${color}`}
    >
      {type}
    </span>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function ScreensOversightPage() {
  const [searchInput, setSearchInput] = useState('');
  const [projectionFilter, setProjectionFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(searchInput, 400);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, projectionFilter, activeFilter]);

  const queryParams = {
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(projectionFilter && { projectionType: projectionFilter }),
    ...(activeFilter !== '' && { isActive: activeFilter === 'true' }),
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-screens-oversight', queryParams],
    queryFn: () => adminScreensApi.getAllScreens(queryParams),
    keepPreviousData: true,
  });

  const screens = data?.screens || [];
  const pagination = data?.pagination || null;

  const handleSearchChange = useCallback((e) => {
    setSearchInput(e.target.value);
  }, []);

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <Monitor className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Platform Screen Oversight
          </h1>
        </div>
        <p className="ml-11 text-sm text-slate-500">
          Platform-wide registry of all auditorium screens across partner theatres.
        </p>
      </div>

      {/* ── Search & Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by screen name or theatre..."
            value={searchInput}
            onChange={handleSearchChange}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
          />
        </div>

        {/* Projection Type Filter */}
        <div className="relative min-w-[160px]">
          <SlidersHorizontal className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <select
            value={projectionFilter}
            onChange={(e) => setProjectionFilter(e.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
          >
            <option value="">All Formats</option>
            {PROJECTION_TYPES.map((pt) => (
              <option key={pt} value={pt}>
                {pt}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Active Filter */}
        <div className="relative min-w-[140px]">
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3.5 pr-8 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* ── Data Table ───────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-72 items-center justify-center">
            <LoadingSpinner size="lg" text="Loading screens data..." />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <AlertCircle className="h-10 w-10 text-rose-400" />
            <p className="text-sm font-semibold text-slate-700">Failed to load screens</p>
            <p className="max-w-sm text-center text-xs text-slate-500">
              {error?.response?.data?.message || error?.message || 'An unexpected error occurred.'}
            </p>
          </div>
        ) : screens.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <LayoutGrid className="h-12 w-12 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No Screens Found</p>
            <p className="text-xs text-slate-500">
              No screens match your current filters. Try adjusting the search or format criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Screen Name</th>
                  <th className="px-5 py-3.5">Theatre</th>
                  <th className="px-5 py-3.5 text-center">Capacity</th>
                  <th className="px-5 py-3.5">Projection Types</th>
                  <th className="px-5 py-3.5">Audio</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {screens.map((screen) => (
                  <tr
                    key={screen._id}
                    className="transition-colors hover:bg-slate-50/70"
                  >
                    {/* Screen Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <Monitor className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{screen.name}</p>
                          <p className="font-mono text-[10px] text-slate-400">
                            {screen._id?.slice(-10)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Theatre */}
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">
                        {screen.theatre?.name || screen.theatreName || '—'}
                      </p>
                      {screen.theatre?.city && (
                        <p className="text-[10px] text-slate-400">{screen.theatre.city}</p>
                      )}
                    </td>

                    {/* Capacity */}
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                        {screen.capacity ?? screen.totalSeats ?? '—'}
                      </span>
                    </td>

                    {/* Projection Types */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(screen.projectionTypes?.length
                          ? screen.projectionTypes
                          : screen.projectionType
                          ? [screen.projectionType]
                          : []
                        ).map((pt) => (
                          <ProjectionBadge key={pt} type={pt} />
                        ))}
                        {!screen.projectionTypes?.length && !screen.projectionType && (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>

                    {/* Audio */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(screen.audioSystems?.length
                          ? screen.audioSystems
                          : screen.audioSystem
                          ? [screen.audioSystem]
                          : []
                        ).map((audio) => (
                          <span
                            key={audio}
                            className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                          >
                            {audio}
                          </span>
                        ))}
                        {!screen.audioSystems?.length && !screen.audioSystem && (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <StatusBadge status={screen.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/screens/${screen._id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        {pagination && (
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages || 1}
            totalItems={pagination.total || pagination.totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={(p) => setPage(p)}
          />
        )}
      </div>
    </div>
  );
}
