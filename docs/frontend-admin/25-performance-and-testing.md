# 25 – Performance and Testing

## 1. Testing Framework
Testing for `apps/admin-dashboard` is executed using **Vitest** with **React Testing Library** and `@testing-library/jest-dom`.
Key test suites:
- Authentication & RBAC Route Guard (denies customer & theatre owner accounts, allows Super Admin).
- Executive Overview Metrics & Charts rendering.
- Compliance Approval Workflows (Approve/Reject theatres).
- Financial Settlement & Commission Calculations.
- CSV Report Export utilities.
- Audit Log table filters & rendering.

