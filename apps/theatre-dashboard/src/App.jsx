import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout & Guards
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { Roles, Permissions } from './store/auth.store';

// Auth Pages
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';

// Feature Pages
import DashboardOverviewPage from './features/overview/DashboardOverviewPage';
import TheatresPage from './features/theatres/TheatresPage';
import TheatreFormPage from './features/theatres/TheatreFormPage';
import TheatreDetailPage from './features/theatres/TheatreDetailPage';
import BranchesPage from './features/theatres/BranchesPage';
import BranchFormPage from './features/theatres/BranchFormPage';
import ScreensPage from './features/screens/ScreensPage';
import ScreenFormPage from './features/screens/ScreenFormPage';
import SeatLayoutBuilderPage from './features/screens/SeatLayoutBuilderPage';
import SeatCategoriesPage from './features/screens/SeatCategoriesPage';
import MoviesCatalogPage from './features/movies/MoviesCatalogPage';
import ShowsPage from './features/shows/ShowsPage';
import ShowFormPage from './features/shows/ShowFormPage';
import ShowCalendarPage from './features/shows/ShowCalendarPage';
import ShowPricingPage from './features/shows/ShowPricingPage';
import BookingsPage from './features/bookings/BookingsPage';
import BookingDetailPage from './features/bookings/BookingDetailPage';
import RevenueReportsPage from './features/revenue/RevenueReportsPage';
import StaffManagementPage from './features/staff/StaffManagementPage';
import OperationsLivePage from './features/operations/OperationsLivePage';
import NotificationsPage from './features/notifications/NotificationsPage';
import SettingsPage from './features/settings/SettingsPage';
import NotFoundPage from './features/common/NotFoundPage';

export function App() {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Dashboard Shell */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardOverviewPage />} />

        {/* Theatres & Branches */}
        <Route path="theatres" element={<TheatresPage />} />
        <Route
          path="theatres/create"
          element={
            <ProtectedRoute allowedRoles={[Roles.THEATRE_OWNER]} requiredPermission={Permissions.THEATRE_CREATE}>
              <TheatreFormPage />
            </ProtectedRoute>
          }
        />
        <Route path="theatres/:theatreId" element={<TheatreDetailPage />} />
        <Route path="theatres/:theatreId/edit" element={<TheatreFormPage />} />

        <Route path="branches" element={<BranchesPage />} />
        <Route path="branches/create" element={<BranchFormPage />} />
        <Route path="branches/:branchId/edit" element={<BranchFormPage />} />

        {/* Screens & Seat Layout Engine */}
        <Route path="screens" element={<ScreensPage />} />
        <Route path="screens/create" element={<ScreenFormPage />} />
        <Route path="screens/:screenId/edit" element={<ScreenFormPage />} />
        <Route path="screens/:screenId/layout" element={<SeatLayoutBuilderPage />} />
        <Route path="seat-categories" element={<SeatCategoriesPage />} />

        {/* Movies Master Catalog */}
        <Route path="movies" element={<MoviesCatalogPage />} />

        {/* Show Scheduling & Dynamic Pricing */}
        <Route path="shows" element={<ShowsPage />} />
        <Route path="shows/create" element={<ShowFormPage />} />
        <Route path="shows/calendar" element={<ShowCalendarPage />} />
        <Route path="shows/:showId/pricing" element={<ShowPricingPage />} />

        {/* Bookings & Admissions */}
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="bookings/:bookingId" element={<BookingDetailPage />} />

        {/* Financial Settlements (Restricted to Owner) */}
        <Route
          path="revenue"
          element={
            <ProtectedRoute allowedRoles={[Roles.THEATRE_OWNER]} requiredPermission={Permissions.REPORT_READ}>
              <RevenueReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Operations & Staff */}
        <Route path="staff" element={<StaffManagementPage />} />
        <Route path="operations" element={<OperationsLivePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />

        {/* 404 Catch-All */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;

