# Design System, Theme Tokens & UX Guidelines
**Part 15: Customer Frontend Development (React)**
**Document Reference: `docs/frontend-customer/03-design-system.md`**

---

## 1. Visual Theme Philosophy

The design system is crafted for a **cinematic, immersive theatre environment**. Deep navy backgrounds evoke the ambience of a darkened screening room, while crimson/coral action accents direct patron focus toward ticket reservation and showtimes.

---

## 2. Color Palette & Design Tokens

### 2.1 Brand & Action Accents
- **Primary Brand Red**: `#E50914` (Main action buttons, primary badges, brand logo).
- **Brand Hover**: `#C80813` (Active hover state).
- **Brand Subtle Background**: `#2E151B` (Alerts, active filter pills).
- **Cinema Accent Coral**: `#F84464` (Secondary calls to action).

### 2.2 Backgrounds & Surfaces
- **Cinema Darkest**: `#070A10` (Root page backdrop).
- **Cinema Dark**: `#0B0F19` (Header, navigation, sub-sections).
- **Cinema Card**: `#111827` (Card surfaces, dialogs, dropdowns).
- **Cinema Elevated**: `#1F293D` (Interactive button surfaces, pill tags).
- **Cinema Border**: `#273147` (Subtle boundary borders).
- **Cinema Muted Text**: `#94A3B8` (Descriptions, release info, timestamps).

### 2.3 Seating Status Color Palette
| Status | Background Token | Border Token | Meaning |
|---|---|---|---|
| `AVAILABLE` | `#111827` (Slate) | `#273147` | Free for selection |
| `SELECTED` | `#22C55E` (Emerald) | `#16A34A` | Selected by active customer |
| `LOCKED_BY_ME` | `#EAB308` (Amber) | `#CA8A04` | Held by active session |
| `LOCKED_BY_OTHER` | `#EF4444` (Red / Lock) | `#DC2626` | Contested by another customer |
| `BOOKED` | `#0F172A` (Muted Dark) | `#1E293B` | Permanently reserved |
| `MAINTENANCE` | `#1E293B` | `#334155` | Out of order / disabled |

---

## 3. Typography Scale
Typography uses `Inter` with system-ui fallbacks:
- `Display Hero`: `text-3xl` / `text-4xl`, `font-extrabold`, `tracking-tight`
- `Section Header`: `text-xl` / `text-2xl`, `font-bold`
- `Card Title`: `text-base` / `text-lg`, `font-semibold`
- `Body Text`: `text-sm`, `font-normal`, `text-slate-300`
- `Caption / Microcopy`: `text-xs` / `text-[11px]`, `text-slate-400`
- `Monospace Identifiers`: `font-mono` (PNR references, transaction IDs, ticket codes)

---

## 4. Responsive Breakpoints

| Breakpoint | Width | Layout Adjustments |
|---|---|---|
| `Mobile (default)` | `< 640px` | Single-column grids, compact search in top row, hamburger drawer, full-width seat map scroll |
| `Tablet (sm / md)` | `640px - 1024px` | 2–3 column movie grids, horizontal showtime pills, split review summary |
| `Desktop (lg / xl)`| `> 1024px` | 4–5 column discovery grids, persistent filter sidebar, widescreen seating layout |

