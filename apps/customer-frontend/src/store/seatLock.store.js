import { create } from 'zustand';
import seatLocksApi from '../services/api/seat-locks.api';

let timerInterval = null;

export const useSeatLockStore = create((set, get) => ({
  showId: null,
  lockId: null,
  lockedSeatIds: [],
  expiresAt: null,
  remainingSeconds: 0,
  isExpired: false,
  isRenewing: false,

  setLock: ({ showId, lockId, lockedSeatIds, expiresAt, ttlSeconds }) => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    const expireTime = expiresAt ? new Date(expiresAt).getTime() : Date.now() + (ttlSeconds || 300) * 1000;
    const initialRemaining = Math.max(0, Math.floor((expireTime - Date.now()) / 1000));

    set({
      showId,
      lockId,
      lockedSeatIds,
      expiresAt: expireTime,
      remainingSeconds: initialRemaining,
      isExpired: initialRemaining <= 0
    });

    timerInterval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((get().expiresAt - Date.now()) / 1000));
      if (remaining <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        set({ remainingSeconds: 0, isExpired: true });
        window.dispatchEvent(new CustomEvent('bms:seat-lock:expired', { detail: { showId, lockId } }));
      } else {
        set({ remainingSeconds: remaining, isExpired: false });
      }
    }, 1000);
  },

  renewLock: async () => {
    const { showId, lockId, lockedSeatIds } = get();
    if (!showId || !lockId || lockedSeatIds.length === 0) return false;

    set({ isRenewing: true });
    try {
      const res = await seatLocksApi.renewSeats(showId, lockedSeatIds, lockId);
      if (res?.data) {
        const { expiresAt, ttlSeconds } = res.data;
        const newExpiry = expiresAt ? new Date(expiresAt).getTime() : Date.now() + (ttlSeconds || 300) * 1000;
        const newRemaining = Math.max(0, Math.floor((newExpiry - Date.now()) / 1000));

        set({
          expiresAt: newExpiry,
          remainingSeconds: newRemaining,
          isExpired: false,
          isRenewing: false
        });
        return true;
      }
    } catch (_err) {
      set({ isRenewing: false });
      return false;
    }
    return false;
  },

  clearLock: async () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    const { showId, lockId, lockedSeatIds } = get();
    if (showId && lockId && lockedSeatIds.length > 0) {
      try {
        await seatLocksApi.releaseSeats(showId, lockedSeatIds, lockId);
      } catch (_e) {}
    }
    set({
      showId: null,
      lockId: null,
      lockedSeatIds: [],
      expiresAt: null,
      remainingSeconds: 0,
      isExpired: false,
      isRenewing: false
    });
  }
}));

export default useSeatLockStore;

