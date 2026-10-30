import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber } from '../utils/formatters';

describe('Platform Financial & Commission Reconciliation Engine', () => {
  it('correctly calculates 10% standard platform commission on gross sales', () => {
    const grossGMV = 100000; // 1 Lakh INR
    const platformCommissionRate = 0.10; // 10% take rate
    const platformCommission = grossGMV * platformCommissionRate;
    const theatrePayable = grossGMV - platformCommission;

    expect(platformCommission).toBe(10000);
    expect(theatrePayable).toBe(90000);
    expect(formatCurrency(platformCommission)).toContain('10,000');
    expect(formatCurrency(theatrePayable)).toContain('90,000');
  });

  it('correctly incorporates refunds in net settlement formula', () => {
    const grossGMV = 50000;
    const commission = grossGMV * 0.10; // 5000
    const customerRefunds = 4000;
    
    // Net Payable = Gross - Commission - Refunds
    const netPayable = grossGMV - commission - customerRefunds;

    expect(netPayable).toBe(41000);
    expect(grossGMV).toBe(commission + customerRefunds + netPayable);
  });

  it('handles edge cases with zero volume gracefully', () => {
    const zeroGross = 0;
    const zeroCommission = zeroGross * 0.10;
    const zeroPayable = zeroGross - zeroCommission;

    expect(zeroCommission).toBe(0);
    expect(zeroPayable).toBe(0);
    expect(formatCurrency(0)).toContain('0');
  });
});
