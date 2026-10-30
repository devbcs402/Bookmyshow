import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';

// ─── Auth ──────────────────────────────────────────────────────────────────────
const LoginPage = React.lazy(() => import('./features/auth/LoginPage'));
const UnauthorizedPage = React.lazy(() => import('./features/common/UnauthorizedPage'));
const NotFoundPage = React.lazy(() => import('./features/common/NotFoundPage'));

// ─── Overview ──────────────────────────────────────────────────────────────────
const MasterOverviewPage = React.lazy(() => import('./features/overview/MasterOverviewPage'));

// ─── Users ─────────────────────────────────────────────────────────────────────
const UserExplorerPage = React.lazy(() => import('./features/users/UserExplorerPage'));

// ─── Approvals ─────────────────────────────────────────────────────────────────
const TheatreApprovalsPage = React.lazy(() => import('./features/approvals/TheatreApprovalsPage'));
const TheatreApprovalDetailPage = React.lazy(() => import('./features/approvals/TheatreApprovalDetailPage'));

// ─── Theatres ──────────────────────────────────────────────────────────────────
const TheatresManagementPage = React.lazy(() => import('./features/theatres/TheatresManagementPage'));
const TheatreDetailPage = React.lazy(() => import('./features/theatres/TheatreDetailPage'));

// ─── Movies ────────────────────────────────────────────────────────────────────
const MoviesManagementPage = React.lazy(() => import('./features/movies/MoviesManagementPage'));
const MovieDetailPage = React.lazy(() => import('./features/movies/MovieDetailPage'));
const MovieApprovalsPage = React.lazy(() => import('./features/movies/MovieApprovalsPage'));

// ─── Screens ───────────────────────────────────────────────────────────────────
const ScreensOversightPage = React.lazy(() => import('./features/screens/ScreensOversightPage'));
const ScreenDetailPage = React.lazy(() => import('./features/screens/ScreenDetailPage'));

// ─── Shows ─────────────────────────────────────────────────────────────────────
const ShowsOversightPage = React.lazy(() => import('./features/shows/ShowsOversightPage'));
const ShowDetailPage = React.lazy(() => import('./features/shows/ShowDetailPage'));

// ─── Bookings ──────────────────────────────────────────────────────────────────
const BookingsManagementPage = React.lazy(() => import('./features/bookings/BookingsManagementPage'));
const BookingDetailPage = React.lazy(() => import('./features/bookings/BookingDetailPage'));

// ─── Payments & Refunds ────────────────────────────────────────────────────────
const PaymentsManagementPage = React.lazy(() => import('./features/payments/PaymentsManagementPage'));
const RefundsManagementPage = React.lazy(() => import('./features/payments/RefundsManagementPage'));

// ─── Commissions & Settlements ─────────────────────────────────────────────────
const CommissionSettingsPage = React.lazy(() => import('./features/commissions/CommissionSettingsPage'));
const SettlementsManagementPage = React.lazy(() => import('./features/settlements/SettlementsManagementPage'));

// ─── Coupons ───────────────────────────────────────────────────────────────────
const CouponsPromotionsPage = React.lazy(() => import('./features/coupons/CouponsPromotionsPage'));

// ─── Notifications ─────────────────────────────────────────────────────────────
const AnnouncementsPage = React.lazy(() => import('./features/notifications/AnnouncementsPage'));

// ─── Analytics ─────────────────────────────────────────────────────────────────
const PlatformAnalyticsPage = React.lazy(() => import('./features/analytics/PlatformAnalyticsPage'));

// ─── Audit Logs ────────────────────────────────────────────────────────────────
const AuditLogsPage = React.lazy(() => import('./features/audit-logs/AuditLogsPage'));

// ─── System Health ─────────────────────────────────────────────────────────────
const SystemHealthPage = React.lazy(() => import('./features/health/SystemHealthPage'));

// ─── Settings ──────────────────────────────────────────────────────────────────
const PlatformSettingsPage = React.lazy(() => import('./features/settings/PlatformSettingsPage'));

// ─── TanStack Query Client ─────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,          // 1 minute
      gcTime: 5 * 60_000,         // 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on 401/403/404
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false, // never retry mutations (financial safety)
    },
  },
});

const PageLoader = () => (
  <div className="flex h-64 w-full items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Public Routes ────────────────────────────────────────── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* ── Protected Admin Routes ───────────────────────────────── */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              {/* Overview */}
              <Route index element={<MasterOverviewPage />} />

              {/* Users */}
              <Route path="users" element={<UserExplorerPage />} />

              {/* Theatre Approvals */}
              <Route path="theatre-approvals" element={<TheatreApprovalsPage />} />
              <Route path="theatre-approvals/:theatreId" element={<TheatreApprovalDetailPage />} />

              {/* Theatres */}
              <Route path="theatres" element={<TheatresManagementPage />} />
              <Route path="theatres/:theatreId" element={<TheatreDetailPage />} />

              {/* Movies */}
              <Route path="movies" element={<MoviesManagementPage />} />
              <Route path="movies/:movieId" element={<MovieDetailPage />} />
              <Route path="movie-approvals" element={<MovieApprovalsPage />} />

              {/* Screens */}
              <Route path="screens" element={<ScreensOversightPage />} />
              <Route path="screens/:screenId" element={<ScreenDetailPage />} />

              {/* Shows */}
              <Route path="shows" element={<ShowsOversightPage />} />
              <Route path="shows/:showId" element={<ShowDetailPage />} />

              {/* Bookings */}
              <Route path="bookings" element={<BookingsManagementPage />} />
              <Route path="bookings/:bookingId" element={<BookingDetailPage />} />

              {/* Payments & Refunds */}
              <Route path="payments" element={<PaymentsManagementPage />} />
              <Route path="refunds" element={<RefundsManagementPage />} />

              {/* Commissions & Settlements */}
              <Route path="commissions" element={<CommissionSettingsPage />} />
              <Route path="settlements" element={<SettlementsManagementPage />} />

              {/* Coupons */}
              <Route path="coupons" element={<CouponsPromotionsPage />} />

              {/* Notifications */}
              <Route path="notifications" element={<AnnouncementsPage />} />

              {/* Analytics */}
              <Route path="analytics" element={<PlatformAnalyticsPage />} />

              {/* Audit Logs */}
              <Route path="audit-logs" element={<AuditLogsPage />} />

              {/* System Health */}
              <Route path="system-health" element={<SystemHealthPage />} />

              {/* Platform Settings */}
              <Route path="settings" element={<PlatformSettingsPage />} />

              {/* Catch-all 404 inside dashboard */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Root 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

