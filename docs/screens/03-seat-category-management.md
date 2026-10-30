# Seat Category Management

## 1. Overview
In a multi-tenant cinema booking platform, seat pricing and tiering cannot be hardcoded. While the platform provides five standard default categories, theatre partners require autonomy to create custom tiers with dedicated visual branding (hex colors) and base pricing.

---

## 2. Default Platform Categories
Platform default categories have `partnerId: null` and are universally accessible across all screens:

| Code | Name | Hex Color | Base Price | Sort Order | Description |
|---|---|---|---|---|---|
| `VIP_RECLINER` / `RECLINER` | VIP Recliner | `#8B5CF6` | ₹450 | 1 | Motorized plush leather recliners |
| `PREMIUM` | Premium | `#F59E0B` | ₹250 | 2 | Optimal prime viewing tier |
| `EXECUTIVE` | Executive | `#10B981` | ₹200 | 3 | Enhanced legroom executive seating |
| `REGULAR` | Regular | `#3B82F6` | ₹150 | 4 | Standard comfortable cinema seating |
| `WHEELCHAIR` | Wheelchair Bay | `#06B6D4` | ₹150 | 5 | Dedicated barrier-free accessible spaces |

---

## 3. Custom Tenant Categories
A theatre partner can create custom seat categories specific to their auditoriums (e.g. `COUPLE_BED`, `IMAX_ROYAL`, `SOFA`):
- **Tenant Isolation**: When `partnerId` is populated, only screens owned by that partner can utilize the category.
- **Unique Code Index**: Compound unique index `{ partnerId: 1, code: 1, deletedAt: 1 }` prevents code collisions within the tenant organization.
- **Platform Protection**: Partners cannot update or delete platform-wide defaults (`partnerId: null`). Modifying or deleting platform defaults is strictly restricted to `SYSTEM_ADMIN`.

---

## 4. Lifecycle & API Operations
1. `POST /api/v1/owner/seat-categories`: Create custom tier for the authenticated partner.
2. `GET /api/v1/owner/seat-categories`: List all tiers available to the partner (platform defaults merged with tenant customs).
3. `PATCH /api/v1/owner/seat-categories/:categoryId`: Modify display color, base price, or sort order.
4. `DELETE /api/v1/owner/seat-categories/:categoryId`: Soft delete category with dependency safeguards.

