import BookingPricingService from '../../src/modules/bookings/booking-pricing.service.js';
import { AppError } from '../../src/common/errors/app.error.js';

describe('BookingPricingService Unit Tests', () => {
  const mockPricingTiers = [
    {
      categoryCode: 'RECLINER',
      categoryName: 'Royal Recliner',
      basePrice: 500,
      convenienceFee: 30,
      taxPercent: 18,
      effectivePrice: 535.4
    },
    {
      categoryCode: 'PRIME',
      categoryName: 'Prime Plus',
      basePrice: 300,
      convenienceFee: 25,
      taxPercent: 18,
      effectivePrice: 329.5
    }
  ];

  it('should accurately calculate total price for single seat category', () => {
    const seats = [
      {
        _id: '65f1a2b3c4d5e6f7a8b9c001',
        seatLabel: 'A1',
        rowLabel: 'A',
        columnNumber: 1,
        categoryCode: 'RECLINER'
      },
      {
        _id: '65f1a2b3c4d5e6f7a8b9c002',
        seatLabel: 'A2',
        rowLabel: 'A',
        columnNumber: 2,
        categoryCode: 'RECLINER'
      }
    ];

    const result = BookingPricingService.calculateBookingPrice(seats, mockPricingTiers);

    // 2 x 500 = 1000 base
    expect(result.baseAmount).toBe(1000);
    // 2 x 30 = 60 convenience fee
    expect(result.convenienceFee).toBe(60);
    // 18% of 60 = 10.8 tax
    expect(result.taxAmount).toBe(10.8);
    // Net payable = 1000 + 60 + 10.8 = 1070.8
    expect(result.netPayableAmount).toBe(1070.8);
    expect(result.seatLineItems).toHaveLength(2);
    expect(result.seatLineItems[0].unitPrice).toBe(535.4);
  });

  it('should accurately calculate price across multiple seat categories', () => {
    const seats = [
      {
        _id: '65f1a2b3c4d5e6f7a8b9c001',
        seatLabel: 'A1',
        rowLabel: 'A',
        columnNumber: 1,
        categoryCode: 'RECLINER'
      },
      {
        _id: '65f1a2b3c4d5e6f7a8b9c003',
        seatLabel: 'B1',
        rowLabel: 'B',
        columnNumber: 1,
        categoryCode: 'PRIME'
      }
    ];

    const result = BookingPricingService.calculateBookingPrice(seats, mockPricingTiers);

    // 500 + 300 = 800 base
    expect(result.baseAmount).toBe(800);
    // 30 + 25 = 55 convenience fee
    expect(result.convenienceFee).toBe(55);
    // Tax = (30 * 0.18) + (25 * 0.18) = 5.4 + 4.5 = 9.9
    expect(result.taxAmount).toBe(9.9);
    expect(result.netPayableAmount).toBe(864.9);
    expect(result.currency).toBe('INR');
  });

  it('should apply discount amount correctly without negative payable amounts', () => {
    const seats = [
      {
        _id: '65f1a2b3c4d5e6f7a8b9c001',
        seatLabel: 'A1',
        categoryCode: 'RECLINER'
      }
    ];

    const result = BookingPricingService.calculateBookingPrice(seats, mockPricingTiers, {
      discountAmount: 100
    });

    expect(result.baseAmount).toBe(500);
    expect(result.discountAmount).toBe(100);
    expect(result.netPayableAmount).toBe(435.4);
  });

  it('should throw an error if pricing tier is missing for a requested category', () => {
    const seats = [
      {
        _id: '65f1a2b3c4d5e6f7a8b9c001',
        seatLabel: 'Z1',
        categoryCode: 'VIP_LOUNGE'
      }
    ];

    expect(() => BookingPricingService.calculateBookingPrice(seats, mockPricingTiers)).toThrow(
      AppError
    );
  });

  it('should throw an error if no seats are supplied', () => {
    expect(() => BookingPricingService.calculateBookingPrice([], mockPricingTiers)).toThrow(
      AppError
    );
  });
});
