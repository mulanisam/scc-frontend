/**
 * Shared business-rule utilities for Sohel Chicken Centre.
 *
 * Centralising rounding, amount calculation, and pending-balance logic
 * ensures the same business rules are applied consistently across every
 * sales/purchase/payment entry point (Bulk, Single, Driver, Trading, etc.).
 *
 * These rules must match the server's MoneyRules exactly. The backend now
 * recalculates each line amount and REJECTS a submission whose amount
 * disagrees with its own, so a divergence here does not write bad money - it
 * refuses the sale. A parity test on the server checks both implementations
 * against the same fixture; regenerate it if this rule changes deliberately.
 */

export const CurrencySymbols = {
  INR: '₹',
};

/**
 * Sale amounts are rounded to the nearest ₹10 for cash handling in the field.
 */
export const AMOUNT_ROUNDING_INCREMENT = 10;

/**
 * Round a value to the nearest multiple of `increment`, with halves rounding
 * up (₹15 -> ₹20 at an increment of 10).
 *
 * @param {number|string} amount
 * @param {number} [increment=1]
 * @returns {number}
 */
export const roundToNearest = (amount, increment = 1) => {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return 0;

  const step = Number(increment) || 1;

  // Strip floating-point noise before deciding which side of the halfway
  // point we land on. 2.55 * 100 evaluates to 254.99999999999997, which would
  // otherwise round DOWN to ₹250 when the intended answer is ₹260.
  const scaled = Math.round((numeric / step) * 1e6) / 1e6;

  const base = Math.floor(scaled);
  const rounded = scaled >= base + 0.5 ? base + 1 : base;

  return rounded * step;
};

/**
 * Round a monetary amount to the nearest whole rupee.
 */
export const roundAmount = (amount) => roundToNearest(amount, 1);

/**
 * Calculate line amount = kilograms * rate, rounded to the nearest ₹10.
 * @param {number|string} kilograms
 * @param {number|string} rate
 * @returns {number}
 */
export const calculateAmount = (kilograms, rate) => {
  const kg = Number(kilograms) || 0;
  const r = Number(rate) || 0;
  return roundToNearest(kg * r, AMOUNT_ROUNDING_INCREMENT);
};

/**
 * Calculate the pending balance for a customer line.
 *
 * Deliberately NOT rounded to ₹10: the backend stores
 * `pending = amount - payment` exactly, and payment is whatever cash was
 * actually handed over. Rounding here would drift from the stored ledger.
 *
 * @param {number} amount
 * @param {number} payment
 * @returns {number}
 */
export const calculatePending = (amount, payment) =>
  roundAmount((Number(amount) || 0) - (Number(payment) || 0));

/**
 * Whether a grid row represents a real sale line.
 *
 * A line counts once it has both a weight and a rate, since those are what
 * produce an amount - OR once it has a payment with no weight/rate at all: a
 * customer who took no birds this trip but handed over cash against their
 * balance. A row with only a payment used to be filtered out here as
 * "incomplete" and silently dropped before it ever reached the server, which
 * is why that customer's payment never showed up in the entry. A row with
 * only ONE of weight/rate (not both, and no payment either) is still
 * incomplete - that is a half-typed row, not a payment-only line - and is
 * still rejected here as before.
 *
 * Used for BOTH the on-screen totals and the rows actually submitted: when
 * the two disagreed, the bird totals shown to the operator included rows
 * that were never sent, and the server's own reconciliation (which can only
 * see submitted lines) rejected the entry.
 *
 * @param {Object} line
 * @returns {boolean}
 */
export const isCompleteSaleLine = (line) => {
  if (!line) return false;

  const hasValue = (value) =>
    value !== '' && value !== null && value !== undefined && Number(value) > 0;

  const hasWeight = hasValue(line.kilograms);
  const hasRate = hasValue(line.rate);
  // Weight without a rate, or vice versa, is a half-typed row, not a
  // payment-only line - reject it even if a payment was also entered.
  if (hasWeight !== hasRate) return false;

  const hasPayment = hasValue(line.payment);
  return (hasWeight && hasRate) || hasPayment;
};

/**
 * Calculate total expenses (driver expense + diesel + hamali).
 * @param {Object} expenses - { driverExpense, diesel, hamali }
 * @returns {number}
 */
export const calculateTotalExpenses = ({ driverExpense, diesel, hamali }) =>
  roundAmount(
    (Number(driverExpense) || 0) +
      (Number(diesel) || 0) +
      (Number(hamali) || 0)
  );

/**
 * Every bird loaded onto the vehicle must be accounted for:
 *
 *     totalBirds = birds sold + mortality + returned to farm
 *
 * @param {Object} counts
 * @param {number|string} counts.totalBirds  Loaded at the farm
 * @param {number|string} counts.soldBirds   Summed across customer lines
 * @param {number|string} counts.mortality
 * @param {number|string} counts.returnToFarm
 * @returns {{ balanced: boolean, accountedFor: number, difference: number,
 *             totalBirds: number, message: string|null }}
 *          `difference` is positive when birds are unaccounted for and
 *          negative when more were distributed than were loaded.
 */
export const reconcileBirds = ({ totalBirds, soldBirds, mortality, returnToFarm }) => {
  const loaded = Number(totalBirds) || 0;
  const accountedFor =
    (Number(soldBirds) || 0) + (Number(mortality) || 0) + (Number(returnToFarm) || 0);
  const difference = loaded - accountedFor;

  let message = null;
  if (difference > 0) {
    message = `${difference} bird${difference === 1 ? '' : 's'} unaccounted for`;
  } else if (difference < 0) {
    message = `${Math.abs(difference)} bird${difference === -1 ? '' : 's'} more than loaded`;
  }

  return { balanced: difference === 0, accountedFor, difference, totalBirds: loaded, message };
};

const businessRules = {
  roundToNearest,
  roundAmount,
  calculateAmount,
  calculatePending,
  calculateTotalExpenses,
  isCompleteSaleLine,
  reconcileBirds,
  AMOUNT_ROUNDING_INCREMENT,
  CurrencySymbols,
};

export default businessRules;
