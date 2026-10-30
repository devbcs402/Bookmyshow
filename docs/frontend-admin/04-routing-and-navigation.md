# 04 – Routing and Navigation

## 1. Route Map
```
/login                     -> LoginPage (Super Admin credentials only)

/ (Protected by ProtectedRoute: role === SUPER_ADMIN)
  /                        -> MasterOverviewPage
  /theatre-approvals       -> TheatreApprovalsPage
  /theatre-approvals/:id   -> TheatreApprovalDetailPage
  /theatres                -> TheatresManagementPage
  /theatres/:id            -> TheatreDetailPage
  /branches                -> BranchesOversightPage
  /movies                  -> MoviesManagementPage
  /movies/create           -> MovieCreatePage
  /movies/:id              -> MovieDetailPage
  /movie-approvals         -> MovieApprovalsPage
  /screens                 -> ScreensOversightPage
  /shows                   -> ShowsOversightPage
  /bookings                -> BookingsManagementPage
  /bookings/:id            -> BookingDetailPage
  /payments                -> PaymentsManagementPage
  /refunds                 -> RefundsManagementPage
  /commissions             -> CommissionSettingsPage
  /settlements             -> SettlementsManagementPage
  /coupons                 -> CouponsPromotionsPage
  /notifications           -> AnnouncementsPage
  /analytics               -> PlatformAnalyticsPage
  /audit-logs              -> AuditLogsPage
  /system-health           -> SystemHealthPage
  /settings                -> PlatformSettingsPage
  /users                   -> UserExplorerPage
```

---

## 2. Navigation Structure
The left sidebar is grouped into logical operational domains:
1. **Platform Intelligence**: Master Overview, Analytics & Reports, System Health.
2. **Exhibitor Governance**: Theatre Approvals (with pending counter badge), All Theatres, Branches.
3. **Content Catalog**: Movie Library, Movie Approvals, Auditorium Screens, Scheduled Shows.
4. **Commerce & Inventory**: Bookings Explorer, Payment Transactions, Gateway Refunds.
5. **Financial Accounting**: Commission Rates, Theatre Settlements & CSV Export.
6. **Platform Administration**: User Accounts Explorer, Broadcast Announcements, Audit Logs, Platform Settings.

