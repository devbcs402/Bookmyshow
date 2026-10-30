import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from '../components/ui/StatCard';
import { Film } from 'lucide-react';

describe('StatCard Component', () => {
  it('renders title, value, and subtitle correctly', () => {
    render(
      <StatCard
        title="Tickets Sold"
        value="1,420"
        subtitle="Across 12 screenings"
        icon={Film}
        change="+14.2%"
        isPositive={true}
      />
    );

    expect(screen.getByText('Tickets Sold')).toBeInTheDocument();
    expect(screen.getByText('1,420')).toBeInTheDocument();
    expect(screen.getByText('Across 12 screenings')).toBeInTheDocument();
    expect(screen.getByText('+14.2%')).toBeInTheDocument();
  });
});

