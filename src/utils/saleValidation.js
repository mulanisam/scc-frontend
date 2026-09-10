/**
 * Pre-submission checks for sale entry.
 *
 * Kept separate from the components so the rules are unit-testable and shared
 * by every entry point (Bulk, Single, Driver).
 */

/** Normalise a date-ish value to a YYYY-MM-DD string, or null. */
export const toDateKey = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Use local date parts: toISOString() shifts to UTC and can roll the day.
    const pad = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return null;
};

/** Whole days from `from` to `to`, both YYYY-MM-DD. Negative if `to` is earlier. */
export const daysBetween = (from, to) => {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
};

export const SaleDateIssue = {
  FUTURE_DATE: 'FUTURE_DATE',
  BACKDATED: 'BACKDATED',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY'
};

/**
 * Validate the date of a sale entry.
 *
 * - A future-dated sale is never allowed.
 * - An entry dated before the most recent sale on the same route is allowed,
 *   but must be confirmed: saving it makes the backend recalculate every
 *   ledger balance from that date forward.
 *
 * @param {Object} args
 * @param {string|Date} args.saleDate       The date being entered.
 * @param {string|Date} [args.lastSaleDate] Most recent sale already recorded
 *                                          on this route, if any.
 * @param {string|Date} [args.today]        Defaults to the current date.
 * @returns {{ blocked: boolean, requiresConfirmation: boolean,
 *             issue: string|null, message: string|null, daysBack: number }}
 */
export const validateSaleDate = ({ saleDate, lastSaleDate, today } = {}) => {
  const date = toDateKey(saleDate);
  const todayKey = toDateKey(today) ?? toDateKey(new Date());
  const lastKey = toDateKey(lastSaleDate);

  const ok = { blocked: false, requiresConfirmation: false, issue: null, message: null, daysBack: 0 };

  if (!date) {
    return { ...ok, blocked: true, message: 'Sale date is required.' };
  }

  if (daysBetween(todayKey, date) > 0) {
    return {
      ...ok,
      blocked: true,
      issue: SaleDateIssue.FUTURE_DATE,
      message: 'This sale is dated in the future. Future-dated sales cannot be saved.'
    };
  }

  if (lastKey) {
    const daysBack = daysBetween(date, lastKey);
    if (daysBack > 0) {
      return {
        ...ok,
        requiresConfirmation: true,
        issue: SaleDateIssue.BACKDATED,
        daysBack,
        message:
          `This entry is dated ${daysBack} day${daysBack === 1 ? '' : 's'} before the last ` +
          `recorded sale on this route (${lastKey}). Saving it will recalculate ledger ` +
          'balances for these customers from this date onward.'
      };
    }
  }

  return ok;
};

/**
 * Describe any trip already recorded for this date and route, so the operator
 * can decide whether they are about to enter a duplicate.
 *
 * Takes the payload of GET /user/sales/tripContext. The server answers this
 * because the browser cannot: it has no view of what is already saved.
 *
 * @param {Object|null} tripContext Response from the trip-context endpoint.
 * @returns {{ isDuplicate: boolean, tripCount: number, message: string|null }}
 */
export const checkDuplicateEntry = (tripContext) => {
  if (!tripContext || !tripContext.duplicate) {
    return { isDuplicate: false, tripCount: 0, message: null };
  }

  const tripCount = tripContext.existingTripCount ?? 1;
  const birds = Number(tripContext.existingBirds) || 0;
  const amount = Number(tripContext.existingAmount) || 0;
  const trips = tripCount === 1 ? 'entry' : 'entries';

  return {
    isDuplicate: true,
    tripCount,
    message:
      `${tripCount} sale ${trips} already ${tripCount === 1 ? 'exists' : 'exist'} ` +
      `for this date and route (${birds.toLocaleString('en-IN')} birds, ` +
      `₹${amount.toLocaleString('en-IN')}). Saving will add another.`
  };
};

/**
 * Build the figures shown on the pre-submit confirmation screen.
 *
 * @param {Object} args
 * @param {Object} args.formData   Trip header being submitted.
 * @param {Array}  args.lines      Completed customer sale lines.
 * @param {Object} args.totals     Aggregated totals for those lines.
 * @param {Object} args.birdCheck  Result of reconcileBirds().
 * @param {Object} args.labels     Resolved display names { route, vehicle, driver }.
 * @returns {Object} A plain summary object for rendering.
 */
export const buildSaleSummary = ({ formData, lines, totals, birdCheck, labels = {} }) => ({
  date: toDateKey(formData?.date),
  route: labels.route ?? formData?.selectedRoute ?? '',
  vehicle: labels.vehicle ?? formData?.selectedVehicle ?? '',
  driver: labels.driver ?? formData?.selectedDriver ?? '',
  description: formData?.description ?? '',
  sendSms: Boolean(formData?.sendSms),
  customerCount: lines?.length ?? 0,
  birds: {
    loaded: birdCheck?.totalBirds ?? 0,
    sold: totals?.birds ?? 0,
    mortality: Number(formData?.mortality) || 0,
    returnToFarm: Number(formData?.returnToFarm) || 0,
    balanced: Boolean(birdCheck?.balanced),
    message: birdCheck?.message ?? null
  },
  money: {
    weight: totals?.kilograms ?? 0,
    amount: totals?.amount ?? 0,
    payment: totals?.payment ?? 0,
    pending: totals?.pending ?? 0
  }
});

const saleValidation = {
  toDateKey,
  daysBetween,
  validateSaleDate,
  checkDuplicateEntry,
  buildSaleSummary,
  SaleDateIssue
};

export default saleValidation;
