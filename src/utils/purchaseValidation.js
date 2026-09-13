/**
 * Pre-submission checks for purchase entry.
 *
 * The purchase side's answer to saleValidation, and written for the same reason: the rules
 * belong somewhere testable rather than inside a 1,000-line component, where the only way to
 * know what blocks a submission is to read the JSX.
 *
 * What the purchase screen checked before was that four fields were non-empty. It did not
 * check that a line's amount matched its own weight and rate - the server did not either, so
 * whatever the browser computed was what got billed - and it had no idea which scanned DC
 * belonged to which line.
 */

import { calculateAmount, calculateTotalExpenses } from './businessRules';

/** Normalise a date-ish value to YYYY-MM-DD, using local parts so the day cannot roll. */
export const toDateKey = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return null;
};

const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isBlank = (value) => value === null || value === undefined || String(value).trim() === '';

/**
 * Whether a purchase can be dated this day.
 *
 * A future date is refused outright and the server refuses it too, so the screen is saying
 * the same thing rather than guessing. Backdating is allowed and only noted, because a DC
 * note arriving three days late is ordinary - but it makes the server rewrite every supplier
 * balance after that date, which the operator should know they are asking for.
 */
export const validatePurchaseDate = ({ entryDate, today } = {}) => {
  const date = toDateKey(entryDate);
  const todayKey = toDateKey(today) ?? toDateKey(new Date());

  if (!date) {
    return { blocked: true, requiresConfirmation: false, message: 'A purchase needs a date.' };
  }
  if (date > todayKey) {
    return {
      blocked: true,
      requiresConfirmation: false,
      message: 'That date is in the future. A purchase cannot be recorded before it happens.'
    };
  }

  const daysBack = Math.round(
    (Date.parse(`${todayKey}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000
  );

  if (daysBack > 0) {
    return {
      blocked: false,
      requiresConfirmation: daysBack > 7,
      daysBack,
      message: `Dated ${daysBack} day${daysBack === 1 ? '' : 's'} back. `
        + "The supplier's balances after this date will be recalculated."
    };
  }
  return { blocked: false, requiresConfirmation: false, daysBack: 0, message: null };
};

/**
 * Checks one DC line and says what is wrong with it.
 *
 * The amount is recalculated from the line's own weight and rate rather than compared against
 * whatever is in the amount box, because the box is derived - and the server now refuses a
 * line whose figures disagree, naming it. Catching it here means the operator sees which line
 * rather than losing the whole form to a 400.
 */
export const validateDcLine = (line, position) => {
  const problems = [];

  if (isBlank(line.dcNo)) {
    problems.push('DC number is missing');
  }
  if (isBlank(line.nos) || num(line.nos) <= 0) {
    problems.push('birds must be more than zero');
  }
  if (isBlank(line.kilograms) || num(line.kilograms) <= 0) {
    problems.push('weight must be more than zero');
  }
  if (isBlank(line.rate) || num(line.rate) <= 0) {
    problems.push('rate must be more than zero');
  }

  const expected = calculateAmount(line.kilograms, line.rate);
  const stated = num(line.amount);
  // Only worth reporting when the line is otherwise complete: an empty line disagrees with
  // everything, and saying so twice helps nobody.
  const amountDisagrees = problems.length === 0 && stated !== expected;
  if (amountDisagrees) {
    problems.push(`amount should be ₹${expected} for ${line.kilograms} kg at ₹${line.rate}`);
  }

  /*
   * A sanity check on bird weight, not a rule.
   *
   * A live bird is roughly 1-4 kg. Outside that, either the weight or the count has a digit
   * wrong - which is how a purchase of 960 birds came to be recorded for 3,029 kg and 0
   * rupees. It only warns: a genuine load of unusual birds should not be unenterable.
   */
  const birds = num(line.nos);
  const kilograms = num(line.kilograms);
  const perBird = birds > 0 ? kilograms / birds : 0;
  const weightLooksWrong = birds > 0 && kilograms > 0 && (perBird < 0.8 || perBird > 5);

  return {
    position,
    ok: problems.length === 0,
    problems,
    expectedAmount: expected,
    amountDisagrees,
    perBird: Number(perBird.toFixed(3)),
    weightLooksWrong
  };
};

/** Birds, weight, amount and the average rate across every line. */
export const summariseLines = (lines = []) => {
  const birds = lines.reduce((total, line) => total + num(line.nos), 0);
  const kilograms = lines.reduce((total, line) => total + num(line.kilograms), 0);
  // Summed from each line's own recalculated amount, so the total cannot drift from what the
  // server will compute and refuse.
  const amount = lines.reduce(
    (total, line) => total + calculateAmount(line.kilograms, line.rate), 0
  );

  return {
    lines: lines.length,
    birds,
    kilograms: Number(kilograms.toFixed(3)),
    amount,
    // Null rather than zero with no weight: a rate per no kilograms is not a rate of nothing.
    averageRate: kilograms > 0 ? Number((amount / kilograms).toFixed(2)) : null,
    averageWeight: birds > 0 ? Number((kilograms / birds).toFixed(3)) : null
  };
};

/**
 * Everything that has to be true before the form can be submitted.
 *
 * Returns the blocking problems and the non-blocking warnings separately, because they are
 * acted on differently: one disables the button, the other is shown beside the field and
 * lets the operator proceed.
 */
export const validatePurchase = ({ formData, lines, today } = {}) => {
  const blocking = [];
  const warnings = [];

  const missing = [
    ['entryDate', 'date'],
    ['vehicle', 'vehicle'],
    ['driver', 'driver'],
    ['supplier', 'supplier']
  ].filter(([field]) => isBlank(formData?.[field])).map(([, label]) => label);

  if (missing.length > 0) {
    blocking.push(`Choose the ${missing.join(', ')}.`);
  }

  const dateCheck = validatePurchaseDate({ entryDate: formData?.entryDate, today });
  if (dateCheck.blocked && dateCheck.message) {
    blocking.push(dateCheck.message);
  }

  const rows = lines ?? [];
  if (rows.length === 0) {
    blocking.push('Add at least one DC line.');
  }

  const lineChecks = rows.map((line, index) => validateDcLine(line, index + 1));
  lineChecks.filter((check) => !check.ok).forEach((check) => {
    blocking.push(`DC line ${check.position}: ${check.problems.join(', ')}.`);
  });
  lineChecks.filter((check) => check.ok && check.weightLooksWrong).forEach((check) => {
    warnings.push(`DC line ${check.position} averages ${check.perBird} kg a bird, `
      + 'which is outside the usual range. Check the count and the weight.');
  });

  const totals = summariseLines(rows);
  if (totals.amount === 0 && rows.length > 0 && lineChecks.every((check) => check.ok)) {
    // Purchase 7 in the live data is exactly this: 960 birds, 3,029 kg, nothing paid.
    warnings.push('This purchase totals ₹0. Nothing will be owed to the supplier for it.');
  }

  return {
    blocking,
    warnings,
    lineChecks,
    dateCheck,
    totals,
    canSubmit: blocking.length === 0
  };
};

/**
 * The files to post, in the order the server matches them to lines.
 *
 * The server pairs files[i] with dcDetails[i], and the screen used to append every chosen file
 * to one flat list regardless of which row's button was pressed - so a scan attached to line 3
 * arrived as the scan for line 1. Scans are the evidence of what was received; filed against
 * the wrong line they are worse than missing.
 *
 * An empty slot is sent as an empty Blob rather than skipped, so the positions still line up
 * when an earlier line has no scan yet.
 */
export const orderFilesForUpload = (lines = [], filesByLine = {}) => {
  const anyFile = lines.some((line, index) => filesByLine[index]);
  if (!anyFile) {
    return [];
  }
  return lines.map((line, index) => filesByLine[index] ?? null);
};

/** What the confirmation dialog reads out before anything is sent. */
export const buildPurchaseSummary = ({ formData, lines, labels = {} }) => {
  const totals = summariseLines(lines ?? []);
  const expenses = calculateTotalExpenses({
    driverExpense: formData?.driverExpense,
    diesel: formData?.diesel,
    hamali: formData?.hamali
  });

  return {
    date: toDateKey(formData?.entryDate),
    supplier: labels.supplier ?? String(formData?.supplier ?? ''),
    vehicle: labels.vehicle ?? String(formData?.vehicle ?? ''),
    driver: labels.driver ?? String(formData?.driver ?? ''),
    farm: formData?.farm ?? '',
    branch: formData?.branch ?? '',
    ...totals,
    expenses,
    scans: Object.keys(labels.filesByLine ?? {}).length
  };
};

const purchaseValidation = {
  toDateKey,
  validatePurchaseDate,
  validateDcLine,
  summariseLines,
  validatePurchase,
  orderFilesForUpload,
  buildPurchaseSummary
};

export default purchaseValidation;
