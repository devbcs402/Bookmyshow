# 03 – Design System and UI Specifications

## 1. Visual Language & Color Palette
The Theatre Partner Dashboard employs an executive cinema dark-mode color scheme optimized for long operational shifts, high-density tabular data, and low eye fatigue.

### 1.1 Color Tokens
- **Background Deep**: `#070A10` (`cinema-darkest`)
- **Surface Elevation**: `#0B0F19` (`cinema-dark`)
- **Card Background**: `#111827` (`cinema-card`)
- **Elevated Hover/Popover**: `#1F293D` (`cinema-elevated`)
- **Border Subtle**: `#273147` (`cinema-border`)
- **Brand Primary**: `#E50914` (`brand.DEFAULT`)
- **Partner Action Blue**: `#0284C7` (`partner.500`)
- **Success Tone**: `#22C55E` (`emerald-500`)
- **Warning Amber**: `#F59E0B` (`amber-500`)
- **Destructive Red**: `#EF4444` (`rose-500`)

---

## 2. Seat Layout Representation Specs

| Seat Tier | Background Hex | Border Hex | Description |
|---|---|---|---|
| **VIP / Recliner** | `#A855F7` (Purple) | `#C084FC` | Premium luxury recliners with motorized leg-rests |
| **Platinum** | `#38BDF8` (Sky) | `#7DD3FC` | Front-tier prime viewing seats |
| **Gold** | `#FBBF24` (Amber) | `#FDE047` | Mid-tier optimal audio-visual sweet spot |
| **Silver / Regular** | `#94A3B8` (Slate) | `#CBD5E1` | Standard theater seats |
| **Aisle Gap** | `#0F172A` | Transparent | Non-clickable pathway space |
| **Disabled / Maintenance**| `#475569` | `#64748B` | Blocked or damaged seat fixture |

---

## 3. UI Component Inventory
1. **DataTable**: Generic virtualized table with sortable columns, row selection, search debounce, status badges, and pagination footer.
2. **StatCard**: Metric card displaying primary KPI, percentage growth indicator, period subtitle, and accent iconography.
3. **Modal & ConfirmDialog**: Accessible overlay dialog with keyboard ESC dismissal, focus trapping, and distinct danger states.
4. **Form Controls**:
   - `Input`, `Textarea`, `Select`, `Checkbox`
   - Form-level error messaging backed by Zod resolvers and React Hook Form.
5. **Interactive Seating Grid**:
   - Dynamic 2D canvas/CSS grid supporting click-to-toggle, marquee box selection, category painter tools, and row re-labeling.
6. **Toast System**: Unobtrusive notification toasts for API responses and background WebSocket events.

