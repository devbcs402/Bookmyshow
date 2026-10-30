import { Router } from 'express';
import SeatLockController from './seat-lock.controller.js';
import { authenticate, optionalAuthenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  showIdParamValidation,
  acquireSeatLocksValidation,
  releaseSeatLocksValidation,
  renewSeatLocksValidation
} from './seat-lock.validation.js';

export const seatLockRoutes = Router();

/**
 * @openapi
 * /shows/{showId}/seats:
 *   get:
 *     tags:
 *       - Seat Availability & Locks
 *     summary: Retrieve real-time seat layout, availability, and pricing for a show
 *     description: >-
 *       Returns complete seating grid with physical attributes, pricing tiers, and real-time status
 *       (AVAILABLE, LOCKED_BY_ME, LOCKED_BY_OTHER, BOOKED, MAINTENANCE, BLOCKED). Supports optional
 *       Bearer authentication to personalize LOCKED_BY_ME status.
 *     security:
 *       - BearerAuth: []
 *       - {}
 *     parameters:
 *       - in: path
 *         name: showId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hexadecimal 24-char MongoDB ObjectId of the show
 *     responses:
 *       200:
 *         description: Seat availability layout returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/SeatAvailabilityResponse'
 *       404:
 *         description: Show not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       409:
 *         description: Show is cancelled or not bookable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
seatLockRoutes.get(
  '/:showId/seats',
  validate(showIdParamValidation),
  optionalAuthenticate,
  SeatLockController.getSeatAvailability
);

/**
 * @openapi
 * /shows/{showId}/seat-locks:
 *   post:
 *     tags:
 *       - Seat Availability & Locks
 *     summary: Atomically acquire temporary locks on up to 10 seats
 *     description: >-
 *       Executes an atomic Redis Lua script guaranteeing all-or-nothing seat locking.
 *       Enforces physical existence, show layout match, confirmed booking absence, and idempotency.
 *       Emits real-time Socket.IO room events to update other waiting patrons.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: showId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-idempotency-key
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional idempotency key (UUID or client transaction identifier)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SeatLockAcquireRequest'
 *     responses:
 *       201:
 *         description: All requested seats locked successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/SeatLockAcquireResponse'
 *       400:
 *         description: Invalid payload or seat count exceeds limit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       409:
 *         description: One or more seats already locked or booked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
seatLockRoutes.post(
  '/:showId/seat-locks',
  authenticate,
  validate(acquireSeatLocksValidation),
  SeatLockController.acquireSeatLocks
);

/**
 * @openapi
 * /shows/{showId}/seat-locks:
 *   delete:
 *     tags:
 *       - Seat Availability & Locks
 *     summary: Safely release acquired temporary seat locks
 *     description: >-
 *       Atomically verifies lockId and userId ownership in Redis Lua before releasing seats.
 *       Prevents race conditions where expired locks re-acquired by others could be deleted.
 *       Emits real-time Socket.IO seat:released events to room participants.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: showId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SeatLockReleaseRequest'
 *     responses:
 *       200:
 *         description: Seat locks released successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       404:
 *         description: Lock not found or already expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
seatLockRoutes.delete(
  '/:showId/seat-locks',
  authenticate,
  validate(releaseSeatLocksValidation),
  SeatLockController.releaseSeatLocks
);

/**
 * @openapi
 * /shows/{showId}/seat-locks/renew:
 *   patch:
 *     tags:
 *       - Seat Availability & Locks
 *     summary: Atomically extend TTL of active temporary seat locks
 *     description: >-
 *       Extends seat lock TTL by configured duration (default 300s) if the lock is active,
 *       owned by the requesting user, and within the max renewals ceiling (default 2).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: showId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SeatLockRenewRequest'
 *     responses:
 *       200:
 *         description: Seat locks renewed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/SeatLockAcquireResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       404:
 *         description: Lock not found or expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       409:
 *         description: Maximum renewal limit reached
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
seatLockRoutes.patch(
  '/:showId/seat-locks/renew',
  authenticate,
  validate(renewSeatLocksValidation),
  SeatLockController.renewSeatLocks
);

export default seatLockRoutes;
