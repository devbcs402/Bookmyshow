# 19 – Testing and Quality Assurance

## 1. Testing Framework
Testing for `apps/theatre-dashboard` is executed using **Vitest** alongside **React Testing Library** and `@testing-library/jest-dom`.

### Test Suites Focus:
1. **Auth & RBAC Guards**: Verifies that unauthenticated users are redirected to `/login`, and that `THEATRE_STAFF` cannot view financial revenue tabs or access screen layout builders.
2. **Dashboard Overview & Metrics**: Verifies KPI cards, revenue aggregation calculations, and chart rendering.
3. **Theatre & Branch Operations**: Form validations, multi-branch listings, and status badges.
4. **Seat Layout Builder**: Interactive row generation, aisle placement, category assignments, and draft-to-publish workflow.
5. **Show Scheduling & Conflict Prevention**: Validates show creation, buffer time calculations, and pricing configuration.
6. **Bookings & Admissions**: Search, filter, and QR admission status checks.

### Target:
- 100% test pass rate across all suites.

