# Screen Interval Conflict Detection Engine

## 1. Overview
The **Show Conflict Service** prevents overlapping theatrical screenings on the same physical cinema screen. Cinema multiplexes cannot project two movies simultaneously inside the same auditorium, nor can they seat patrons while a prior screening is still running or the hall is undergoing cleaning.

---

## 2. Mathematical Temporal Collision Formula

Given an existing show $E$ with interval $[S_E, O_E)$ where:
- $S_E = \text{Start Time}$
- $O_E = \text{Occupied End Time} = \text{End Time} + \text{Cleanup Buffer}$

And an attempted new show $N$ with interval $[S_N, O_N)$:

$$\text{Collision} \iff (S_E < O_N) \land (O_E > S_N) \land (\text{Status}_E \ne \text{"CANCELLED"}) \land (\text{Screen}_E = \text{Screen}_N)$$

```
Case 1: No Conflict (Show N is strictly after Show E's occupied interval)
[------ Show E ------][ Buffer ]
                                [------ Show N ------]
Time ----------------------------------------------------->

Case 2: Overlap Collision (Show N starts before Show E's buffer concludes)
[------ Show E ------][ Buffer ]
                   [------ Show N ------]  <-- REJECTED!
Time ----------------------------------------------------->

Case 3: Enclosing Collision (Show N spans across Show E)
        [------ Show E ------]
[---------------- Show N ----------------]  <-- REJECTED!
Time ----------------------------------------------------->
```

---

## 3. Exclusion Rules
1. **Cancelled Shows**: Shows with `status: CANCELLED` are excluded from collision checks, freeing the auditorium for replacement programming.
2. **Rescheduled Show Exclusion**: When an existing show is rescheduled, its own `_id` is passed as `excludeShowId` so it does not collide with its own previous schedule.
3. **Cross-Screen Parallelism**: Shows on different screens (`screenId_A != screenId_B`) run simultaneously without restriction.
4. **Cross-Theatre Isolation**: Shows in different cinema properties run independently.

---

## 4. Database Query Optimization
The collision detection query targets the compound index:
`{ screenId: 1, startTime: 1, occupiedEndTime: 1, status: 1 }`
Ensuring index-only lookups executed in sub-millisecond time.

