import React, { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import RootLayout from '../layouts/RootLayout';
import ProtectedRoute from './ProtectedRoute';

// Lazy loaded page components for optimal bundle splitting
const HomePage = lazy(() => import('../../features/home/HomePage'));
const MoviesPage = lazy(() => import('../../features/movies/MoviesPage'));
const MovieDetailsPage = lazy(() => import('../../features/movies/MovieDetailsPage'));
const SearchPage = lazy(() => import('../../features/movies/SearchPage'));
const TheatresPage = lazy(() => import('../../features/theatres/TheatresPage'));
const TheatreDetailPage = lazy(() => import('../../features/theatres/TheatreDetailPage'));
const SeatSelectionPage = lazy(() => import('../../features/seat-selection/SeatSelectionPage'));
const BookingReviewPage = lazy(() => import('../../features/bookings/BookingReviewPage'));
const PaymentPage = lazy(() => import('../../features/payments/PaymentPage'));
const BookingConfirmationPage = lazy(() => import('../../features/bookings/BookingConfirmationPage'));
const MyBookingsPage = lazy(() => import('../../features/bookings/MyBookingsPage'));
const ProfilePage = lazy(() => import('../../features/profile/ProfilePage'));
const NotificationsPage = lazy(() => import('../../features/notifications/NotificationsPage'));
const WishlistPage = lazy(() => import('../../features/wishlist/WishlistPage'));
const LoginPage = lazy(() => import('../../features/auth/LoginPage'));
const RegisterPage = lazy(() => import('../../features/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../../features/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../../features/auth/ResetPasswordPage'));
const NotFoundPage = lazy(() => import('../../components/common/NotFoundPage'));

// Fallback spinner during route transitions
const PageLoader = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
    <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
    <span className="text-xs text-slate-400">Loading cinema experience...</span>
  </div>
);

const withSuspense = Component => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // Public Discovery & Catalog Routes
      {
        index: true,
        element: withSuspense(HomePage)
      },
      {
        path: 'movies',
        element: withSuspense(MoviesPage)
      },
      {
        path: 'movies/:movieSlug',
        element: withSuspense(MovieDetailsPage)
      },
      {
        path: 'search',
        element: withSuspense(SearchPage)
      },
      {
        path: 'theatres',
        element: withSuspense(TheatresPage)
      },
      {
        path: 'theatres/:theatreId',
        element: withSuspense(TheatreDetailPage)
      },
      {
        path: 'theatres/id/:theatreId',
        element: withSuspense(TheatreDetailPage)
      },

      // Seat Selection (Public/Guest browsable, login enforced on lock/review)
      {
        path: 'booking/:showId/seats',
        element: withSuspense(SeatSelectionPage)
      },

      // Public Authentication Routes
      {
        path: 'login',
        element: withSuspense(LoginPage)
      },
      {
        path: 'register',
        element: withSuspense(RegisterPage)
      },
      {
        path: 'forgot-password',
        element: withSuspense(ForgotPasswordPage)
      },
      {
        path: 'reset-password',
        element: withSuspense(ResetPasswordPage)
      },

      // Wishlist
      {
        path: 'wishlist',
        element: withSuspense(WishlistPage)
      },

      // Protected Booking Lifecycle Routes
      {
        path: 'booking/:bookingId/review',
        element: (
          <ProtectedRoute>
            {withSuspense(BookingReviewPage)}
          </ProtectedRoute>
        )
      },
      {
        path: 'booking/:bookingId/payment',
        element: (
          <ProtectedRoute>
            {withSuspense(PaymentPage)}
          </ProtectedRoute>
        )
      },
      {
        path: 'booking/:bookingId/confirmation',
        element: (
          <ProtectedRoute>
            {withSuspense(BookingConfirmationPage)}
          </ProtectedRoute>
        )
      },

      // Protected Customer Account Routes
      {
        path: 'my-bookings',
        element: (
          <ProtectedRoute>
            {withSuspense(MyBookingsPage)}
          </ProtectedRoute>
        )
      },
      {
        path: 'my-bookings/:bookingId',
        element: (
          <ProtectedRoute>
            {withSuspense(BookingConfirmationPage)}
          </ProtectedRoute>
        )
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            {withSuspense(ProfilePage)}
          </ProtectedRoute>
        )
      },
      {
        path: 'notifications',
        element: (
          <ProtectedRoute>
            {withSuspense(NotificationsPage)}
          </ProtectedRoute>
        )
      },

      // 404 Catch-All
      {
        path: '*',
        element: withSuspense(NotFoundPage)
      }
    ]
  }
]);

export default router;

