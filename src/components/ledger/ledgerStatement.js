/**
 * Customer account statement: one model, two renderings.
 *
 * The screen and the PDF previously each decided for themselves what a row said,
 * how a balance was labelled and what the totals were - the PDF summed its own
 * debits and credits, and neither showed the balance brought forward, so a
 * date-filtered statement opened mid-stream on a balance nothing explained.
 *
 * buildStatementModel turns the server payload into the rows and figures both
 * renderings display; ledgerStatementPdf prints that same model. Nothing here
 * touches jsPDF or the DOM, so the model stays testable on its own.
 */

const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** 12,34,567.00 - Indian grouping, always two decimals, no currency symbol. */
export const formatMoney = (value) =>
  num(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Money with its Dr/Cr side, the way a statement states a balance. */
export const formatBalance = (value) => {
  const amount = num(value);
  if (amount === 0) return `${formatMoney(0)}    `;
  return `${formatMoney(Math.abs(amount))} ${amount > 0 ? 'Dr' : 'Cr'}`;
};

export const formatWeight = (value) =>
  num(value) === 0 ? '' : num(value).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export const formatRate = (value) =>
  num(value) === 0 ? '' : num(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatCount = (value) => (num(value) === 0 ? '' : num(value).toLocaleString('en-IN'));

/**
 * 09 Sep 2026 - fixed width, so a column of dates lines up.
 *
 * The months are spelled out here rather than taken from toLocaleDateString,
 * whose en-IN short form gives "Sept" for September - eleven characters for every
 * month and twelve for one is exactly the misalignment this column has to avoid.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatStatementDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, '0');
  return `${day} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

/**
 * How each transaction type reads on a statement.
 *
 * The raw enum name is what the old PDF printed in a "Type" column. A statement
 * names the document instead, in the Particulars column where a reader looks for
 * it, and keeps the type only as a short tag for colour on screen.
 */
const PARTICULARS = {
  OPENING_BALANCE: { label: 'Opening balance', voucher: 'O/B' },
  SALE: { label: 'Sale', voucher: 'INV' },
  PAYMENT: { label: 'Payment received', voucher: 'RCPT' },
  CREDIT_NOTE: { label: 'Credit note', voucher: 'CN' },
  DEBIT_NOTE: { label: 'Debit note', voucher: 'DN' }
};

const particularsFor = (entry) => {
  const known = PARTICULARS[entry.transactionType];
  const base = known ? known.label : String(entry.transactionType || 'Entry').replace(/_/g, ' ');

  if (entry.transactionType === 'SALE') {
    // Route and driver say which trip the birds came on - the two things the
    // customer asks about when they query a line.
    const trip = [entry.routeName, entry.driverName].filter(Boolean).join(' / ');
    return trip ? `${base} - ${trip}` : base;
  }

  if (entry.transactionType === 'PAYMENT') {
    return entry.paymentMode ? `${base} (${entry.paymentMode})` : base;
  }

  // Adjustments carry their reason in the description and nowhere else.
  return entry.description ? `${base} - ${entry.description}` : base;
};

/** INV-1042 - the voucher reference a query can be traced by. */
const voucherFor = (entry) => {
  const known = PARTICULARS[entry.transactionType];
  const prefix = known ? known.voucher : 'TXN';
  return entry.referenceId ? `${prefix}-${entry.referenceId}` : prefix;
};

/**
 * The statement's columns, in the order a reader scans them: what happened, then
 * what it was made of, then what it did to the balance.
 *
 * Widths are millimetres and add up to 188, the printable width of A4 portrait at
 * a 11 mm margin - fixed rather than auto-sized so that every page of a long
 * statement, and every statement in a stack of them, has its columns in the same
 * place. They are ignored on screen.
 */
export const STATEMENT_COLUMNS = [
  { key: 'date', label: 'Date', width: 19 },
  { key: 'particulars', label: 'Particulars', width: 45 },
  { key: 'voucher', label: 'Voucher', width: 15 },
  { key: 'birds', label: 'Birds', width: 11, numeric: true },
  { key: 'weight', label: 'Weight (kg)', width: 18, numeric: true },
  { key: 'rate', label: 'Rate/kg', width: 13, numeric: true },
  { key: 'debit', label: 'Debit (Rs.)', width: 21, numeric: true },
  { key: 'credit', label: 'Credit (Rs.)', width: 21, numeric: true },
  { key: 'balance', label: 'Balance (Rs.)', width: 25, numeric: true }
];

/**
 * @param {Object} statement Server payload from /user/ledger/customer/{id}/statement
 * @returns {{ rows: Array, totals: Object, customer: Object, period: Object }}
 */
export const buildStatementModel = (statement) => {
  const entries = Array.isArray(statement?.entries) ? statement.entries : [];
  const opening = num(statement?.openingBalance);

  const rows = entries.map((entry) => ({
    id: entry.id,
    kind: 'transaction',
    transactionType: entry.transactionType,
    // The server names this isBackdated; older builds sent backdated.
    backdated: Boolean(entry.isBackdated ?? entry.backdated),
    obsolete: Boolean(entry.obsolete),
    date: entry.transactionDate,
    particulars: particularsFor(entry),
    voucher: voucherFor(entry),
    description: entry.description || '',
    paymentMode: entry.paymentMode || '',
    birds: entry.birds == null ? 0 : num(entry.birds),
    weight: num(entry.weight),
    rate: num(entry.rate),
    debit: num(entry.debitAmount),
    credit: num(entry.creditAmount),
    balance: num(entry.runningBalance)
  }));

  // A statement always states where the balance came from, even when the answer
  // is zero - an unexplained opening figure is the thing customers dispute.
  const openingRow = {
    id: 'opening',
    kind: 'opening',
    date: statement?.startDate || (rows.length ? rows[0].date : null),
    particulars: statement?.startDate ? 'Balance brought forward' : 'Opening balance',
    voucher: '',
    birds: 0,
    weight: 0,
    rate: 0,
    debit: 0,
    credit: 0,
    balance: opening
  };

  // "When did they last pay, and how much" is the first question asked of a
  // statement with a balance on it, and it was nowhere on the old page.
  const lastPayment = [...rows].reverse().find((row) => row.credit > 0) || null;
  const lastSale = [...rows].reverse().find((row) => row.transactionType === 'SALE') || null;

  // Most collection in this business is taken on the spot and recorded on the
  // sale row itself, not as a separate payment voucher - so a customer can have
  // lakhs in credits and a payment-voucher count of zero. Counting the collection
  // that arrived with a sale keeps the summary from reading as "never paid".
  const salesWithCollection = rows.filter((row) => row.transactionType === 'SALE' && row.credit > 0);
  const collectedWithSales = salesWithCollection.reduce((sum, row) => sum + row.credit, 0);

  const totals = statement?.totals || {};
  return {
    lastPayment: lastPayment && { date: lastPayment.date, amount: lastPayment.credit, mode: lastPayment.paymentMode },
    lastSale: lastSale && { date: lastSale.date, amount: lastSale.debit },
    customer: {
      id: statement?.customerId,
      name: statement?.customerName || '',
      shopName: statement?.shopName || '',
      mobileNo: statement?.mobileNo || '',
      address: statement?.address || '',
      cityName: statement?.cityName || '',
      obsolete: Boolean(statement?.obsolete),
      creditLimit: statement?.creditLimitEnabled ? num(statement?.creditLimit) : null
    },
    period: {
      startDate: statement?.startDate || null,
      endDate: statement?.endDate || null,
      firstTransactionDate: statement?.firstTransactionDate || null,
      lastTransactionDate: statement?.lastTransactionDate || null,
      generatedAt: statement?.generatedAt || null
    },
    openingRow,
    // Shown only for a date-filtered statement; over the whole history the
    // opening balance is zero by definition and the row would be noise.
    showOpeningRow: Boolean(statement?.startDate),
    rows,
    totals: {
      rowCount: num(totals.rowCount),
      saleCount: num(totals.saleCount),
      paymentCount: num(totals.paymentCount),
      adjustmentCount: num(totals.adjustmentCount),
      openingBalance: opening,
      totalDebit: num(totals.totalDebit),
      totalCredit: num(totals.totalCredit),
      netMovement: num(totals.netMovement),
      closingBalance: num(totals.closingBalance),
      birds: num(totals.birds),
      weight: num(totals.weight),
      averageRate: num(totals.averageRate),
      salesWithCollectionCount: salesWithCollection.length,
      collectedWithSales
    }
  };
};

/** The period as one line of prose for a heading. */
export const describePeriod = (period) => {
  if (period.startDate && period.endDate) {
    return `${formatStatementDate(period.startDate)}  to  ${formatStatementDate(period.endDate)}`;
  }
  if (period.firstTransactionDate && period.lastTransactionDate) {
    return `All transactions  (${formatStatementDate(period.firstTransactionDate)}`
      + `  to  ${formatStatementDate(period.lastTransactionDate)})`;
  }
  return 'All transactions';
};

export default buildStatementModel;
