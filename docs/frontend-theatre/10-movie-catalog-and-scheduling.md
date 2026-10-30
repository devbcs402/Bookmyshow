# 10 – Movie Catalog and Scheduling

## 1. Approved Movies Catalog
Theatre partners can view movies from the master catalog that are in `RELEASED` or `NOW_SHOWING` status and approved by platform administrators.
Partners can inspect:
- Runtime duration (minutes)
- Censorship rating (`U`, `UA`, `A`)
- Available formats (`2D`, `3D`, `IMAX 3D`, `4DX`)
- Languages and subtitles
- Poster and banner assets

---

## 2. Show Scheduling Workflow
When scheduling a show:
1. **Selection**: Partner selects Movie, Theatre, Screen, Date, and Start Time.
2. **Buffer Calculation**: The system automatically adds standard intermission and cleaning buffers (default 20-30 minutes) to the movie runtime to compute the required screen block window.
3. **Hardware Compatibility**: Validates that screen projection and audio capabilities support the chosen movie format.
4. **Layout Binding**: Binds the show to the screen's active published seating layout.
5. **Conflict Check**: Calls the backend scheduling engine to ensure no overlapping show exists in the same screen.

