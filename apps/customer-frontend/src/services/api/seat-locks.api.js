import apiClient from './axios.client';

export const seatLocksApi = {
  /**
   * Atomically acquires Redis temporary locks on 1-10 seats
   * POST /api/v1/shows/:showId/seat-locks
   * @param {string} showId
   * @param {string[]} seatIds
   * @param {string} [idempotencyKey]
   */
  async lockSeats(showId, seatIds, idempotencyKey = null) {
    const headers = {};
    if (idempotencyKey) {
      headers['x-idempotency-key'] = idempotencyKey;
    }
    const response = await apiClient.post(
      `/shows/${showId}/seat-locks`,
      { seatIds, idempotencyKey },
      { headers }
    );
    return response.data;
  },

  /**
   * Safely releases acquired seat locks in Redis
   * DELETE /api/v1/shows/:showId/seat-locks
   * @param {string} showId
   * @param {string[]} seatIds
   * @param {string} lockId
   */
  async releaseSeats(showId, seatIds, lockId) {
    const response = await apiClient.delete(`/shows/${showId}/seat-locks`, {
      data: { seatIds, lockId }
    });
    return response.data;
  },

  /**
   * Extends TTL on active temporary seat locks
   * PATCH /api/v1/shows/:showId/seat-locks/renew
   * @param {string} showId
   * @param {string[]} seatIds
   * @param {string} lockId
   */
  async renewSeats(showId, seatIds, lockId) {
    const response = await apiClient.patch(`/shows/${showId}/seat-locks/renew`, {
      seatIds,
      lockId
    });
    return response.data;
  }
};

export default seatLocksApi;

