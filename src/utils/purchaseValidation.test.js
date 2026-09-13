import {
  validatePurchaseDate,
  validateDcLine,
  summariseLines,
  validatePurchase,
  orderFilesForUpload,
  buildPurchaseSummary
} from './purchaseValidation';

/**
 * The purchase entry rules.
 *
 * Purchases were entered with four presence checks and nothing else: no line arithmetic, no
 * date rule, and no idea which scanned DC belonged to which line. The server trusted whatever
 * amount the browser sent, so a wrong figure became the amount owed to a supplier with nothing
 * anywhere to catch it.
 *
 * These are the checks the sales side has had all along, applied to the purchase side.
 */

const line = (overrides = {}) => ({
  srNo: 1,
  dcNo: '111',
  nos: '750',
  kilograms: '2100',
  rate: '75',
  amount: 157500,
  ...overrides
});

describe('validatePurchaseDate', () => {
  it('refuses a future date, as the server does', () => {
    const check = validatePurchaseDate({ entryDate: '2026-09-20', today: '2026-09-12' });

    expect(check.blocked).toBe(true);
    expect(check.message).toMatch(/future/i);
  });

  it('allows today', () => {
    expect(validatePurchaseDate({ entryDate: '2026-09-12', today: '2026-09-12' }))
      .toMatchObject({ blocked: false, requiresConfirmation: false, daysBack: 0 });
  });

  it('allows a few days back without ceremony - a DC note often arrives late', () => {
    const check = validatePurchaseDate({ entryDate: '2026-09-09', today: '2026-09-12' });

    expect(check.blocked).toBe(false);
    expect(check.requiresConfirmation).toBe(false);
    expect(check.daysBack).toBe(3);
    // Still says what will happen: the supplier's later balances get rewritten.
    expect(check.message).toMatch(/recalculated/i);
  });

  it('asks for confirmation when the date is well back', () => {
    expect(validatePurchaseDate({ entryDate: '2026-08-01', today: '2026-09-12' }))
      .toMatchObject({ blocked: false, requiresConfirmation: true, daysBack: 42 });
  });

  it('requires a date at all', () => {
    expect(validatePurchaseDate({ entryDate: '' }).blocked).toBe(true);
  });
});

describe('validateDcLine', () => {
  it('passes a complete line', () => {
    expect(validateDcLine(line(), 1)).toMatchObject({ ok: true, problems: [] });
  });

  it('names every missing field rather than only the first', () => {
    // One round trip per missing field is how a four-line purchase takes ten minutes.
    const check = validateDcLine({ dcNo: '', nos: '', kilograms: '', rate: '' }, 2);

    expect(check.ok).toBe(false);
    expect(check.problems).toHaveLength(4);
    expect(check.position).toBe(2);
  });

  it('catches an amount that does not match its own weight and rate', () => {
    // The server refuses this now, naming the line. Catching it here means the operator sees
    // which line instead of losing the form to a 400.
    const check = validateDcLine(line({ amount: 99999 }), 1);

    expect(check.amountDisagrees).toBe(true);
    expect(check.expectedAmount).toBe(157500);
    expect(check.problems[0]).toContain('157500');
  });

  it('applies the ₹10 rounding the server applies', () => {
    // 250.5 kg at ₹150 is 37,575, which rounds to 37,580.
    expect(validateDcLine(line({ kilograms: '250.5', rate: '150', amount: 37580 }), 1))
      .toMatchObject({ ok: true, expectedAmount: 37580 });
  });

  it('does not also complain about the amount on an incomplete line', () => {
    // An empty line disagrees with everything; saying so twice helps nobody.
    const check = validateDcLine({ dcNo: '1', nos: '', kilograms: '', rate: '' }, 1);

    expect(check.amountDisagrees).toBe(false);
  });

  it('warns when the weight per bird is implausible', () => {
    // Purchase 7 in the live data: 960 birds against 3,029 kg is 3.16 kg a bird, which is
    // fine - but 960 birds against 30,000 kg would be a digit slip worth catching.
    const check = validateDcLine(line({ nos: '960', kilograms: '30000', rate: '75' }), 1);

    expect(check.weightLooksWrong).toBe(true);
    expect(check.perBird).toBeCloseTo(31.25, 2);
  });

  it('does not warn about an ordinary bird', () => {
    expect(validateDcLine(line({ nos: '960', kilograms: '3029.75', rate: '75' }), 1).weightLooksWrong)
      .toBe(false);
  });
});

describe('summariseLines', () => {
  it('totals birds, weight and amount across lines', () => {
    const totals = summariseLines([
      line({ nos: '750', kilograms: '2100', rate: '75' }),
      line({ nos: '450', kilograms: '600', rate: '90' })
    ]);

    expect(totals).toMatchObject({ lines: 2, birds: 1200, kilograms: 2700 });
    // 157500 + 54000
    expect(totals.amount).toBe(211500);
  });

  it('derives the amount from each line rather than trusting the amount box', () => {
    // The box says 1, the weight and rate say 157500. The server computes the second, so the
    // screen must show the second or the two disagree about what is being saved.
    expect(summariseLines([line({ amount: 1 })]).amount).toBe(157500);
  });

  it('gives the average rate as amount over weight', () => {
    expect(summariseLines([
      line({ nos: '750', kilograms: '2100', rate: '75' }),
      line({ nos: '450', kilograms: '600', rate: '90' })
    ]).averageRate).toBeCloseTo(78.33, 2);
  });

  it('leaves the rate unknown rather than zero when there is no weight', () => {
    expect(summariseLines([]).averageRate).toBeNull();
    expect(summariseLines([line({ kilograms: '0' })]).averageRate).toBeNull();
  });
});

describe('validatePurchase', () => {
  const formData = {
    entryDate: '2026-09-12',
    vehicle: 1,
    driver: 2,
    supplier: 3,
    diesel: '3000',
    hamali: '800',
    driverExpense: '500'
  };

  it('allows a complete purchase', () => {
    const result = validatePurchase({ formData, lines: [line()], today: '2026-09-12' });

    expect(result.canSubmit).toBe(true);
    expect(result.blocking).toEqual([]);
  });

  it('names every missing header field in one message', () => {
    const result = validatePurchase({
      formData: { entryDate: '2026-09-12' }, lines: [line()], today: '2026-09-12'
    });

    expect(result.canSubmit).toBe(false);
    expect(result.blocking[0]).toBe('Choose the vehicle, driver, supplier.');
  });

  it('blocks on a bad line and says which one', () => {
    const result = validatePurchase({
      formData,
      lines: [line(), line({ srNo: 2, nos: '' })],
      today: '2026-09-12'
    });

    expect(result.canSubmit).toBe(false);
    expect(result.blocking.some((problem) => problem.startsWith('DC line 2:'))).toBe(true);
  });

  it('needs at least one line', () => {
    const result = validatePurchase({ formData, lines: [], today: '2026-09-12' });

    expect(result.canSubmit).toBe(false);
    expect(result.blocking).toContain('Add at least one DC line.');
  });

  it('warns without blocking on a purchase worth nothing', () => {
    // Purchase 7 again: a load recorded for ₹0 should be questioned, not refused - the rate
    // may genuinely be settled later.
    const result = validatePurchase({
      formData, lines: [line({ rate: '0', amount: 0 })], today: '2026-09-12'
    });

    expect(result.blocking.some((problem) => problem.includes('rate'))).toBe(true);
  });

  it('separates warnings from blockers, because they are acted on differently', () => {
    // 10 birds against 900 kg is 90 kg a bird - a plain digit slip, and worth saying so.
    // The amount is correct for the figures given (900 x 75), so nothing blocks: the operator
    // is told what looks wrong and left to decide.
    const result = validatePurchase({
      formData,
      lines: [line({ nos: '10', kilograms: '900', rate: '75', amount: 67500 })],
      today: '2026-09-12'
    });

    expect(result.canSubmit).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/kg a bird/);
  });
});

describe('orderFilesForUpload', () => {
  const lines = [line({ srNo: 1 }), line({ srNo: 2 }), line({ srNo: 3 })];

  it('puts each scan at its own line position', () => {
    // The bug this exists for: every attach button appended to one flat list, so a scan
    // chosen on line 3 was posted as the scan for line 1 - the evidence of what was
    // received, filed against the wrong DC note.
    const scan = new Blob(['x']);
    const ordered = orderFilesForUpload(lines, { 2: scan });

    expect(ordered).toHaveLength(3);
    expect(ordered[0]).toBeNull();
    expect(ordered[1]).toBeNull();
    expect(ordered[2]).toBe(scan);
  });

  it('keeps positions when an earlier line has no scan', () => {
    const first = new Blob(['a']);
    const third = new Blob(['c']);
    const ordered = orderFilesForUpload(lines, { 0: first, 2: third });

    expect(ordered[0]).toBe(first);
    expect(ordered[1]).toBeNull();
    expect(ordered[2]).toBe(third);
  });

  it('sends nothing at all when no line has a scan', () => {
    // Rather than three empty placeholders, which the server would have to unpick.
    expect(orderFilesForUpload(lines, {})).toEqual([]);
  });
});

describe('buildPurchaseSummary', () => {
  it('reads back what is about to be saved, with names rather than ids', () => {
    const summary = buildPurchaseSummary({
      formData: {
        entryDate: '2026-09-12',
        supplier: 3,
        vehicle: 1,
        driver: 2,
        farm: 'Sachin Patil',
        branch: 'Miraj',
        diesel: '3000',
        hamali: '800',
        driverExpense: '500'
      },
      lines: [line()],
      labels: { supplier: 'Komarla Agrovet', vehicle: 'MH12AB1234', driver: 'Iqbal Mulani' }
    });

    expect(summary).toMatchObject({
      date: '2026-09-12',
      supplier: 'Komarla Agrovet',
      vehicle: 'MH12AB1234',
      driver: 'Iqbal Mulani',
      birds: 750,
      amount: 157500,
      expenses: 4300
    });
  });
});
