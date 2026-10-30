# 03 – Super Admin Design System

## 1. Visual Language & Color Palette
The Super Admin Dashboard employs an executive enterprise SaaS design system with:
- **Sidebar**: Dark navy (`#0A101D` with `#1E293B` active highlights).
- **Main Canvas**: Crisp neutral white/light gray (`#F8FAFC`).
- **Cards & Surfaces**: Clean white (`#FFFFFF`) with subtle slate borders (`#E2E8F0`).
- **Primary Actions**: Professional enterprise blue (`#2563EB` / `#1D4ED8`).
- **Typography**: Inter / sans-serif with strict typographic hierarchy.

---

## 2. Reusable UI Components
- **AdminLayout**: Unified layout with collapsible navy sidebar, fixed header with breadcrumbs and live system health indicator.
- **StatCard**: Executive KPI card displaying primary metric, period change indicator, subtitle, and themed icon.
- **DataTable**: High-density tabular layout with server-side pagination, empty state fallback, search input, and column formatting.
- **StatusBadge**: Standardized badges across Approval states (`APPROVED`, `PENDING_APPROVAL`, `REJECTED`), Show states (`PUBLISHED`, `DRAFT`, `CANCELLED`), and Booking/Payment states (`CONFIRMED`, `CAPTURED`, `REFUNDED`).
- **ConfirmDialog**: Confirmation dialog for high-impact actions (theatre rejection, show cancellation, refund trigger).
- **Charts**: Recharts Area, Bar, and Donut visualizations with formatted currency and numbers.

