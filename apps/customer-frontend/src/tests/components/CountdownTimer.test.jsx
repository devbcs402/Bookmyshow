import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CountdownTimer from '../../components/common/CountdownTimer';
import { useSeatLockStore } from '../../store/seatLock.store';

describe('CountdownTimer Component', () => {
  beforeEach(() => {
    useSeatLockStore.setState({
      showId: 'show-1',
      lockId: 'lock-1',
      lockedSeatIds: ['s1'],
      remainingSeconds: 240,
      isExpired: false
    });
  });

  it('renders active countdown timer', () => {
    render(<CountdownTimer />);
    expect(screen.getByText(/Time left: 04:00/i)).toBeInTheDocument();
  });

  it('displays Lock Expired when expired', () => {
    useSeatLockStore.setState({
      remainingSeconds: 0,
      isExpired: true
    });

    render(<CountdownTimer />);
    expect(screen.getByText('Lock Expired')).toBeInTheDocument();
  });
});

