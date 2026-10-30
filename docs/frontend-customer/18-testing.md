# Frontend Testing Strategy & Coverage Report
**Part 15: Customer Frontend Development (React)**
**Document Reference: `docs/frontend-customer/18-testing.md`**

---

## 1. Testing Framework & Philosophy

The frontend test suite is powered by **Vitest** and **React Testing Library** with a JSDOM environment:
- **Fast Execution**: In-memory Vite transform without heavyweight browser startup.
- **User-Centric Assertions**: Queries target visible roles, accessible text labels, and user interactions rather than internal component state.
- **Mocking Strategy**: External APIs (`authApi`, `seatLocksApi`, `paymentsApi`) and browser APIs (`matchMedia`, `scrollTo`) are cleanly mocked using `vi.fn()` without network dependencies.

---

## 2. Test Suites & Verification Scope

| Suite | File | Tests | Coverage |
|---|---|---|---|
| **Movie Card** | `src/tests/components/MovieCard.test.jsx` | 3 | Title, ratings, genres, wishlist toggle |
| **Seating Layout** | `src/tests/components/SeatingLayoutGrid.test.jsx` | 3 | Category tiers, available seat click, disabled booked/locked seats |
| **Price Breakdown**| `src/tests/components/PriceSummaryBreakdown.test.jsx` | 1 | Subtotal, convenience fee, GST, total payable |
| **Countdown Timer** | `src/tests/components/CountdownTimer.test.jsx` | 2 | Time remaining format, expiration state transition |
| **Digital Ticket** | `src/tests/components/DigitalTicketCard.test.jsx` | 2 | PNR display, seat labels, QR container, print trigger |
| **Customer Auth** | `src/tests/features/Auth.test.jsx` | 2 | Validation errors, successful login flow |
| **Seat Locking** | `src/tests/features/SeatLocking.test.jsx` | 3 | Atomic lock persistence, conflict error handling, release on exit |
| **Payment Gateway**| `src/tests/features/PaymentFlow.test.jsx` | 2 | Order creation, HMAC verification callback |

**Total Results: 8 test files, 18 automated tests passing (100% pass rate).**

