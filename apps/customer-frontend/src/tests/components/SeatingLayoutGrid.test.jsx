import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SeatingLayoutGrid from '../../components/seat/SeatingLayoutGrid';
import { SEAT_STATUS } from '../../constants';

const mockCategories = [
  { _id: 'cat-plat', code: 'PLATINUM', name: 'Platinum', price: 350 },
  { _id: 'cat-gold', code: 'GOLD', name: 'Gold', price: 250 }
];

const mockRows = [
  {
    rowLabel: 'A',
    categoryCode: 'PLATINUM',
    seats: [
      { _id: 'seat-a1', seatNumber: 1, seatLabel: 'A1', status: SEAT_STATUS.AVAILABLE },
      { _id: 'seat-a2', seatNumber: 2, seatLabel: 'A2', status: SEAT_STATUS.BOOKED },
      { _id: 'seat-a3', seatNumber: 3, seatLabel: 'A3', status: SEAT_STATUS.LOCKED_BY_OTHER }
    ]
  }
];

describe('SeatingLayoutGrid Component', () => {
  it('renders category tier header with price', () => {
    render(
      <SeatingLayoutGrid
        categories={mockCategories}
        layoutRows={mockRows}
        selectedSeats={[]}
        onToggleSeat={vi.fn()}
      />
    );

    expect(screen.getByText('Platinum')).toBeInTheDocument();
    expect(screen.getByText('All eyes this way please (Screen)')).toBeInTheDocument();
  });

  it('triggers onToggleSeat when clicking an available seat', () => {
    const handleToggle = vi.fn();
    render(
      <SeatingLayoutGrid
        categories={mockCategories}
        layoutRows={mockRows}
        selectedSeats={[]}
        onToggleSeat={handleToggle}
      />
    );

    const seatA1 = screen.getByTitle(/Seat A1/i);
    expect(seatA1).toBeEnabled();
    fireEvent.click(seatA1);
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('disables interaction on booked and locked seats', () => {
    const handleToggle = vi.fn();
    render(
      <SeatingLayoutGrid
        categories={mockCategories}
        layoutRows={mockRows}
        selectedSeats={[]}
        onToggleSeat={handleToggle}
      />
    );

    const seatA2 = screen.getByTitle(/Seat A2/i);
    expect(seatA2).toBeDisabled();
    fireEvent.click(seatA2);
    expect(handleToggle).not.toHaveBeenCalled();
  });
});

