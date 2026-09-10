import {
  toDateKey,
  daysBetween,
  validateSaleDate,
  checkDuplicateEntry,
  buildSaleSummary,
  SaleDateIssue
} from './saleValidation';

describe('toDateKey', () => {
  it('trims ISO timestamps to a date', () => {
    expect(toDateKey('2026-09-09T14:30:00Z')).toBe('2026-09-09');
    expect(toDateKey('2026-09-09')).toBe('2026-09-09');
  });

  it('uses local date parts so the day does not roll across UTC', () => {
    // 23:30 local on the 9th must stay the 9th, not become the 10th.
    expect(toDateKey(new Date(2026, 8, 9, 23, 30))).toBe('2026-09-09');
    expect(toDateKey(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01');
  });

  it('returns null for empty or invalid input', () => {
    expect(toDateKey(null)).toBeNull();
    expect(toDateKey('')).toBeNull();
    expect(toDateKey(new Date('nope'))).toBeNull();
  });
});

describe('daysBetween', () => {
  it('counts whole days forward and backward', () => {
    expect(daysBetween('2026-09-09', '2026-09-12')).toBe(3);
    expect(daysBetween('2026-09-12', '2026-09-09')).toBe(-3);
    expect(daysBetween('2026-09-09', '2026-09-09')).toBe(0);
  });

  it('spans month and year boundaries', () => {
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
  });
});

describe('validateSaleDate', () => {
  const today = '2026-09-09';

  it('accepts a sale dated today', () => {
    const result = validateSaleDate({ saleDate: today, today });
    expect(result.blocked).toBe(false);
    expect(result.requiresConfirmation).toBe(false);
  });

  it('blocks a future-dated sale', () => {
    const result = validateSaleDate({ saleDate: '2026-09-10', today });
    expect(result.blocked).toBe(true);
    expect(result.issue).toBe(SaleDateIssue.FUTURE_DATE);
  });

  it('blocks when no date is supplied', () => {
    expect(validateSaleDate({ saleDate: '', today }).blocked).toBe(true);
  });

  it('accepts a past date when it is not before the last recorded sale', () => {
    const result = validateSaleDate({ saleDate: '2026-09-08', lastSaleDate: '2026-09-07', today });
    expect(result.blocked).toBe(false);
    expect(result.requiresConfirmation).toBe(false);
  });

  // The scenario described: last sale 2 days back, entering one 3 days back.
  it('asks for confirmation when dated before the last sale on the route', () => {
    const result = validateSaleDate({
      saleDate: '2026-09-06',
      lastSaleDate: '2026-09-07',
      today
    });
    expect(result.blocked).toBe(false);
    expect(result.requiresConfirmation).toBe(true);
    expect(result.issue).toBe(SaleDateIssue.BACKDATED);
    expect(result.daysBack).toBe(1);
    expect(result.message).toContain('recalculate ledger');
  });

  it('does not ask for confirmation on the same day as the last sale', () => {
    const result = validateSaleDate({
      saleDate: '2026-09-07',
      lastSaleDate: '2026-09-07',
      today
    });
    expect(result.requiresConfirmation).toBe(false);
  });

  it('treats a future date as blocking even when backdated logic would apply', () => {
    const result = validateSaleDate({
      saleDate: '2026-09-20',
      lastSaleDate: '2026-09-25',
      today
    });
    expect(result.blocked).toBe(true);
    expect(result.issue).toBe(SaleDateIssue.FUTURE_DATE);
  });

  it('handles a route with no prior sales', () => {
    const result = validateSaleDate({ saleDate: '2026-01-01', lastSaleDate: null, today });
    expect(result.blocked).toBe(false);
    expect(result.requiresConfirmation).toBe(false);
  });
});

describe('checkDuplicateEntry', () => {
  it('reports no duplicate for an empty or negative response', () => {
    expect(checkDuplicateEntry(null).isDuplicate).toBe(false);
    expect(checkDuplicateEntry({}).isDuplicate).toBe(false);
    expect(checkDuplicateEntry({ duplicate: false }).isDuplicate).toBe(false);
  });

  it('describes a single existing trip', () => {
    const result = checkDuplicateEntry({
      duplicate: true, existingTripCount: 1, existingBirds: 420, existingAmount: 51000
    });
    expect(result.isDuplicate).toBe(true);
    expect(result.tripCount).toBe(1);
    expect(result.message).toContain('1 sale entry already exists');
    expect(result.message).toContain('420 birds');
    expect(result.message).toContain('51,000');
  });

  it('pluralises when several trips exist', () => {
    const result = checkDuplicateEntry({
      duplicate: true, existingTripCount: 2, existingBirds: 187, existingAmount: 58910
    });
    expect(result.tripCount).toBe(2);
    expect(result.message).toContain('2 sale entries already exist');
  });

  it('handles a duplicate flag with no totals', () => {
    const result = checkDuplicateEntry({ duplicate: true });
    expect(result.isDuplicate).toBe(true);
    expect(result.message).toContain('0 birds');
  });
});

// Guards the contract with GET /user/sales/tripContext. This is the response the
// live endpoint returned for a date that already had trips on route 1; if either
// side changes shape, these assertions fail rather than the warnings silently
// disappearing from the entry screen.
describe('trip context response from the API', () => {
  const apiResponse = {
    date: '2026-09-01',
    routeId: 1,
    duplicate: true,
    existingTripCount: 2,
    existingBirds: 187,
    existingAmount: 58910.0,
    lastSaleDate: '2026-09-08',
    daysBeforeLastSale: 7
  };

  it('turns the response into a duplicate warning', () => {
    const result = checkDuplicateEntry(apiResponse);
    expect(result.isDuplicate).toBe(true);
    expect(result.tripCount).toBe(2);
    expect(result.message).toContain('2 sale entries already exist');
    expect(result.message).toContain('187 birds');
    expect(result.message).toContain('58,910');
  });

  it('uses lastSaleDate to require backdate confirmation', () => {
    const result = validateSaleDate({
      saleDate: apiResponse.date,
      lastSaleDate: apiResponse.lastSaleDate,
      today: '2026-09-10'
    });
    expect(result.blocked).toBe(false);
    expect(result.requiresConfirmation).toBe(true);
    expect(result.daysBack).toBe(apiResponse.daysBeforeLastSale);
    expect(result.message).toContain('recalculate ledger');
  });

  it('raises no warnings when the route has no prior trips', () => {
    const empty = { date: '2026-09-10', routeId: 9, duplicate: false, existingTripCount: 0 };
    expect(checkDuplicateEntry(empty).isDuplicate).toBe(false);
    expect(validateSaleDate({
      saleDate: empty.date, lastSaleDate: empty.lastSaleDate, today: '2026-09-10'
    }).requiresConfirmation).toBe(false);
  });
});

describe('buildSaleSummary', () => {
  const args = {
    formData: {
      date: '2026-09-09',
      mortality: '4',
      returnToFarm: '6',
      description: 'morning load',
      sendSms: true
    },
    lines: [{}, {}, {}],
    totals: { birds: 90, kilograms: 180.5, amount: 45000, payment: 30000, pending: 15000 },
    birdCheck: { totalBirds: 100, balanced: true, message: null },
    labels: { route: 'Madha', vehicle: 'MH13 AB 1234', driver: 'Imran' }
  };

  it('collects the trip header and resolved labels', () => {
    const summary = buildSaleSummary(args);
    expect(summary.date).toBe('2026-09-09');
    expect(summary.route).toBe('Madha');
    expect(summary.vehicle).toBe('MH13 AB 1234');
    expect(summary.driver).toBe('Imran');
    expect(summary.customerCount).toBe(3);
  });

  it('summarises the bird reconciliation', () => {
    const summary = buildSaleSummary(args);
    expect(summary.birds).toMatchObject({
      loaded: 100, sold: 90, mortality: 4, returnToFarm: 6, balanced: true
    });
  });

  it('summarises the money totals', () => {
    const summary = buildSaleSummary(args);
    expect(summary.money).toMatchObject({
      weight: 180.5, amount: 45000, payment: 30000, pending: 15000
    });
  });

  it('survives missing sections without throwing', () => {
    const summary = buildSaleSummary({});
    expect(summary.customerCount).toBe(0);
    expect(summary.birds.loaded).toBe(0);
    expect(summary.money.amount).toBe(0);
  });
});
