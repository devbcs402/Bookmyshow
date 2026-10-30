# 11 – Movie Management and Approvals

## 1. Master Movie Catalog & Verification
Super Admin oversees the platform movie repository:
- `POST /api/v1/admin/movies`: Registers a new title (title, synopsis, duration, certification, formats, languages, genres, release date, poster URL).
- `GET /api/v1/admin/movies`: Lists all catalog titles with status filters (`DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `RELEASED`, `ARCHIVED`).
- Content Approvals:
  - `PATCH /api/v1/admin/movies/:id/approve`: Approves movie for partner show scheduling.
  - `PATCH /api/v1/admin/movies/:id/reject`: Rejects movie submission with justification.

