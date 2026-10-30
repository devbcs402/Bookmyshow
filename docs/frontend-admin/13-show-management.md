# 13 – Show Scheduling Oversight

## 1. Show Scheduling Governance
Super Admin monitors scheduled screenings across all exhibitors:
- Global show query via `GET /api/v1/owner/shows` with filters (`theatreId`, `screenId`, `movieId`, `date`, `status`).
- Statuses: `DRAFT`, `PUBLISHED`, `RUNNING`, `COMPLETED`, `CANCELLED`.
- Emergency Cancellation: `POST /api/v1/owner/shows/:id/cancel` initiates emergency show termination and triggers automated customer refunds.

