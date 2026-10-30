import { describe, it, expect, vi } from 'vitest';
import { exportToCsv } from '../utils/csvExport';

describe('exportToCsv Utility', () => {
  it('correctly constructs and triggers download for array dataset', () => {
    const mockData = [
      { date: '2026-11-01', confirmed: 45, sales: 12500 },
      { date: '2026-11-02', confirmed: 60, sales: 18000 }
    ];

    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    exportToCsv(mockData, 'test_settlement.csv');

    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});

