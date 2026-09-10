import fs from 'fs';
import path from 'path';
import { renderReportDocument } from './reportExport';

/**
 * Holds the report PDF to the thing that was actually wrong with it: values drawn
 * over the column beside them and cut off at the page edge.
 *
 * autoTable records the layout it used on doc.lastAutoTable, so after rendering
 * every cell's text can be measured against the width of the column it was drawn
 * in. A cell whose text is wider than its box is one that overprints its
 * neighbour, which is what these tests refuse to allow.
 *
 * Set REPORT_PDF_OUT to keep the rendered files and look at them.
 */

const OUT_DIR = process.env.REPORT_PDF_OUT;
const CELL_PADDING = 1.4;

const render = (args) => {
  const result = renderReportDocument(args);
  if (OUT_DIR) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, result.fileName), Buffer.from(result.doc.output('arraybuffer')));
  }
  return result;
};

/**
 * Every cell that jsPDF drew, with the width of its text and of its box.
 *
 * A wrapped cell holds several lines; the widest one is what has to fit, and a
 * numeric column should never be wrapping in the first place.
 */
const measureCells = ({ doc, layout }) => {
  const table = doc.lastAutoTable;
  const measurements = [];

  [...(table.head || []), ...(table.body || []), ...(table.foot || [])].forEach((row) => {
    Object.values(row.cells).forEach((tableCell) => {
      if (!tableCell) return;
      const lines = Array.isArray(tableCell.text) ? tableCell.text : [String(tableCell.text ?? '')];
      doc.setFont('helvetica', tableCell.styles.fontStyle === 'bold' ? 'bold' : 'normal');
      doc.setFontSize(tableCell.styles.fontSize ?? layout.fontSize);
      const textWidth = lines.reduce((widest, line) => Math.max(widest, doc.getTextWidth(line)), 0);
      measurements.push({
        text: lines.join(' '),
        lineCount: lines.length,
        textWidth,
        innerWidth: tableCell.width - CELL_PADDING * 2,
        columnIndex: tableCell.styles.halign === 'right' ? 'numeric' : 'text'
      });
    });
  });

  return measurements;
};

const money = (value) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const weight = (value) => value.toFixed(3);
const count = (value) => value.toLocaleString('en-IN');

/** The reconciliation report - twenty columns, the widest one in the app. */
const reconciliationReport = (rowCount = 40) => {
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'route', label: 'Route' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'driver', label: 'Driver' },
    { key: 'birdsLoaded', label: 'Birds loaded', numeric: true },
    { key: 'birdsSold', label: 'Sold', numeric: true },
    { key: 'mortality', label: 'Mortality', numeric: true },
    { key: 'returnToFarm', label: 'To farm (stock)', numeric: true },
    { key: 'birdVariance', label: 'Bird variance', numeric: true },
    { key: 'weightLoaded', label: 'Wt loaded', numeric: true },
    { key: 'weightSold', label: 'Wt sold', numeric: true },
    { key: 'weightLoss', label: 'Weight loss', numeric: true },
    { key: 'headerWeightVariance', label: 'Header vs lines', numeric: true },
    { key: 'averageWeightPerBird', label: 'kg/bird', numeric: true },
    { key: 'amount', label: 'Amount', numeric: true },
    { key: 'paid', label: 'Paid', numeric: true },
    { key: 'pending', label: 'Pending', numeric: true },
    { key: 'averageRate', label: 'Avg rate', numeric: true },
    { key: 'closingBalance', label: 'Closing balance', numeric: true }
  ];

  const rows = Array.from({ length: rowCount }, (unused, index) => ({
    date: `0${(index % 9) + 1} Sep 2026`,
    route: 'Kurduwadi via Barshi',
    vehicle: `MH13 AB ${1000 + index}`,
    driver: 'Imtiyaz Bagwan',
    birdsLoaded: count(1200 + index),
    birdsSold: count(1180 + index),
    mortality: count(12),
    returnToFarm: count(8),
    birdVariance: count(0),
    weightLoaded: weight(2460.75 + index),
    weightSold: weight(2418.5 + index),
    weightLoss: weight(42.25),
    headerWeightVariance: weight(0.125),
    averageWeightPerBird: weight(2.05),
    // Deliberately large: a crore-scale amount is the widest thing these
    // columns ever have to hold, and it was the first thing to overprint.
    amount: money(12506810.5),
    paid: money(12198870.25),
    pending: money(307940.25),
    averageRate: money(152.25),
    closingBalance: money(2036724750.75)
  }));

  const totalsRow = {
    date: 'TOTAL',
    route: `${count(rowCount)} trips`,
    birdsLoaded: count(48000),
    birdsSold: count(47200),
    mortality: count(480),
    returnToFarm: count(320),
    birdVariance: count(0),
    weightLoaded: weight(98430),
    weightSold: weight(96740),
    weightLoss: weight(1690),
    amount: money(1250681050),
    paid: money(1219887025),
    pending: money(30794025),
    averageRate: money(152.25),
    closingBalance: money(2036724750.75)
  };

  return {
    columns,
    rows,
    totalsRow,
    title: 'Trip reconciliation',
    subtitle: '2026-01-01 to 2026-09-30   |   Period: MONTH   |   Route #6'
  };
};

/** A narrow report, to prove the fitting does not needlessly go to A3. */
const summaryReport = () => ({
  columns: [
    { key: 'periodLabel', label: 'Period' },
    { key: 'dimensionName', label: 'Route' },
    { key: 'birds', label: 'Birds', numeric: true },
    { key: 'weight', label: 'Weight (kg)', numeric: true },
    { key: 'amount', label: 'Amount', numeric: true },
    { key: 'pending', label: 'Pending', numeric: true }
  ],
  rows: Array.from({ length: 12 }, (unused, index) => ({
    periodLabel: `Sep 2026 week ${index + 1}`,
    dimensionName: 'Route 6',
    birds: count(4200),
    weight: weight(8610.5),
    amount: money(1310250),
    pending: money(120500)
  })),
  totalsRow: {
    periodLabel: 'TOTAL',
    birds: count(50400),
    weight: weight(103326),
    amount: money(15723000),
    pending: money(1446000)
  },
  title: 'Route summary',
  subtitle: '2026-01-01 to 2026-09-30'
});

describe('report PDF layout', () => {
  it('never draws a value wider than the column it sits in', () => {
    const result = render(reconciliationReport());
    const overflowing = measureCells(result).filter((m) => m.textWidth > m.innerWidth + 0.01);

    expect(overflowing.map((m) => `${m.text} (${m.textWidth.toFixed(1)}mm in ${m.innerWidth.toFixed(1)}mm)`))
      .toEqual([]);
  });

  it('keeps the table inside the printable width of the page it chose', () => {
    const result = render(reconciliationReport());
    const pageWidth = result.doc.internal.pageSize.getWidth();

    expect(result.layout.total).toBeLessThanOrEqual(pageWidth - 20);
    expect(result.layout.overflowed).toBeFalsy();
  });

  it('takes a twenty-column report to A3 rather than squeezing it onto A4', () => {
    const result = render(reconciliationReport());
    expect(result.layout.format).toBe('a3');
    expect(result.layout.fontSize).toBeGreaterThanOrEqual(6);
  });

  it('leaves a narrow report on A4 at full size', () => {
    const result = render(summaryReport());
    expect(result.layout.format).toBe('a4');
    expect(result.layout.fontSize).toBe(7.5);
    expect(measureCells(result).filter((m) => m.textWidth > m.innerWidth + 0.01)).toEqual([]);
  });

  it('never wraps a numeric cell onto a second line', () => {
    const wrapped = measureCells(render(reconciliationReport()))
      .filter((m) => m.columnIndex === 'numeric' && m.lineCount > 1);
    expect(wrapped.map((m) => m.text)).toEqual([]);
  });

  it('drops the rupee sign, which the built-in font cannot draw', () => {
    const result = render(reconciliationReport(3));
    const text = Buffer.from(result.doc.output('arraybuffer')).toString('latin1');
    expect(text).not.toContain('₹');
    // The unit is stated once in the heading instead.
    expect(text).toContain('All amounts in Rs.');
  });

  it('wraps a long text value instead of letting it overrun', () => {
    const report = summaryReport();
    report.rows[0].dimensionName = 'Kurduwadi via Barshi and Kurduwadi bypass road';
    const result = render(report);

    const cells = measureCells(result);
    expect(cells.filter((m) => m.textWidth > m.innerWidth + 0.01)).toEqual([]);
    expect(cells.some((m) => m.lineCount > 1)).toBe(true);
  });
});
