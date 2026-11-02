import { SeatStatus, SeatType } from './screen.constants.js';

/**
 * Validates a seating layout structure and checks for structural invariant violations.
 *
 * @param {Array<Object>} seats - Array of seat definitions
 * @param {Array<string>} [validCategoryCodes=[]] - Optional list of valid category codes in system/partner
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export const validateLayout = (seats, validCategoryCodes = []) => {
  const errors = [];

  if (!Array.isArray(seats) || seats.length === 0) {
    return {
      isValid: false,
      errors: ['Layout must contain at least one seat.']
    };
  }

  const seatLabelSet = new Set();
  const coordinateSet = new Set();
  const validCategorySet = new Set(validCategoryCodes.map(c => String(c).toUpperCase()));

  for (let i = 0; i < seats.length; i += 1) {
    const seat = seats[i];
    const indexStr = `Seat at index ${i}`;

    // Validate seatLabel
    if (!seat.seatLabel || typeof seat.seatLabel !== 'string' || seat.seatLabel.trim() === '') {
      errors.push(`${indexStr} is missing a valid seat label.`);
    } else {
      const normalizedLabel = seat.seatLabel.trim().toUpperCase();
      if (seatLabelSet.has(normalizedLabel)) {
        errors.push(`Duplicate seat label detected: "${normalizedLabel}".`);
      } else {
        seatLabelSet.add(normalizedLabel);
      }
    }

    // Validate coordinates
    if (typeof seat.gridRow !== 'number' || seat.gridRow < 0) {
      errors.push(`${indexStr} (${seat.seatLabel || 'unnamed'}) has an invalid gridRow.`);
    }
    if (typeof seat.gridCol !== 'number' || seat.gridCol < 0) {
      errors.push(`${indexStr} (${seat.seatLabel || 'unnamed'}) has an invalid gridCol.`);
    }

    if (
      typeof seat.gridRow === 'number' &&
      seat.gridRow >= 0 &&
      typeof seat.gridCol === 'number' &&
      seat.gridCol >= 0
    ) {
      const coordKey = `${seat.gridRow}:${seat.gridCol}`;
      if (coordinateSet.has(coordKey)) {
        errors.push(
          `Overlapping coordinate detected at row ${seat.gridRow}, col ${seat.gridCol} for seat "${seat.seatLabel || i}".`
        );
      } else {
        coordinateSet.add(coordKey);
      }
    }

    // Validate Row Label & Column Number
    if (!seat.rowLabel || typeof seat.rowLabel !== 'string') {
      errors.push(`${indexStr} is missing a valid row label.`);
    }
    if (typeof seat.columnNumber !== 'number' || seat.columnNumber < 1) {
      errors.push(`${indexStr} column number must be a positive integer.`);
    }

    // Validate Category Code if category validation list provided
    if (validCategorySet.size > 0 && seat.categoryCode) {
      const cat = String(seat.categoryCode).toUpperCase();
      if (!validCategorySet.has(cat)) {
        errors.push(
          `Seat "${seat.seatLabel}" references unknown or inactive category code: "${seat.categoryCode}".`
        );
      }
    }

    // Validate Seat Type
    if (seat.type && !Object.values(SeatType).includes(seat.type)) {
      errors.push(`Seat "${seat.seatLabel}" has invalid seat type: "${seat.type}".`);
    }

    // Validate Seat Status
    if (seat.status && !Object.values(SeatStatus).includes(seat.status)) {
      errors.push(`Seat "${seat.seatLabel}" has invalid seat status: "${seat.status}".`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Calculates capacities and metric breakdowns for a seating layout.
 *
 * @param {Array<Object>} seats - Array of seat definitions
 * @returns {Object} Calculated capacity statistics
 */
export const calculateCapacity = (seats = []) => {
  if (!Array.isArray(seats) || seats.length === 0) {
    return {
      totalSeats: 0,
      bookableSeats: 0,
      activeSeats: 0,
      blockedSeats: 0,
      maintenanceSeats: 0,
      inactiveSeats: 0,
      totalRows: 0,
      totalColumns: 0,
      categoryBreakdown: [],
      rowBreakdown: []
    };
  }

  let bookableCount = 0;
  let activeCount = 0;
  let blockedCount = 0;
  let maintenanceCount = 0;
  let inactiveCount = 0;

  let maxRow = 0;
  let maxCol = 0;

  const categoryMap = new Map();
  const rowMap = new Map();

  for (const seat of seats) {
    const isBookable =
      (seat.status === SeatStatus.ACTIVE || !seat.status) && seat.isAvailable !== false;

    if (isBookable) {
      bookableCount += 1;
    }

    if (seat.status === SeatStatus.ACTIVE || !seat.status) {
      activeCount += 1;
    } else if (seat.status === SeatStatus.BLOCKED) {
      blockedCount += 1;
    } else if (seat.status === SeatStatus.MAINTENANCE) {
      maintenanceCount += 1;
    } else if (seat.status === SeatStatus.INACTIVE) {
      inactiveCount += 1;
    }

    if (typeof seat.gridRow === 'number' && seat.gridRow > maxRow) {
      maxRow = seat.gridRow;
    }
    if (typeof seat.gridCol === 'number' && seat.gridCol > maxCol) {
      maxCol = seat.gridCol;
    }

    // Category breakdown
    const catCode = seat.categoryCode ? seat.categoryCode.toUpperCase() : 'REGULAR';
    if (!categoryMap.has(catCode)) {
      categoryMap.set(catCode, { categoryCode: catCode, count: 0, bookableCount: 0 });
    }
    const catEntry = categoryMap.get(catCode);
    catEntry.count += 1;
    if (isBookable) {
      catEntry.bookableCount += 1;
    }

    // Row breakdown
    const rLabel = seat.rowLabel ? seat.rowLabel.toUpperCase() : 'A';
    if (!rowMap.has(rLabel)) {
      rowMap.set(rLabel, { rowLabel: rLabel, totalSeats: 0, bookableSeats: 0 });
    }
    const rowEntry = rowMap.get(rLabel);
    rowEntry.totalSeats += 1;
    if (isBookable) {
      rowEntry.bookableSeats += 1;
    }
  }

  const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) =>
    a.categoryCode.localeCompare(b.categoryCode)
  );
  const rowBreakdown = Array.from(rowMap.values()).sort((a, b) =>
    a.rowLabel.localeCompare(b.rowLabel)
  );

  return {
    totalSeats: seats.length,
    bookableSeats: bookableCount,
    activeSeats: activeCount,
    blockedSeats: blockedCount,
    maintenanceSeats: maintenanceCount,
    inactiveSeats: inactiveCount,
    totalRows: rowBreakdown.length > 0 ? rowBreakdown.length : maxRow + 1,
    totalColumns: maxCol + 1,
    categoryBreakdown,
    rowBreakdown
  };
};

/**
 * Generates an array of physical seat objects according to grid parameters.
 *
 * @param {Object} config - Generation configuration
 * @param {Array<Object>} config.rows - Array of row generation definitions
 * @returns {Array<Object>} Generated seats array
 */
export const generateBulkSeats = config => {
  if (!config || !Array.isArray(config.rows) || config.rows.length === 0) {
    return [];
  }

  const generatedSeats = [];

  config.rows.forEach((rowConfig, rowIndex) => {
    const rowLabel = (rowConfig.rowLabel || String.fromCharCode(65 + rowIndex)).toUpperCase();
    const seatCount = Number(rowConfig.seatCount) || 10;
    const categoryCode = (rowConfig.categoryCode || 'REGULAR').toUpperCase();
    const seatType = rowConfig.seatType || SeatType.NORMAL;
    const aislesAfter = Array.isArray(rowConfig.aislesAfter) ? rowConfig.aislesAfter : [];
    const skipColumns = Array.isArray(rowConfig.skipColumns) ? rowConfig.skipColumns : [];

    let currentGridCol = 0;
    let colNumber = 1;

    for (let c = 1; c <= seatCount; c += 1) {
      // Check if this column number should be skipped (e.g. pillar or void space)
      if (skipColumns.includes(c)) {
        currentGridCol += 1;
        continue;
      }

      const seatLabel = `${rowLabel}${colNumber}`;

      generatedSeats.push({
        rowLabel,
        columnNumber: colNumber,
        seatLabel,
        categoryCode,
        type: seatType,
        status: SeatStatus.ACTIVE,
        gridRow: rowIndex,
        gridCol: currentGridCol,
        isAvailable: true,
        accessibility: {
          isWheelchairAccessible: seatType === SeatType.WHEELCHAIR,
          hasCompanionSeat: seatType === SeatType.COMPANION,
          hasHearingLoop: false
        }
      });

      colNumber += 1;
      currentGridCol += 1;

      // If an aisle gap is designated after this seat column
      if (aislesAfter.includes(c)) {
        currentGridCol += 1; // leave 1 empty grid column for walking aisle
      }
    }
  });

  return generatedSeats;
};

export default {
  validateLayout,
  calculateCapacity,
  generateBulkSeats
};
