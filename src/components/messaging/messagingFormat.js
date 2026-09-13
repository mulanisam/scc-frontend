/**
 * How message state is described on screen.
 *
 * Kept out of the components because the same vocabulary appears in three places -
 * the tiles, the status filter and the table - and a status that read "Sent" in one
 * and "Accepted" in another would look like two different things.
 */

/**
 * The distinction that matters: SENT is not DELIVERED.
 *
 * Fast2SMS returns success when it accepts a message, which says nothing about it
 * reaching a handset. A screen that coloured "accepted" green would tell somebody
 * their customer had been informed when the message may have bounced - so SENT is
 * amber and stays amber until a delivery report arrives.
 */
export const STATUS_META = {
  PENDING: {
    label: 'Queued',
    color: 'default',
    help: 'Waiting for the dispatcher. It runs every two minutes.',
  },
  SENT: {
    label: 'Accepted',
    color: 'warning',
    help: 'Fast2SMS took the message. Not yet confirmed to have arrived.',
  },
  DELIVERED: {
    label: 'Delivered',
    color: 'success',
    help: 'The provider reports it reached the handset.',
  },
  READ: {
    label: 'Read',
    color: 'success',
    help: 'The customer opened it. WhatsApp only, and only with read receipts on.',
  },
  FAILED: {
    label: 'Failed',
    color: 'error',
    help: 'Rejected by the provider, or reported undelivered.',
  },
  SKIPPED: {
    label: 'Skipped',
    color: 'default',
    help: 'Never attempted: no usable number, or the customer has not opted in.',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'default',
    help: 'Withdrawn before it was sent.',
  },
};

export const statusLabel = (status) => STATUS_META[status]?.label || status || '—';
export const statusColor = (status) => STATUS_META[status]?.color || 'default';

/** The order the filter offers, worst first - failures are what needs the attention. */
export const STATUS_FILTERS = ['ALL', 'FAILED', 'PENDING', 'SENT', 'DELIVERED', 'READ', 'SKIPPED'];

export const MESSAGE_TYPE_LABEL = {
  DAILY_SALE_SUMMARY: 'Daily sale',
  WEEKLY_STATEMENT: 'Statement',
  PAYMENT_RECEIPT: 'Receipt',
  TRIP_SUMMARY: 'Trip summary',
  OWNER_DIGEST: 'Owner digest',
};

export const typeLabel = (type) => MESSAGE_TYPE_LABEL[type] || type || '—';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Date and time, because "did it go out before the driver left" is a real question. */
export const stamp = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${time}`;
};

export const dayOnly = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]}`;
};

/**
 * Parses yyyy-MM-dd as a local date.
 *
 * `new Date('2026-09-06')` is parsed as UTC midnight, which in a negative offset lands on
 * the 5th - so a statement for the week ending Sunday would be labelled Saturday. The
 * business is in IST and would not see it, but the bug is one character of timezone away
 * and costs nothing to avoid.
 */
export const parseLocalDate = (value) => {
  if (!value) return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!parts) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
};

/** "31 Aug – 6 Sep", the period a statement covers. */
export const weekLabel = (from, to) => {
  const start = parseLocalDate(from);
  const end = parseLocalDate(to);
  if (!end) return '—';
  const endText = `${end.getDate()} ${MONTHS[end.getMonth()]}`;
  if (!start) return endText;
  const startText = start.getMonth() === end.getMonth()
    ? String(start.getDate())
    : `${start.getDate()} ${MONTHS[start.getMonth()]}`;
  return `${startText} – ${endText}`;
};

/**
 * The statement status bar, as proportional segments.
 *
 * Read is folded into delivered: a customer who opened the statement certainly received
 * it, and two adjacent green segments would invite the reader to add them up to find out
 * how many arrived. Zero-count segments are dropped so the bar carries no empty slivers,
 * and every segment keeps its exact count for the legend - the bar shows the shape, the
 * numbers are what somebody acts on.
 */
export const statementSegments = (run) => {
  if (!run) return [];
  const total = run.total || 0;
  if (total === 0) return [];

  return [
    { key: 'delivered', label: 'Delivered', count: (run.delivered || 0) + (run.read || 0), color: 'success.main' },
    { key: 'sent', label: 'Accepted', count: run.sent || 0, color: 'warning.main' },
    { key: 'queued', label: 'Queued', count: run.queued || 0, color: 'info.light' },
    { key: 'failed', label: 'Failed', count: run.failed || 0, color: 'error.main' },
    { key: 'skipped', label: 'Not sent', count: (run.skipped || 0) + (run.cancelled || 0), color: 'grey.400' },
  ]
    .filter((segment) => segment.count > 0)
    .map((segment) => ({ ...segment, percent: (segment.count * 100) / total }));
};

/**
 * One sentence for the run, in the order somebody needs to hear it.
 *
 * Failures first when there are any, because that is the only part with an action
 * attached. A run that was entirely skipped says so rather than reporting "0 delivered",
 * which reads as a delivery problem when the cause is that nobody has opted in.
 */
export const runHeadline = (run) => {
  if (!run || !run.total) return 'No statements have been built for this week.';

  const arrived = (run.delivered || 0) + (run.read || 0);
  const parts = [];

  if (run.failed) parts.push(`${run.failed} failed`);
  if (arrived) parts.push(`${arrived} delivered`);
  if (run.sent) parts.push(`${run.sent} awaiting confirmation`);
  if (run.queued) parts.push(`${run.queued} still queued`);
  if (run.skipped) parts.push(`${run.skipped} not sendable`);

  if (parts.length === 0) return `${run.total} statements built.`;
  return `${run.total} statements: ${parts.join(', ')}.`;
};

/** Red while anything failed, amber while anything is unfinished, green once done. */
export const runTone = (run) => {
  if (!run || !run.total) return 'default';
  if (run.failed > 0) return 'error';
  if (run.queued > 0 || run.sent > 0) return 'warning';
  if ((run.delivered || 0) + (run.read || 0) > 0) return 'success';
  return 'default';
};

export const money = (value) => `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;

export const compactMoney = (value) => {
  const amount = Math.abs(Number(value) || 0);
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return money(amount);
};

/** 98765 43210, the way a number is read back over the phone. */
export const prettyMobile = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : String(value || '—');
};

/**
 * Substitutes {{1}}, {{2}} ... into an approved template body.
 *
 * The same substitution the server does, so the custom-send form can show what the
 * customer will read before it is sent. A placeholder with no value yet is left
 * visible rather than blanked, so a half-filled form looks half-filled.
 */
export const renderTemplate = (bodyText, values = []) => {
  if (!bodyText) return '';
  return bodyText.replace(/\{\{\s*(\d+)\s*\}\}/g, (match, index) => {
    const value = values[Number(index) - 1];
    return value === undefined || value === null || value === '' ? match : String(value);
  });
};

/** How many variables a template body takes, read from its highest placeholder. */
export const placeholderCount = (bodyText) => {
  if (!bodyText) return 0;
  let highest = 0;
  const pattern = /\{\{\s*(\d+)\s*\}\}/g;
  let match = pattern.exec(bodyText);
  while (match) {
    highest = Math.max(highest, Number(match[1]));
    match = pattern.exec(bodyText);
  }
  return highest;
};

/**
 * Field labels for every template on the account.
 *
 * A generic "Variable 5" would be no help at all when variable 5 is the rate per kilo:
 * typing the balance there sends a customer a price of three lakh rupees. The labels
 * are read off each approved body, which is why they are per template name rather than
 * a single shared list - "variable 3" is an amount received in one template and an
 * outstanding balance in another.
 *
 * Templates not listed fall back to numbered fields, with the live preview to check
 * against, so a newly approved template is usable the moment it appears.
 */
const NAME_FIELD = { label: 'Customer name', hint: 'As the customer expects to be addressed' };
const DATE_FIELD = { label: 'Date', hint: 'dd-MM-yyyy' };

export const TEMPLATE_FIELD_LABELS = {
  /** 8 variables. The rate is in this one; daily_sale_no_rate is what we send. */
  daily_sale_summary: [
    NAME_FIELD,
    DATE_FIELD,
    { label: 'Birds', hint: 'Count sold' },
    { label: 'Weight (kg)', hint: 'Net weight' },
    { label: 'Rate per kg', hint: 'Amount ÷ weight' },
    { label: 'Amount', hint: 'Billed for the day, plain digits' },
    { label: 'Paid', hint: 'Received today, 0 if nothing' },
    { label: 'Total balance', hint: 'Outstanding after this transaction' },
  ],
  /** 7 variables. The daily message as customers actually receive it. */
  daily_sale_no_rate: [
    NAME_FIELD,
    DATE_FIELD,
    { label: 'Birds', hint: 'Count sold' },
    { label: 'Weight (kg)', hint: 'Net weight' },
    { label: 'Amount', hint: 'Billed for the day, plain digits' },
    { label: 'Paid', hint: 'Received today, 0 if nothing' },
    { label: 'Total balance', hint: 'Outstanding after this transaction' },
  ],
  /** 3 variables: a payment acknowledgement. */
  pay_received: [
    NAME_FIELD,
    DATE_FIELD,
    { label: 'Amount received', hint: 'Plain digits, no comma' },
  ],
  /** 3 variables: the balance chase. */
  pending_balance: [
    NAME_FIELD,
    DATE_FIELD,
    { label: 'Outstanding balance', hint: 'Plain digits, no comma' },
  ],
  /** 1 variable, and no name in the body - it opens "Dear user". */
  payment_completed: [
    { label: 'Amount', hint: 'Plain digits. This template does not carry a name.' },
  ],
};

/**
 * What each template is for, in the words somebody picking one would use.
 *
 * Shown beside the picker because the template names are the provider's, not anybody's
 * idea of a description: "pending_balance" and "pay_received" are easy to confuse when
 * both take a name, a date and a rupee figure, and sending the wrong one tells a
 * customer who just paid that they still owe the money.
 */
export const TEMPLATE_PURPOSE = {
  daily_sale_no_rate: "The day's transaction: birds, weight, amount, paid, balance.",
  daily_sale_summary: "The day's transaction including the per-kilo rate.",
  pay_received: 'Confirms a payment was received.',
  pending_balance: 'Tells a customer what is still outstanding.',
  payment_completed: 'A bare payment confirmation, with no name or date.',
};

export const fieldsForTemplate = (template) => {
  const count = template?.varCount || placeholderCount(template?.bodyText);
  const known = TEMPLATE_FIELD_LABELS[template?.templateName];
  return Array.from({ length: count }, (unused, index) => known?.[index]
    || { label: `Variable ${index + 1}`, hint: '' });
};
