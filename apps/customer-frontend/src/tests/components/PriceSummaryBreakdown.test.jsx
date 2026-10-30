import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PriceSummaryBreakdown from '../../components/booking/PriceSummaryBreakdown';

describe('PriceSummaryBreakdown Component', () => {
  it('renders itemized tickets, convenience fee, taxes, and total payable amount', () => {
    const seats = [
      { _id: 's1', seatLabel: 'A1', categoryName: 'Platinum', price: 350 },
      { _id: 's2', seatLabel: 'A2', categoryName: 'Platinum', price: 350 }
    ];

    render(
      <PriceSummaryBreakdown
        seats={seats}
        baseAmount={700}
        convenienceFee={50}
        taxAmount={135}
        totalAmount={885}
      />
    );

    expect(screen.getByText('Payment Summary')).toBeInTheDocument();
    expect(screen.getByText('Tickets (2 seats)')).toBeInTheDocument();
    expect(screen.getByText('Convenience Fee')).toBeInTheDocument();
    expect(screen.getByText('Integrated GST (18%)')).toBeInTheDocument();
    expect(screen.getByText('Amount Payable')).toBeInTheDocument();
  });
});

