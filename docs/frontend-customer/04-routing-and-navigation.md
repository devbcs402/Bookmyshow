# Routing, Navigation & Route Guards
**Part 15: Customer Frontend Development (React)**
**Document Reference: `docs/frontend-customer/04-routing-and-navigation.md`**

---

## 1. Route Map & Permissions

All application routes are defined in `apps/customer-frontend/src/app/router/index.jsx` using React Router v6 Data API (`createBrowserRouter`).

| Route | Component | Guard | Description |
|---|---|---|---|
| `/` | `HomePage` | Public | Discovery hero banner, carousels, trending movies |
| `/movies` | `MoviesPage` | Public | Multi-facet catalog with genre, language, status filters |
| `/movies/:movieSlug` | `MovieDetailsPage` | Public | Movie synopsis, cast, trailer, date selector, theatres |
| `/search` | `SearchPage` | Public | Keyword search results across all movies |
| `/theatres` | `TheatresPage` | Public | Cinemas in selected city with facility filters |
| `/theatres/id/:theatreId` | `TheatreDetailPage` | Public | Cinema info, facilities, movie schedules |
| `/booking/:showId/seats` | `SeatSelectionPage` | Public / Guest | Interactive seating grid; requires auth on proceed |
| `/login` | `LoginPage` | Public | Customer authentication |
| `/register` | `RegisterPage` | Public | Customer registration |
| `/forgot-password` | `ForgotPasswordPage` | Public | Password recovery link dispatch |
| `/reset-password` | `ResetPasswordPage` | Public | Password reset execution with token |
| `/wishlist` | `WishlistPage` | Public | Saved movies listing |
| `/booking/:bookingId/review` | `BookingReviewPage` | `ProtectedRoute` | Itemized order review & pricing breakdown |
| `/booking/:bookingId/payment` | `PaymentPage` | `ProtectedRoute` | Razorpay gateway order execution & verification |
| `/booking/:bookingId/confirmation` | `BookingConfirmationPage` | `ProtectedRoute` | Verified digital pass with signed QR code |
| `/my-bookings` | `MyBookingsPage` | `ProtectedRoute` | Booking history tabs (Upcoming, Completed, Cancelled) |
| `/profile` | `ProfilePage` | `ProtectedRoute` | Profile details, password change, notification toggles |
| `/notifications` | `NotificationsPage` | `ProtectedRoute` | In-app live alerts & unread badge management |
| `*` | `NotFoundPage` | Public | 404 error page |

---

## 2. Protected Route Guard Mechanism

The `ProtectedRoute` wrapper component validates authentication state:
```jsx
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <PageSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
```
- When unauthenticated patrons attempt to access a protected URL (such as checking out or reviewing bookings), they are smoothly redirected to `/login`.
- Upon successful authentication in `LoginPage`, `navigate(location.state?.from?.pathname || '/', { replace: true })` restores the customer to their intended step without losing context.

