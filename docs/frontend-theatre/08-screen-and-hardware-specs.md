# 08 – Screen and Hardware Specifications

## 1. Auditorium Screen Metadata
Each screen represents a physical projection hall within a theatre branch.
Supported specifications include:
- **Projection Formats**: `STANDARD_2D`, `REAL_3D`, `IMAX_2D`, `IMAX_3D`, `4DX`, `SCREEN_X`.
- **Sound Systems**: `DOLBY_ATMOS`, `DOLBY_DIGITAL_7_1`, `DOLBY_DIGITAL_5_1`, `IMAX_IMMERSIVE`, `DTS_X`.
- **Display Dimensions & Capabilities**: Aspect ratio (2.39:1 Scope, 1.85:1 Flat), screen size (meters), frame rate capability (HFR 48/60 fps).
- **Physical Seat Capacity**: Total physical seats configured via the active layout version.
- **Operational Status**: `ACTIVE`, `MAINTENANCE`, `INACTIVE`.

---

## 2. Integrity & Deletion Rules
- A screen cannot be deactivated or deleted if there are published or active shows scheduled in the future.
- Modifying screen audio/projection formats prompts warnings if future scheduled shows rely on previously configured hardware profiles.

