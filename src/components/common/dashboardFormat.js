/**
 * Formatting and derived figures for the dashboard.
 *
 * Kept out of the component so the arithmetic that decides what a tile says - a
 * change against yesterday, a share of a total, whether a figure is even
 * comparable - can be tested without rendering anything.
 */

const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** ₹1,25,06,810 - no decimals; a dashboard is read at a glance. */
export const money = (value) => `₹${Math.round(num(value)).toLocaleString('en-IN')}`;

/** ₹152.25 - decimals kept, for rates. */
export const rate = (value) =>
  `₹${num(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * 1.25 Cr / 12.51 L / 45,600 - Indian short scale.
 *
 * Used only where the exact figure is shown elsewhere: a headline tile that reads
 * "₹15,33,68,710" is a string of digits nobody parses, while "₹15.34 Cr" lands.
 */
export const compactMoney = (value) => {
  const amount = num(value);
  const sign = amount < 0 ? '-' : '';
  const magnitude = Math.abs(amount);

  if (magnitude >= 10000000) return `${sign}₹${(magnitude / 10000000).toFixed(2)} Cr`;
  if (magnitude >= 100000) return `${sign}₹${(magnitude / 100000).toFixed(2)} L`;
  if (magnitude >= 1000) return `${sign}₹${Math.round(magnitude).toLocaleString('en-IN')}`;
  return `${sign}₹${Math.round(magnitude)}`;
};

export const count = (value) => Math.round(num(value)).toLocaleString('en-IN');

export const weight = (value) =>
  num(value).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

export const percent = (value) => `${num(value).toFixed(1)}%`;

/** 09 Sep 2026 - the explicit month table avoids en-IN's four-letter "Sept". */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const shortDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

/**
 * Change from one figure to another.
 *
 * A change from zero has no percentage - dividing by it gives Infinity, and "up
 * 100%" from nothing is not what happened - so direction is reported without one.
 *
 * @returns {{direction: 'up'|'down'|'flat', percent: number|null, delta: number}}
 */
export const change = (current, previous) => {
  const now = num(current);
  const before = num(previous);
  const delta = now - before;

  if (delta === 0) return { direction: 'flat', percent: 0, delta: 0 };
  if (before === 0) return { direction: delta > 0 ? 'up' : 'down', percent: null, delta };

  return {
    direction: delta > 0 ? 'up' : 'down',
    percent: Math.abs((delta / Math.abs(before)) * 100),
    delta
  };
};

/** "+12.4% vs previous day", or "no figure to compare" when the base was zero. */
export const describeChange = (result, againstLabel) => {
  if (result.direction === 'flat') return `No change vs ${againstLabel}`;
  const arrow = result.direction === 'up' ? '+' : '-';
  if (result.percent === null) return `${result.direction === 'up' ? 'Up from' : 'Down from'} nothing ${againstLabel}`;
  return `${arrow}${result.percent.toFixed(1)}% vs ${againstLabel}`;
};

/**
 * Totals for the day-by-day table, including the bird tally.
 *
 * Days with no trading stay in the series so the gap is visible, but they are
 * excluded from the average - an average that divides by calendar days rather
 * than trading days understates every working day.
 *
 * The tally total is the sum of the daily differences, and it is deliberately a
 * signed sum rather than a sum of absolute values: a day short 20 birds and a day
 * over 20 birds is very likely one trip entered against the wrong date, which a
 * signed total shows as zero and an absolute total would report as 40 birds lost.
 * daysNotTallying is what says how many days are actually wrong.
 */
export const summariseTrend = (points) => {
  const series = Array.isArray(points) ? points : [];
  const traded = series.filter((point) => point.traded);

  const amounts = series.map((point) => num(point.amount));
  const receipts = series.map((point) => num(point.received));
  const peak = Math.max(0, ...amounts, ...receipts);

  const total = amounts.reduce((sum, value) => sum + value, 0);
  const collected = receipts.reduce((sum, value) => sum + value, 0);

  const best = traded.reduce(
    (highest, point) => (num(point.amount) > num(highest?.amount) ? point : highest),
    traded[0] || null
  );

  const sum = (key) => series.reduce((running, point) => running + num(point[key]), 0);
  // Only days that have a trip record can tally at all; a day of sale rows with no
  // trip has nothing to check against and is not counted as a mismatch.
  const daysWithTrips = series.filter((point) => num(point.birdsLoaded) > 0 || num(point.tripCount) > 0);

  return {
    peak,
    total,
    collected,
    tradingDays: traded.length,
    calendarDays: series.length,
    averagePerTradingDay: traded.length ? total / traded.length : 0,
    best,
    tally: {
      tripCount: sum('tripCount'),
      birdsLoaded: sum('birdsLoaded'),
      birdsSold: sum('birdsSold'),
      mortality: sum('mortality'),
      returnToFarm: sum('returnToFarm'),
      weight: sum('weight'),
      total: sum('birdTally'),
      daysWithTrips: daysWithTrips.length,
      daysNotTallying: daysWithTrips.filter((point) => !point.tallies).length
    }
  };
};

/**
 * Whether "pending" for a window went negative, and what that means.
 *
 * Pending is billed minus collected inside the window, so collecting last month's
 * dues this month drives it below zero. That is not an error and not a credit
 * balance - it is recovery of older debt, and the tile has to say so rather than
 * showing a red minus figure.
 */
export const describePending = (pending, amount, received) => {
  const outstanding = num(pending);
  if (outstanding > 0) {
    return { tone: 'error', headline: money(outstanding), note: 'Billed but not yet collected' };
  }
  if (outstanding === 0 && num(amount) === 0) {
    return { tone: 'default', headline: money(0), note: 'Nothing billed' };
  }
  if (outstanding === 0) {
    return { tone: 'success', headline: money(0), note: 'Everything billed was collected' };
  }
  return {
    tone: 'success',
    headline: money(Math.abs(outstanding)),
    note: `Collected beyond billing - older dues recovered (${percent(
      num(amount) === 0 ? 0 : (num(received) / num(amount)) * 100
    )} of billed)`
  };
};

const dashboardFormat = { money, compactMoney, rate, count, weight, percent, shortDate, change };

export default dashboardFormat;
