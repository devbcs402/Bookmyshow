import { describe, it, expect } from 'vitest';

describe('Financial Revenue & Settlement Formulas', () => {
  it('correctly calculates partner net payable after platform commission and refunds', () => {
    const grossSales = 100000; // ₹1,00,000
    const platformCommissionRate = 0.10; // 10%
    const customerRefunds = 5000; // ₹5,000

    const platformCommission = grossSales * platformCommissionRate; // 10,000
    const netPayable = grossSales - platformCommission - customerRefunds; // 85,000

    expect(platformCommission).toBe(10000);
    expect(netPayable).toBe(85000);
    expect(netPayable + platformCommission + customerRefunds).toBe(grossSales);
  });
});

