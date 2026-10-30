# 07 – Theatre and Branch Management

## 1. Multi-Theatre Architecture
The system supports theatre partners managing multiple cinema chains or branches across various cities.
The data hierarchy is:
`Partner Organization` -> `Theatres (Brands / Complexes)` -> `Branches (Locations)` -> `Screens (Auditoriums)`

### Capabilities:
- **Theatre Onboarding**: Register a new theatre with Name, Registered Company Address, Contact Email, Phone, and GSTIN.
- **Branch Management**: Associate physical branches to a theatre, defining local addresses, geospatial coordinates (latitude/longitude), and available amenities (Parking, Food Court, Dolby Atmos, Wheelchair Access, IMAX).
- **Operational Settings**: Configure advance booking cut-off times, ticket cancellation windows, and operating hours.
- **Media Assets**: Upload banner and cinema facade images.
- **Status Lifecycle**: Manage operational states (`ACTIVE`, `INACTIVE`, `PENDING_APPROVAL`, `MAINTENANCE`).

