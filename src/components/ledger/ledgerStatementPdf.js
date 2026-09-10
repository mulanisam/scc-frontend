import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getCompanyConfig } from '../../config/companyConfig';
import {
  STATEMENT_COLUMNS,
  describePeriod,
  formatBalance,
  formatCount,
  formatMoney,
  formatRate,
  formatStatementDate,
  formatWeight
} from './ledgerStatement';

/**
 * Renders a customer statement of account as a PDF.
 *
 * What this replaces: a page that centred the company name, printed the raw enum
 * ("OPENING_BALANCE") in a Type column, put the description in a 35 mm column
 * that wrapped to three lines, declared `align` instead of `halign` on the money
 * columns - so nothing was actually right-aligned - and totalled its own debits
 * and credits separately from the ones on screen. It also had no balance brought
 * forward, so a date-filtered ledger opened on a running balance nothing on the
 * page explained.
 *
 * The layout here is the one a customer already knows from a bank or supplier
 * statement: identity and period at the top, the position in four figures, then
 * one line per transaction in date order with the balance after each, carried
 * across page breaks, and a reconciliation at the foot that adds up on the page.
 *
 * A note on the rupee sign: jsPDF's built-in Helvetica is WinAnsi-encoded and has
 * no glyph for U+20B9, so "Rs." is used in headings and labels and the money
 * columns carry bare numbers. Printing the symbol would silently drop or mangle
 * it, which is how the previous version rendered it.
 */

// A4 portrait in millimetres.
const PAGE = { width: 210, height: 297, margin: 11 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

// One navy for structure, one grey for rules and secondary text, and a red and a
// green used only where a figure's side has to read at a glance.
const INK = {
  navy: [31, 58, 95],
  navySoft: [232, 237, 244],
  text: [26, 26, 26],
  muted: [110, 118, 128],
  rule: [190, 197, 205],
  zebra: [248, 249, 251],
  debit: [176, 42, 42],
  credit: [27, 106, 58]
};

const setColor = (doc, rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);

/** Text jsPDF can actually draw: strip control characters and the rupee sign. */
const safe = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/₹/g, 'Rs.')
    .split('')
    .filter((ch) => ch.codePointAt(0) >= 32 && ch.codePointAt(0) !== 127)
    .join('');
};

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const twoDigits = (value) => (value < 20 ? ONES[value] : `${TENS[Math.floor(value / 10)]}${value % 10 ? ` ${ONES[value % 10]}` : ''}`);

/**
 * Amount in words, grouped the Indian way. A statement states the amount payable
 * in words as well as figures, which is what makes a disputed figure settleable.
 */
export const amountInWords = (value) => {
  const amount = Math.abs(Math.round(Number(value) * 100) / 100);
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  if (rupees === 0 && paise === 0) return 'Rupees Nil';

  const groups = [
    { size: 10000000, name: 'Crore' },
    { size: 100000, name: 'Lakh' },
    { size: 1000, name: 'Thousand' },
    { size: 100, name: 'Hundred' }
  ];

  let remaining = rupees;
  const parts = [];
  groups.forEach(({ size, name }) => {
    const count = Math.floor(remaining / size);
    if (count > 0) {
      parts.push(`${twoDigits(count)} ${name}`);
      remaining -= count * size;
    }
  });
  if (remaining > 0) parts.push(twoDigits(remaining));

  const words = [`Rupees ${parts.join(' ')}`.trim()];
  if (paise > 0) words.push(`and ${twoDigits(paise)} Paise`);
  return `${words.join(' ')} only`;
};

/** Company block and statement title. Returns the y to continue from. */
const drawMasthead = (doc, company) => {
  const { margin } = PAGE;
  const right = PAGE.width - margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  setColor(doc, INK.navy);
  doc.text(safe(company.name), margin, margin + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setColor(doc, INK.muted);
  doc.text(safe(company.address), margin, margin + 11.5);
  doc.text(safe(`Phone ${company.contactNumber}   |   ${company.email}`), margin, margin + 16);

  // The title sits opposite the company name, where a reader looks to find out
  // what the document is before reading any of it.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  setColor(doc, INK.navy);
  doc.text('STATEMENT OF ACCOUNT', right, margin + 6, { align: 'right' });

  doc.setDrawColor(INK.navy[0], INK.navy[1], INK.navy[2]);
  doc.setLineWidth(0.7);
  doc.line(margin, margin + 19.5, right, margin + 19.5);

  return margin + 19.5;
};

/**
 * Customer identity on the left, statement metadata on the right, as two aligned
 * label/value stacks rather than the previous free-floating lines.
 */
const drawPartyBlock = (doc, model, y) => {
  const { margin } = PAGE;
  const right = PAGE.width - margin;
  const midpoint = margin + CONTENT_WIDTH * 0.56;
  const { customer, period } = model;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setColor(doc, INK.muted);
  doc.text('STATEMENT FOR', margin, y + 6);
  doc.text('STATEMENT DETAILS', midpoint, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setColor(doc, INK.text);
  doc.text(safe(customer.name), margin, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor(doc, INK.muted);
  let leftY = y + 17;
  [
    customer.shopName,
    [customer.address, customer.cityName].filter(Boolean).join(', '),
    customer.mobileNo ? `Mobile ${customer.mobileNo}` : ''
  ].filter(Boolean).forEach((line) => {
    doc.text(safe(line), margin, leftY);
    leftY += 4.6;
  });

  // Right stack: label at the midpoint, value flush to the right margin, so the
  // values form their own column instead of trailing off after the labels.
  const details = [
    ['Account no.', `CUS-${customer.id ?? '-'}`],
    ['Statement period', describePeriod(period)],
    ['Transactions', `${model.totals.rowCount}`],
    ['Generated on', new Date(period.generatedAt || Date.now()).toLocaleString('en-IN')]
  ];
  if (model.lastPayment) {
    details.push([
      'Last payment received',
      `${formatStatementDate(model.lastPayment.date)}  -  Rs. ${formatMoney(model.lastPayment.amount)}`
    ]);
  }
  if (customer.creditLimit !== null) {
    details.push(['Credit limit', `Rs. ${formatMoney(customer.creditLimit)}`]);
  }
  if (customer.obsolete) {
    details.push(['Account status', 'Inactive']);
  }

  let rightY = y + 12;
  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setColor(doc, INK.muted);
    doc.text(safe(`${label}`), midpoint, rightY);
    doc.setFont('helvetica', 'bold');
    setColor(doc, INK.text);
    doc.text(safe(value), right, rightY, { align: 'right' });
    rightY += 4.8;
  });

  return Math.max(leftY, rightY) + 1;
};

/**
 * The position in four figures, before any transaction is read: what was owed at
 * the start, what was billed, what was received, what is owed now.
 */
const drawPositionStrip = (doc, model, y) => {
  const { margin } = PAGE;
  const totals = model.totals;
  const boxes = [
    { label: 'Opening balance', value: formatBalance(totals.openingBalance) },
    { label: 'Billed in period (Dr)', value: formatMoney(totals.totalDebit) },
    { label: 'Received in period (Cr)', value: formatMoney(totals.totalCredit) },
    { label: 'Closing balance', value: formatBalance(totals.closingBalance), emphasis: true }
  ];

  const gap = 3;
  const boxWidth = (CONTENT_WIDTH - gap * (boxes.length - 1)) / boxes.length;
  const boxHeight = 16;

  boxes.forEach((box, index) => {
    const x = margin + index * (boxWidth + gap);
    if (box.emphasis) {
      doc.setFillColor(INK.navy[0], INK.navy[1], INK.navy[2]);
    } else {
      doc.setFillColor(INK.navySoft[0], INK.navySoft[1], INK.navySoft[2]);
    }
    doc.rect(x, y, boxWidth, boxHeight, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    setColor(doc, box.emphasis ? [235, 240, 247] : INK.muted);
    doc.text(safe(box.label.toUpperCase()), x + 2.5, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor(doc, box.emphasis ? [255, 255, 255] : INK.text);
    doc.text(safe(box.value), x + boxWidth - 2.5, y + 12.5, { align: 'right' });
  });

  return y + boxHeight + 4;
};

/** One transaction as its nine cells. */
const bodyRow = (row) => [
  formatStatementDate(row.date),
  safe(row.particulars) + (row.backdated ? '  [back-dated]' : '') + (row.obsolete ? '  [corrected]' : ''),
  safe(row.voucher),
  formatCount(row.birds),
  formatWeight(row.weight),
  formatRate(row.rate),
  row.debit > 0 ? formatMoney(row.debit) : '',
  row.credit > 0 ? formatMoney(row.credit) : '',
  formatBalance(row.balance)
];

/**
 * The transaction table, plus the two things that make a multi-page statement
 * readable: the balance brought forward at the top of each continuation page and
 * the balance carried forward at the foot of each page that is not the last.
 */
const drawTransactions = (doc, model, startY) => {
  const columns = STATEMENT_COLUMNS;
  const body = [];

  if (model.showOpeningRow) {
    body.push(bodyRow(model.openingRow));
  }
  model.rows.forEach((row) => body.push(bodyRow(row)));

  const openingRowIndex = model.showOpeningRow ? 0 : -1;
  const closingRowIndex = body.length;

  // Period totals as the table's own last row, so debits and credits are read in
  // the columns they belong to rather than restated in prose underneath.
  body.push([
    '',
    'Total for the period',
    '',
    formatCount(model.totals.birds),
    formatWeight(model.totals.weight),
    model.totals.averageRate ? formatRate(model.totals.averageRate) : '',
    formatMoney(model.totals.totalDebit),
    formatMoney(model.totals.totalCredit),
    formatBalance(model.totals.closingBalance)
  ]);

  // Recorded per page while the table is drawn, then used afterwards - once the
  // page count is known - to place the carry-forward lines.
  const pageState = new Map();
  let currentPageLastBalance = model.showOpeningRow ? model.openingRow.balance : null;

  autoTable(doc, {
    head: [columns.map((column) => column.label)],
    body,
    startY,
    theme: 'plain',
    // Reserves room on continuation pages for the repeated masthead and the
    // brought-forward line drawn in didDrawPage.
    margin: { top: 32, left: PAGE.margin, right: PAGE.margin, bottom: 22 },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 1.7, bottom: 1.7, left: 2, right: 2 },
      textColor: INK.text,
      lineColor: INK.rule,
      lineWidth: 0,
      overflow: 'linebreak',
      valign: 'middle'
    },
    headStyles: {
      fillColor: INK.navy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.8,
      cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 }
    },
    bodyStyles: { lineWidth: { bottom: 0.1 } },
    alternateRowStyles: { fillColor: INK.zebra },
    columnStyles: columns.reduce((styles, column, index) => {
      styles[index] = { cellWidth: column.width, halign: column.numeric ? 'right' : 'left' };
      return styles;
    }, {}),

    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const index = data.row.index;

      if (index === closingRowIndex) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = INK.navySoft;
        data.cell.styles.textColor = INK.navy;
        data.cell.styles.lineWidth = { top: 0.4, bottom: 0.4 };
        data.cell.styles.lineColor = INK.navy;
        return;
      }

      if (index === openingRowIndex) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 244, 248];
        return;
      }

      const row = model.rows[index - (model.showOpeningRow ? 1 : 0)];
      if (!row) return;

      // Debits and credits keep their sides' colour; the balance follows whether
      // the account is in debit or credit. Everything else stays black so the
      // page does not turn into a colour chart.
      if (data.column.index === 6 && row.debit > 0) data.cell.styles.textColor = INK.debit;
      if (data.column.index === 7 && row.credit > 0) data.cell.styles.textColor = INK.credit;
      if (data.column.index === 8) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = row.balance > 0 ? INK.debit : row.balance < 0 ? INK.credit : INK.text;
      }
      if (row.obsolete) {
        data.cell.styles.textColor = INK.muted;
        data.cell.styles.fontStyle = 'italic';
      }
    },

    willDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 0) return;
      const row = model.rows[data.row.index - (model.showOpeningRow ? 1 : 0)];
      if (row) currentPageLastBalance = row.balance;
    },

    didDrawPage: (data) => {
      // Fired once per page, after that page's rows are drawn and while it is
      // still the current page - so the balance recorded here is the one the page
      // ends on, which the next page opens with.
      const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
      pageState.set(pageNumber, { bottom: data.cursor.y, carriedForward: currentPageLastBalance });

      if (pageNumber === 1) return;

      // Continuation pages get a compact masthead so a loose sheet still says
      // whose account it is, then the balance the page opens on.
      const company = getCompanyConfig();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      setColor(doc, INK.navy);
      doc.text(safe(company.name), PAGE.margin, PAGE.margin + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setColor(doc, INK.muted);
      doc.text(
        safe(`Statement of account - ${model.customer.name}${model.customer.shopName ? `, ${model.customer.shopName}` : ''}`),
        PAGE.margin,
        PAGE.margin + 9
      );
      doc.text(safe(describePeriod(model.period)), PAGE.width - PAGE.margin, PAGE.margin + 9, { align: 'right' });

      const previous = pageState.get(pageNumber - 1);
      if (previous) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        setColor(doc, INK.text);
        doc.text('Balance brought forward', PAGE.margin, PAGE.margin + 17.5);
        doc.text(formatBalance(previous.carriedForward), PAGE.width - PAGE.margin, PAGE.margin + 17.5, { align: 'right' });
        doc.setDrawColor(INK.rule[0], INK.rule[1], INK.rule[2]);
        doc.setLineWidth(0.2);
        doc.line(PAGE.margin, PAGE.margin + 19.5, PAGE.width - PAGE.margin, PAGE.margin + 19.5);
      }
    }
  });

  // Carried-forward line at the foot of every page but the last, drawn now that
  // the page count is known.
  const pageCount = doc.internal.getNumberOfPages();
  pageState.forEach((state, pageNumber) => {
    if (pageNumber >= pageCount) return;
    doc.setPage(pageNumber);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setColor(doc, INK.text);
    doc.text('Balance carried forward', PAGE.margin, state.bottom + 5);
    doc.text(formatBalance(state.carriedForward), PAGE.width - PAGE.margin, state.bottom + 5, { align: 'right' });
  });
  doc.setPage(pageCount);

  return doc.lastAutoTable.finalY;
};

/**
 * Reconciliation and quantity summary side by side, then the amount payable in
 * words. The reconciliation is arithmetic the reader can follow down the page:
 * opening, plus billed, less received, equals closing.
 */
const drawClosing = (doc, model, y) => {
  const { margin } = PAGE;
  const right = PAGE.width - margin;
  const totals = model.totals;
  const blockWidth = (CONTENT_WIDTH - 6) / 2;
  const rightX = margin + blockWidth + 6;

  // A new page rather than a summary split across the break.
  let top = y + 8;
  if (top + 62 > PAGE.height - 20) {
    doc.addPage();
    top = margin + 8;
  }

  const heading = (text, x) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setColor(doc, INK.muted);
    doc.text(text, x, top);
  };
  heading('WHAT WAS TRADED', margin);
  heading('HOW THE BALANCE MOVED', rightX);

  const lines = [
    ['Sale transactions', formatCount(totals.saleCount) || '0'],
    ['Birds supplied', formatCount(totals.birds) || '0'],
    ['Weight supplied (kg)', formatWeight(totals.weight) || '0.000'],
    ['Average realised rate (Rs./kg)', formatRate(totals.averageRate) || '0.00'],
    // Two ways money comes in, kept apart because most of it arrives on the sale
    // row itself and a payment-voucher count alone reads as "never paid".
    [
      'Collected with sales',
      `${formatCount(totals.salesWithCollectionCount) || '0'} of ${formatCount(totals.saleCount) || '0'}`
        + `  -  Rs. ${formatMoney(totals.collectedWithSales)}`
    ],
    ['Separate payment receipts', formatCount(totals.paymentCount) || '0'],
    ['Adjustments (credit / debit notes)', formatCount(totals.adjustmentCount) || '0']
  ];

  doc.setFontSize(9);
  let leftY = top + 6;
  lines.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    setColor(doc, INK.muted);
    doc.text(safe(label), margin, leftY);
    doc.setFont('helvetica', 'bold');
    setColor(doc, INK.text);
    doc.text(safe(value), margin + blockWidth, leftY, { align: 'right' });
    leftY += 5.2;
  });

  const movement = [
    ['Opening balance', formatBalance(totals.openingBalance), false],
    ['Add: sales and debits in period', `+ ${formatMoney(totals.totalDebit)}`, false],
    ['Less: payments and credits in period', `- ${formatMoney(totals.totalCredit)}`, false],
    ['Closing balance', formatBalance(totals.closingBalance), true]
  ];

  let rightY = top + 6;
  movement.forEach(([label, value, isTotal], index) => {
    if (isTotal) {
      doc.setDrawColor(INK.navy[0], INK.navy[1], INK.navy[2]);
      doc.setLineWidth(0.3);
      doc.line(rightX, rightY - 3.6, right, rightY - 3.6);
      rightY += 1.4;
    }
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
    doc.setFontSize(isTotal ? 10.5 : 9);
    setColor(doc, isTotal ? INK.navy : INK.muted);
    doc.text(safe(label), rightX, rightY);
    setColor(doc, isTotal
      ? (totals.closingBalance > 0 ? INK.debit : totals.closingBalance < 0 ? INK.credit : INK.text)
      : INK.text);
    doc.setFont('helvetica', 'bold');
    doc.text(safe(value), right, rightY, { align: 'right' });
    rightY += index === movement.length - 2 ? 6 : 5.2;
  });

  const bottom = Math.max(leftY, rightY) + 2;

  // The amount payable, in words, on its own band - the line a customer reads
  // first and the one a dispute is settled against.
  doc.setFillColor(INK.navySoft[0], INK.navySoft[1], INK.navySoft[2]);
  doc.rect(margin, bottom, CONTENT_WIDTH, 13, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setColor(doc, INK.muted);
  const payableLabel = totals.closingBalance < 0 ? 'ADVANCE HELD, IN WORDS' : 'AMOUNT PAYABLE, IN WORDS';
  doc.text(payableLabel, margin + 3, bottom + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  setColor(doc, INK.text);
  doc.text(safe(amountInWords(totals.closingBalance)), margin + 3, bottom + 10);

  return bottom + 13;
};

/** Notes and signature, then the footer on every page. */
const drawFootMatter = (doc, model, y) => {
  const { margin } = PAGE;
  const right = PAGE.width - margin;
  const company = getCompanyConfig();

  let top = y + 8;
  if (top + 26 > PAGE.height - 18) {
    doc.addPage();
    top = margin + 8;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  setColor(doc, INK.muted);
  [
    'Dr means the amount is owed to us; Cr means the account is in credit.',
    'Rows marked [back-dated] were entered after a later transaction; [corrected] rows have been superseded and are shown for trace only.',
    'Please verify this statement and report any discrepancy within 7 days.'
  ].forEach((note, index) => {
    doc.text(safe(note), margin, top + index * 4);
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setColor(doc, INK.muted);
  doc.text(`For ${safe(company.name)}`, right, top, { align: 'right' });
  doc.setDrawColor(INK.rule[0], INK.rule[1], INK.rule[2]);
  doc.setLineWidth(0.2);
  doc.line(right - 50, top + 14, right, top + 14);
  doc.setFontSize(7.8);
  doc.text('Authorised signatory', right, top + 18, { align: 'right' });

  // Footer last, on every page, once the count is final.
  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(INK.rule[0], INK.rule[1], INK.rule[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, PAGE.height - 13, right, PAGE.height - 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    setColor(doc, INK.muted);
    doc.text(safe(`${company.name} - ${company.website}`), margin, PAGE.height - 9);
    doc.text(
      safe(`Statement of account - ${model.customer.name}`),
      PAGE.width / 2,
      PAGE.height - 9,
      { align: 'center' }
    );
    doc.text(`Page ${page} of ${pageCount}`, right, PAGE.height - 9, { align: 'right' });
    doc.text('Computer-generated statement; no signature required for verification.', margin, PAGE.height - 5.5);
  }
};

const fileNameFor = (model) => {
  const name = (model.customer.name || 'customer').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  const period = model.period.startDate && model.period.endDate
    ? `${model.period.startDate}_${model.period.endDate}`
    : 'all';
  return `statement-${name}-${period}.pdf`;
};

/**
 * Draws the statement and hands back the document without saving it.
 *
 * Separate from exportStatementToPdf so the layout can be rendered and inspected
 * without a browser download - jsPDF puts save() on the instance, not the
 * prototype, so there is nothing to intercept once it has been called.
 *
 * @param {Object} model Output of buildStatementModel.
 * @returns {{ doc: jsPDF, fileName: string }}
 */
export const renderStatementDocument = (model) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setProperties({
    title: `Statement of account - ${model.customer.name}`,
    subject: describePeriod(model.period),
    author: getCompanyConfig().name
  });

  let y = drawMasthead(doc, getCompanyConfig());
  y = drawPartyBlock(doc, model, y);
  y = drawPositionStrip(doc, model, y);
  y = drawTransactions(doc, model, y);
  y = drawClosing(doc, model, y);
  drawFootMatter(doc, model, y);

  return { doc, fileName: fileNameFor(model) };
};

/**
 * @param {Object} model Output of buildStatementModel.
 * @returns {string} The filename written.
 */
export const exportStatementToPdf = (model) => {
  const { doc, fileName } = renderStatementDocument(model);
  doc.save(fileName);
  return fileName;
};

export default exportStatementToPdf;
