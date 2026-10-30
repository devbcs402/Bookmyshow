# 11 – Show Conflict Engine and Calendar

## 1. Conflict Prevention Algorithm
To prevent scheduling overlaps:
- Each show has a calculated time window: `[startTime, endTime]`, where `endTime = startTime + movieRuntime + cleanupBuffer`.
- Before persisting a new show or rescheduling an existing show, the backend queries active shows on that screen where:
  `existingShow.startTime < newShow.endTime AND existingShow.endTime > newShow.startTime`.
- If an overlap exists, the API returns a structured HTTP 409 Conflict with details of the conflicting show.

---

## 2. Interactive Show Calendar
The dashboard features an interactive calendar view:
- **Day View**: Horizontal timeline representing the 24-hour day across all screens in a branch.
- **Week View**: Weekly screen allocation overview.
- **Color Coding**: Visual cues by status (`DRAFT`, `PUBLISHED`, `RUNNING`, `COMPLETED`, `CANCELLED`).
- **Drag & Click**: Click an open time slot to launch the show creation wizard pre-filled with the selected screen and timestamp.

