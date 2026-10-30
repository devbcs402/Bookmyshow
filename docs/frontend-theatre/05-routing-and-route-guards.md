# 05 – Routing and Route Guards

## 1. Route Map
The application routing is organized into unauthenticated auth pages, protected dashboard shell layouts, and permission-gated domain pages:

```
/login                     -> LoginPage
/register                  -> PartnerRegistrationPage
/forgot-password           -> ForgotPasswordPage

/ (Dashboard Shell)
  /                        -> DashboardOverviewPage
  /theatres                -> TheatresListPage
  /theatres/create         -> TheatreCreatePage (THEATRE_OWNER only)
  /theatres/:theatreId     -> TheatreDetailPage
  /theatres/:theatreId/edit-> TheatreEditPage
  /branches                -> BranchesListPage
  /branches/create         -> BranchCreatePage
  /branches/:branchId/edit -> BranchEditPage
  /screens                 -> ScreensListPage
  /screens/create          -> ScreenCreatePage
  /screens/:screenId/edit  -> ScreenEditPage
  /screens/:screenId/layout-> SeatLayoutBuilderPage
  /movies                  -> ApprovedMoviesCatalogPage
  /shows                   -> ShowsListPage
  /shows/create            -> ShowCreatePage
  /shows/calendar          -> ShowCalendarPage
  /shows/:showId           -> ShowDetailPage
  /shows/:showId/pricing   -> ShowPricingPage
  /bookings                -> BookingsExplorerPage
  /bookings/:bookingId     -> BookingDetailPage & Ticket Scanner
  /revenue                 -> RevenueSettlementsPage (THEATRE_OWNER only)
  /staff                   -> StaffManagementPage
  /operations              -> LiveOperationsPage
  /notifications           -> NotificationsPage
  /settings                -> PartnerSettingsPage
```

---

## 2. ProtectedRoute Specification
The `ProtectedRoute` wrapper enforces three checks:
1. **Authentication Check**: If no active user or access token exists, redirect to `/login` with `state: { from: location }`.
2. **Role Verification**: If `allowedRoles` are specified, ensures `user.role` is in the allowed list.
3. **Permission Verification**: If `requiredPermission` is specified, checks that `user.permissions` includes the exact flag.
4. If unauthorized, renders an `UnauthorizedView` stating the specific permission required without unmounting application shell context.

