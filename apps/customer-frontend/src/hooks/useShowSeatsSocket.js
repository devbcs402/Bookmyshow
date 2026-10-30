import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import socketService from '../services/socket/socket.client';
import { SOCKET_EVENTS } from '../constants';

/**
 * Hook to manage Socket.IO lifecycle for a show's real-time seating room
 * @param {string} showId
 * @param {Function} [onSeatEvent] Optional callback on incoming seat event
 */
export function useShowSeatsSocket(showId, onSeatEvent) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!showId) return;

    // Join show room
    socketService.joinShowRoom(showId);

    const handleSeatEvent = eventData => {
      // Invalidate the show seats query so latest state is refetched
      queryClient.invalidateQueries({ queryKey: ['show-seats', showId] });
      if (typeof onSeatEvent === 'function') {
        onSeatEvent(eventData);
      }
    };

    socketService.on(SOCKET_EVENTS.SEAT_LOCKED, handleSeatEvent);
    socketService.on(SOCKET_EVENTS.SEAT_RELEASED, handleSeatEvent);
    socketService.on(SOCKET_EVENTS.SEAT_EXPIRED, handleSeatEvent);
    socketService.on(SOCKET_EVENTS.SEAT_BOOKED, handleSeatEvent);
    socketService.on(SOCKET_EVENTS.AVAILABILITY_UPDATED, handleSeatEvent);

    return () => {
      socketService.off(SOCKET_EVENTS.SEAT_LOCKED, handleSeatEvent);
      socketService.off(SOCKET_EVENTS.SEAT_RELEASED, handleSeatEvent);
      socketService.off(SOCKET_EVENTS.SEAT_EXPIRED, handleSeatEvent);
      socketService.off(SOCKET_EVENTS.SEAT_BOOKED, handleSeatEvent);
      socketService.off(SOCKET_EVENTS.AVAILABILITY_UPDATED, handleSeatEvent);
      socketService.leaveShowRoom(showId);
    };
  }, [showId, queryClient, onSeatEvent]);
}

export default useShowSeatsSocket;

