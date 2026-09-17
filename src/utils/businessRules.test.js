import {
  calculateAmount,
  calculatePending,
  calculateTotalExpenses,
  roundToNearest,
  reconcileBirds,
  isCompleteSaleLine,
  AMOUNT_ROUNDING_INCREMENT
} from './businessRules';

describe('roundToNearest', () => {
  it('rounds to whole rupees by default, halves up', () => {
    expect(roundToNearest(4.4)).toBe(4);
    expect(roundToNearest(4.5)).toBe(5);
    expect(roundToNearest(4.6)).toBe(5);
  });

  it('rounds to an arbitrary increment', () => {
    expect(roundToNearest(254, 10)).toBe(250);
    expect(roundToNearest(255, 10)).toBe(260);
    expect(roundToNearest(256, 10)).toBe(260);
  });

  it('returns 0 for non-numeric input rather than NaN', () => {
    expect(roundToNearest('abc')).toBe(0);
    expect(roundToNearest(undefined)).toBe(0);
    expect(roundToNearest(null)).toBe(0);
    expect(roundToNearest(Infinity)).toBe(0);
  });
});

describe('calculateAmount', () => {
  it('rounds sale amounts to the nearest ₹10', () => {
    expect(AMOUNT_ROUNDING_INCREMENT).toBe(10);
    expect(calculateAmount(2.5, 100)).toBe(250);
    expect(calculateAmount(2.53, 100)).toBe(250);
    expect(calculateAmount(2.56, 100)).toBe(260);
    expect(calculateAmount(1.2, 87)).toBe(100);
  });

  // 2.55 * 100 evaluates to 254.99999999999997 in IEEE-754. Rounding naively
  // sends it DOWN to 250 when the intended answer is 260. Each of these lands
  // exactly on a half-step and must round up.
  it('rounds up on half-steps despite floating point error', () => {
    expect(calculateAmount(2.55, 100)).toBe(260);
    expect(calculateAmount(1.15, 100)).toBe(120);
    expect(calculateAmount(0.35, 100)).toBe(40);
    expect(calculateAmount(3.45, 100)).toBe(350);
    expect(calculateAmount(8.15, 100)).toBe(820);
    expect(calculateAmount(1.005, 1000)).toBe(1010);
  });

  it('coerces strings and blanks from text inputs', () => {
    expect(calculateAmount('3', '90')).toBe(270);
    expect(calculateAmount('', '')).toBe(0);
    expect(calculateAmount('2.5', '')).toBe(0);
  });
});

describe('calculatePending', () => {
  // The backend stores pending = amount - payment exactly, so the frontend
  // must not apply the ₹10 rounding here or the ledger will drift.
  it('is the exact difference, not rounded to ₹10', () => {
    expect(calculatePending(250, 137)).toBe(113);
    expect(calculatePending(250, 245)).toBe(5);
  });

  it('treats a cleared payment as zero', () => {
    expect(calculatePending(250, '')).toBe(250);
    expect(calculatePending(250, null)).toBe(250);
  });

  it('goes negative when the customer overpays', () => {
    expect(calculatePending(250, 300)).toBe(-50);
  });
});

describe('calculateTotalExpenses', () => {
  it('sums driver expense, diesel and hamali', () => {
    expect(calculateTotalExpenses({ driverExpense: 500, diesel: 1200, hamali: 300 })).toBe(2000);
  });

  it('tolerates missing fields', () => {
    expect(calculateTotalExpenses({ driverExpense: '', diesel: 100, hamali: undefined })).toBe(100);
  });
});

describe('isCompleteSaleLine', () => {
  it('counts a line once it has a weight and a rate', () => {
    expect(isCompleteSaleLine({ kilograms: '2.5', rate: '100' })).toBe(true);
    expect(isCompleteSaleLine({ kilograms: 2.5, rate: 100 })).toBe(true);
  });

  it('rejects a line missing either figure', () => {
    expect(isCompleteSaleLine({ kilograms: '2.5', rate: '' })).toBe(false);
    expect(isCompleteSaleLine({ kilograms: '', rate: '100' })).toBe(false);
    expect(isCompleteSaleLine({ kilograms: '', rate: '' })).toBe(false);
  });

  // The old filter used `birds !== ''`, which passed for the initial 0 and let
  // rows with no weight or rate through to the server.
  it('rejects a row that only has birds entered', () => {
    expect(isCompleteSaleLine({ birds: 50, kilograms: '', rate: '' })).toBe(false);
  });

  it('rejects zero weight or zero rate', () => {
    expect(isCompleteSaleLine({ kilograms: 0, rate: 100 })).toBe(false);
    expect(isCompleteSaleLine({ kilograms: 2.5, rate: 0 })).toBe(false);
  });

  it('handles missing and malformed input', () => {
    expect(isCompleteSaleLine(null)).toBe(false);
    expect(isCompleteSaleLine(undefined)).toBe(false);
    expect(isCompleteSaleLine({})).toBe(false);
    expect(isCompleteSaleLine({ kilograms: 'abc', rate: '100' })).toBe(false);
  });

  // A customer who took no birds this trip but handed over cash against
  // their balance - no weight or rate at all, just a payment.
  it('counts a payment-only line with no birds, weight or rate', () => {
    expect(isCompleteSaleLine({ birds: 0, kilograms: '', rate: '', payment: '2000' })).toBe(true);
    expect(isCompleteSaleLine({ birds: 0, kilograms: 0, rate: 0, payment: 2000 })).toBe(true);
  });

  it('still rejects a half-filled line even with a payment on it', () => {
    // Weight without a rate (or vice versa) is a data entry mistake, not a
    // payment-only line, regardless of whether a payment was also entered.
    expect(isCompleteSaleLine({ kilograms: '2.5', rate: '', payment: '2000' })).toBe(false);
    expect(isCompleteSaleLine({ kilograms: '', rate: '100', payment: '2000' })).toBe(false);
  });
});

describe('reconcileBirds', () => {
  it('balances when loaded equals sold + mortality + returned', () => {
    const result = reconcileBirds({ totalBirds: 100, soldBirds: 90, mortality: 5, returnToFarm: 5 });
    expect(result.balanced).toBe(true);
    expect(result.difference).toBe(0);
    expect(result.message).toBeNull();
  });

  it('reports birds unaccounted for', () => {
    const result = reconcileBirds({ totalBirds: 100, soldBirds: 90, mortality: 4, returnToFarm: 3 });
    expect(result.balanced).toBe(false);
    expect(result.difference).toBe(3);
    expect(result.accountedFor).toBe(97);
    expect(result.message).toBe('3 birds unaccounted for');
  });

  it('reports more birds distributed than loaded', () => {
    const result = reconcileBirds({ totalBirds: 100, soldBirds: 95, mortality: 4, returnToFarm: 3 });
    expect(result.difference).toBe(-2);
    expect(result.message).toBe('2 birds more than loaded');
  });

  it('singularises a one-bird discrepancy', () => {
    expect(reconcileBirds({ totalBirds: 100, soldBirds: 99, mortality: 0, returnToFarm: 0 }).message)
      .toBe('1 bird unaccounted for');
    expect(reconcileBirds({ totalBirds: 100, soldBirds: 101, mortality: 0, returnToFarm: 0 }).message)
      .toBe('1 bird more than loaded');
  });

  it('treats blank fields as zero', () => {
    const result = reconcileBirds({ totalBirds: 100, soldBirds: '', mortality: '', returnToFarm: '' });
    expect(result.accountedFor).toBe(0);
    expect(result.difference).toBe(100);
  });
});
