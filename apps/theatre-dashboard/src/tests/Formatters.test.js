import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDuration, truncate } from '../utils/formatters';

describe('Formatters Utilities', () => {
  it('formats currency values to INR symbol format', () => {
    const formatted = formatCurrency(450);
    expect(formatted).toContain('450');
    expect(formatCurrency(0)).toContain('0');
    expect(formatCurrency(null)).toBe('₹0');
  });

  it('formats minute durations to hours and minutes string', () => {
    expect(formatDuration(165)).toBe('2h 45m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(0)).toBe('-');
  });

  it('truncates strings exceeding max length', () => {
    expect(truncate('Short', 10)).toBe('Short');
    expect(truncate('Supercalifragilistic', 5)).toBe('Super...');
  });
});

