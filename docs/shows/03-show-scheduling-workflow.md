# Show Scheduling & Operational Workflow

## 1. Scheduling Pipeline Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Theatre Owner / Manager
    participant API as Show Controller & Validation
    participant Svc as ShowService
    participant Lock as ShowScheduleService
    participant Conflict as ShowConflictService
    participant Repo as ShowRepository
    participant DB as MongoDB

    Owner->>API: POST /api/v1/owner/shows (Payload)
    API->>API: Zod Request Validation
    API->>Svc: createShow(payload, userContext)

    Note over Svc: Verify Movie, Theatre, Screen & Layout
    Svc->>Svc: Check Movie is Approved/Now Showing
    Svc->>Svc: Check Theatre is Approved & Owned by Partner
    Svc->>Svc: Check Screen is ACTIVE
    Svc->>Svc: Check Published Layout Exists

    Svc->>Lock: executeWithScheduleLock(screenId, task)
    Lock->>Lock: Acquire Redis Mutex (lock:schedule:screen:{id})
    Lock->>Conflict: checkScreenConflict(screenId, startTime, occupiedEndTime)
    Conflict->>DB: Query Overlapping Intervals

    alt Collision Found
        Conflict-->>Svc: hasConflict: true
        Svc-->>API: 409 Conflict (SCHEDULE_CONFLICT)
        API-->>Owner: Conflict Error with Occupied Interval Details
    else No Collision
        Conflict-->>Svc: hasConflict: false
        Svc->>Repo: create(showPayload)
        Repo->>DB: Insert Show (status: DRAFT)
        Lock->>Lock: Release Redis Mutex
        Svc-->>API: 201 Created (Show DRAFT)
        API-->>Owner: Structured Success Response
    end
```

---

## 2. Schedule Validation Rules
1. **Movie Eligibility**: Movie status must be `APPROVED`, `NOW_SHOWING`, or `UPCOMING`. Draft or suspended movies cannot be scheduled.
2. **Facility Integrity**: Screen must belong to the selected theatre. Screen status must be `ACTIVE` (`isActive: true`).
3. **Auditorium Blueprint**: Screen must possess at least one published seating layout.
4. **Calculated Durations**: If `durationMins` is not supplied, it defaults to the movie's catalog runtime. `endTime` is calculated as `startTime + durationMins`.
5. **Turnaround & Buffer**: A turnaround buffer (default 20 minutes) is appended to `endTime` to produce `occupiedEndTime`, representing the full time the auditorium is unavailable.

