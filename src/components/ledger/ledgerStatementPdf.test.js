import fs from 'fs';
import path from 'path';
import { buildStatementModel } from './ledgerStatement';
import { renderStatementDocument } from './ledgerStatementPdf';

/**
 * Renders the statement for real - jsPDF and autoTable both run under jsdom - so a
 * layout mistake fails here rather than in front of a customer. Set
 * STATEMENT_PDF_OUT to have each rendered statement written there to be looked at.
 */

const OUT_DIR = process.env.STATEMENT_PDF_OUT;

/** Renders, optionally writes the file, and reports what came out. */
const render = (model) => {
  const { doc, fileName } = renderStatementDocument(model);
  const bytes = doc.output('arraybuffer');
  if (OUT_DIR) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, fileName), Buffer.from(bytes));
  }
  return {
    fileName,
    pageCount: doc.internal.getNumberOfPages(),
    byteLength: bytes.byteLength,
    // jsPDF leaves content streams uncompressed unless asked otherwise, so the
    // drawn strings are readable in the output and can be asserted on.
    text: Buffer.from(bytes).toString('latin1')
  };
};
const statementOf = (entryCount, { ranged = true } = {}) => {
  const entries = [];
  let balance = ranged ? 12000 : 0;
  let debitTotal = 0;
  let creditTotal = 0;
  let birds = 0;
  let weight = 0;

  for (let index = 0; index < entryCount; index += 1) {
    const isPayment = index % 4 === 3;
    const day = (index % 28) + 1;
    const date = `2026-0${(index % 9) + 1}-${String(day).padStart(2, '0')}`;

    if (isPayment) {
      const credit = 5000 + index * 10;
      balance -= credit;
      creditTotal += credit;
      entries.push({
        id: index + 1,
        transactionDate: date,
        transactionType: 'PAYMENT',
        referenceId: 900 + index,
        debitAmount: 0,
        creditAmount: credit,
        runningBalance: balance,
        description: 'Payment received - UPI',
        paymentMode: index % 8 === 3 ? 'UPI' : 'CASH'
      });
    } else {
      const rowBirds = 40 + (index % 25);
      const rowWeight = Number((rowBirds * 2.05).toFixed(3));
      const debit = Math.round(rowWeight * 150 / 10) * 10;
      balance += debit;
      debitTotal += debit;
      birds += rowBirds;
      weight += rowWeight;
      entries.push({
        id: index + 1,
        transactionDate: date,
        transactionType: 'SALE',
        referenceId: 1000 + index,
        debitAmount: debit,
        creditAmount: 0,
        runningBalance: balance,
        description: `Sale - ${rowBirds} birds`,
        paymentMode: 'CASH',
        birds: rowBirds,
        weight: rowWeight,
        rate: 150,
        routeName: index % 2 ? 'Kurduwadi' : 'Barshi',
        driverName: index % 3 ? 'Rashid' : 'Imtiyaz',
        vehicleNo: '1234',
        isBackdated: index % 11 === 0,
        obsolete: index % 17 === 0
      });
    }
  }

  return {
    customerId: 42,
    customerName: 'Imran Poultry Traders',
    shopName: 'Imran Chicken Centre',
    mobileNo: '9876543210',
    address: 'Main Bazaar Road',
    cityName: 'Madha',
    creditLimitEnabled: true,
    creditLimit: 150000,
    startDate: ranged ? '2026-01-01' : null,
    endDate: ranged ? '2026-09-30' : null,
    firstTransactionDate: entries.length ? entries[0].transactionDate : null,
    lastTransactionDate: entries.length ? entries[entries.length - 1].transactionDate : null,
    openingBalance: ranged ? 12000 : 0,
    generatedAt: '2026-09-10T11:30:00',
    entries,
    totals: {
      rowCount: entries.length,
      saleCount: entries.filter((entry) => entry.transactionType === 'SALE').length,
      paymentCount: entries.filter((entry) => entry.transactionType === 'PAYMENT').length,
      adjustmentCount: 0,
      totalDebit: debitTotal,
      totalCredit: creditTotal,
      netMovement: debitTotal - creditTotal,
      openingBalance: ranged ? 12000 : 0,
      closingBalance: balance,
      birds,
      weight: Number(weight.toFixed(3)),
      averageRate: weight ? Number((debitTotal / weight).toFixed(2)) : 0
    }
  };
};

describe('renderStatementDocument', () => {
  it('renders a short statement on a single page', () => {
    const result = render(buildStatementModel(statementOf(6)));
    expect(result.fileName).toBe('statement-imran-poultry-traders-2026-01-01_2026-09-30.pdf');
    expect(result.pageCount).toBe(1);
    expect(result.byteLength).toBeGreaterThan(3000);
  });

  it('paginates a long statement and keeps drawing to the last page', () => {
    const result = render(buildStatementModel(statementOf(140)));
    expect(result.pageCount).toBeGreaterThan(3);
  });

  it('carries the balance across every page break', () => {
    const result = render(buildStatementModel(statementOf(140)));
    const occurrences = (needle) => result.text.split(needle).length - 1;

    // One at the foot of every page but the last, one at the head of every page
    // but the first, plus the opening row's own label.
    expect(occurrences('Balance carried forward')).toBe(result.pageCount - 1);
    expect(occurrences('Balance brought forward')).toBe(result.pageCount);
    // The continuation masthead names the account on every sheet.
    expect(occurrences('Statement of account - Imran Poultry Traders')).toBeGreaterThanOrEqual(result.pageCount);
  });

  it('never prints the rupee sign, which the built-in font cannot draw', () => {
    const result = render(buildStatementModel(statementOf(20)));
    expect(result.text).not.toContain('₹');
  });

  it('names an all-time statement by period rather than by dates', () => {
    const result = render(buildStatementModel(statementOf(10, { ranged: false })));
    expect(result.fileName).toBe('statement-imran-poultry-traders-all.pdf');
  });

  it('renders an account with no transactions at all', () => {
    const empty = { ...statementOf(0), entries: [], totals: { rowCount: 0 } };
    expect(render(buildStatementModel(empty)).pageCount).toBe(1);
  });

  it('renders a credit balance without special-casing', () => {
    const model = buildStatementModel(statementOf(8));
    model.totals.closingBalance = -4250.5;
    expect(() => render(model)).not.toThrow();
  });
});
