import {
  STATEMENT_COLUMNS,
  buildStatementModel,
  describePeriod,
  formatBalance,
  formatStatementDate,
  formatWeight
} from './ledgerStatement';
import { amountInWords } from './ledgerStatementPdf';

/** A statement payload shaped exactly like the server's. */
const payload = {
  customerId: 42,
  customerName: 'Imran Poultry',
  shopName: 'Imran Chicken Shop',
  mobileNo: '9876543210',
  cityName: 'Madha',
  obsolete: false,
  creditLimitEnabled: true,
  creditLimit: 50000,
  startDate: '2026-09-01',
  endDate: '2026-09-09',
  firstTransactionDate: '2026-09-02',
  lastTransactionDate: '2026-09-08',
  openingBalance: 12000,
  generatedAt: '2026-09-10T10:00:00',
  entries: [
    {
      id: 1,
      transactionDate: '2026-09-02',
      transactionType: 'SALE',
      referenceId: 1042,
      debitAmount: 18500,
      creditAmount: 5000,
      runningBalance: 25500,
      description: 'Sale - 60 birds, 121.500 kg',
      paymentMode: 'CASH',
      birds: 60,
      weight: 121.5,
      rate: 152.25,
      routeName: 'Kurduwadi',
      driverName: 'Rashid',
      isBackdated: true
    },
    {
      id: 2,
      transactionDate: '2026-09-08',
      transactionType: 'PAYMENT',
      referenceId: 77,
      debitAmount: 0,
      creditAmount: 10000,
      runningBalance: 15500,
      description: 'Payment received - UPI',
      paymentMode: 'UPI'
    }
  ],
  totals: {
    rowCount: 2,
    saleCount: 1,
    paymentCount: 1,
    adjustmentCount: 0,
    totalDebit: 18500,
    totalCredit: 15000,
    netMovement: 3500,
    openingBalance: 12000,
    closingBalance: 15500,
    birds: 60,
    weight: 121.5,
    averageRate: 152.26
  }
};

describe('buildStatementModel', () => {
  it('carries the opening balance as its own row when a range is set', () => {
    const model = buildStatementModel(payload);
    expect(model.showOpeningRow).toBe(true);
    expect(model.openingRow.particulars).toBe('Balance brought forward');
    expect(model.openingRow.balance).toBe(12000);
    expect(model.openingRow.date).toBe('2026-09-01');
  });

  it('hides the opening row for a whole-history statement', () => {
    const model = buildStatementModel({ ...payload, startDate: null, endDate: null, openingBalance: 0 });
    expect(model.showOpeningRow).toBe(false);
  });

  it('names the sale by its trip rather than by the enum', () => {
    const [sale] = buildStatementModel(payload).rows;
    expect(sale.particulars).toBe('Sale - Kurduwadi / Rashid');
    expect(sale.voucher).toBe('INV-1042');
  });

  it('labels a payment with its mode', () => {
    const payment = buildStatementModel(payload).rows[1];
    expect(payment.particulars).toBe('Payment received (UPI)');
    expect(payment.voucher).toBe('RCPT-77');
  });

  it('reads the back-dated flag under either name the server has used', () => {
    expect(buildStatementModel(payload).rows[0].backdated).toBe(true);

    const legacy = { ...payload, entries: [{ ...payload.entries[0], isBackdated: undefined, backdated: true }] };
    expect(buildStatementModel(legacy).rows[0].backdated).toBe(true);
  });

  it('takes the totals from the server rather than re-summing them', () => {
    const { totals } = buildStatementModel(payload);
    expect(totals.totalDebit).toBe(18500);
    expect(totals.totalCredit).toBe(15000);
    expect(totals.closingBalance).toBe(15500);
    expect(totals.birds).toBe(60);
  });

  it('separates collection taken on the sale row from payment receipts', () => {
    // The sale in the fixture carries 5,000 of its own collection, and there is
    // one separate receipt. Reporting only the receipt count would read as though
    // the customer had paid once.
    const { totals } = buildStatementModel(payload);
    expect(totals.salesWithCollectionCount).toBe(1);
    expect(totals.collectedWithSales).toBe(5000);
    expect(totals.paymentCount).toBe(1);
  });

  it('surfaces the last payment received', () => {
    const model = buildStatementModel(payload);
    expect(model.lastPayment).toEqual({ date: '2026-09-08', amount: 10000, mode: 'UPI' });
  });

  it('survives an empty statement', () => {
    const model = buildStatementModel({ customerId: 1, entries: [], totals: {}, openingBalance: 0 });
    expect(model.rows).toEqual([]);
    expect(model.totals.closingBalance).toBe(0);
    expect(model.lastPayment).toBeNull();
  });
});

describe('formatting', () => {
  it('states a balance with its side', () => {
    expect(formatBalance(15500)).toBe('15,500.00 Dr');
    expect(formatBalance(-2400)).toBe('2,400.00 Cr');
    expect(formatBalance(0).trim()).toBe('0.00');
  });

  it('pads a date to a fixed width so the column lines up', () => {
    expect(formatStatementDate('2026-09-02')).toBe('02 Sep 2026');
  });

  it('keeps weight at three decimals, matching the database scale', () => {
    expect(formatWeight(121.5)).toBe('121.500');
    expect(formatWeight(0)).toBe('');
  });

  it('describes both a range and an open-ended period', () => {
    const model = buildStatementModel(payload);
    expect(describePeriod(model.period)).toBe('01 Sep 2026  to  09 Sep 2026');
    const all = buildStatementModel({ ...payload, startDate: null, endDate: null });
    expect(describePeriod(all.period)).toContain('All transactions');
  });

  it('fits the columns inside the printable width of A4 portrait', () => {
    const total = STATEMENT_COLUMNS.reduce((sum, column) => sum + column.width, 0);
    expect(total).toBeLessThanOrEqual(210 - 11 * 2);
  });
});

describe('amountInWords', () => {
  it('groups the Indian way', () => {
    expect(amountInWords(15500)).toBe('Rupees Fifteen Thousand Five Hundred only');
    expect(amountInWords(20367247)).toBe('Rupees Two Crore Three Lakh Sixty Seven Thousand Two Hundred Forty Seven only');
  });

  it('states paise separately', () => {
    expect(amountInWords(1250.75)).toBe('Rupees One Thousand Two Hundred Fifty and Seventy Five Paise only');
  });

  it('reads a credit balance as its magnitude', () => {
    expect(amountInWords(-500)).toBe('Rupees Five Hundred only');
  });

  it('says nil for a settled account', () => {
    expect(amountInWords(0)).toBe('Rupees Nil');
  });
});
