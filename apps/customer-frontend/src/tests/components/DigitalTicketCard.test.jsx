import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DigitalTicketCard from '../../components/booking/DigitalTicketCard';

const mockBooking = {
  _id: 'b-999',
  bookingReference: 'BMS-TEST-PNR',
  snapshot: {
    movieTitle: 'Avatar The Way of Water',
    theatreName: 'PVR IMAX Phoenix',
    screenName: 'IMAX Laser 1',
    showStartTime: '2026-11-05T18:30:00.000Z'
  },
  seats: [
    { seatLabel: 'F12', price: 500 },
    { seatLabel: 'F13', price: 500 }
  ],
  pricing: {
    totalPayable: 1180
  },
  qrPayload: 'BMS-QR.eyJ2IjoxLCJyZWYiOiJCTVMtVEVTVC1QTlIifQ.sig'
};

describe('DigitalTicketCard Component', () => {
  it('renders booking reference, movie title, seats, and QR code container', () => {
    render(<DigitalTicketCard booking={mockBooking} />);

    expect(screen.getByText(/Booking Confirmed/i)).toBeInTheDocument();
    expect(screen.getByText(/PNR: BMS-TEST-PNR/i)).toBeInTheDocument();
    expect(screen.getByText('Avatar The Way of Water')).toBeInTheDocument();
    expect(screen.getByText('F12, F13')).toBeInTheDocument();
    expect(screen.getByText('Scan at Cinema Turnstile')).toBeInTheDocument();
  });

  it('triggers print action when Print Ticket button is clicked', () => {
    const handlePrint = vi.fn();
    render(<DigitalTicketCard booking={mockBooking} onPrint={handlePrint} />);

    const printBtn = screen.getByText('Print Ticket');
    fireEvent.click(printBtn);
    expect(handlePrint).toHaveBeenCalledTimes(1);
  });
});
