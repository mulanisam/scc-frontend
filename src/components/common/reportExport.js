import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getCompanyConfig } from '../../config/companyConfig';

/**
 * Browser-side report export.
 *
 * Kept out of the Reports component so the screen stays about presenting the
 * report, and so PDF and Excel share one definition of the columns, the heading
 * and the totals row - previously the PDF built its own totals separately from
 * the ones on screen, which is how the two could disagree.
 *
 * Column widths are measured, not left to autoTable. The reconciliation report
 * has twenty columns and the comparison fifteen, mostly amounts like
 * "1,25,06,810.00"; asked to fit those into A4 landscape, autoTable shrinks every
 * column proportionally, and a long number with no spaces in it cannot wrap - so
 * it was drawn straight over its neighbour and cut off at the page edge. Here the
 * width each column actually needs is measured with the font that will draw it,
 * and the page size and font size are chosen to fit; wide reports go to A3
 * landscape rather than being squeezed.
 */

const fileStamp = () => new Date().toISOString().slice(0, 10);

/**
 * Paper and type sizes to try, narrowest and largest type first. Reducing type
 * before changing paper keeps the common reports on A4, which is what people
 * actually have in their printer.
 */
const LAYOUTS = [
  { format: 'a4', width: 297, fontSize: 7.5 },
  { format: 'a4', width: 297, fontSize: 7 },
  { format: 'a4', width: 297, fontSize: 6.5 },
  { format: 'a4', width: 297, fontSize: 6 },
  { format: 'a3', width: 420, fontSize: 7.5 },
  { format: 'a3', width: 420, fontSize: 7 },
  { format: 'a3', width: 420, fontSize: 6.5 },
  { format: 'a3', width: 420, fontSize: 6 }
];

const MARGIN = 10;
const CELL_PADDING = 1.4;
/** Text columns wrap; this is as wide as one is allowed to get before it does. */
const MAX_TEXT_WIDTH = 34;
const MIN_COLUMN_WIDTH = 9;

/**
 * Cell text jsPDF can actually draw.
 *
 * The rupee sign is the important one: the built-in Helvetica is WinAnsi-encoded
 * and has no glyph for U+20B9, so every amount was drawn with a missing character
 * whose width jsPDF measures as something else again - part of why the columns
 * would not line up. The heading says the amounts are in rupees instead.
 */
const cell = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/₹\s?/g, '')
    .replace(/—/g, '-')
    .split('')
    .filter((ch) => ch.codePointAt(0) >= 32 && ch.codePointAt(0) !== 127)
    .join('');
};

/** Widest line in a wrapped cell, at the current font settings. */
const measure = (doc, text) => {
  if (!text) return 0;
  return text.split('\n').reduce((widest, line) => Math.max(widest, doc.getTextWidth(line)), 0);
};

/**
 * Width each column needs to show its content in full.
 *
 * Numeric columns get exactly what they measure, so a number is never wrapped or
 * clipped. Text columns are capped and wrap instead, because one long shop name
 * should not be allowed to squeeze twenty amount columns.
 */
const measureColumns = (doc, columns, matrix, fontSize) => {
  doc.setFontSize(fontSize);

  doc.setFont('helvetica', 'bold');
  const headWidths = columns.map((column) => measure(doc, cell(column.label)));

  doc.setFont('helvetica', 'normal');
  return columns.map((column, index) => {
    let widest = headWidths[index];
    matrix.forEach((row) => {
      widest = Math.max(widest, measure(doc, row[index]));
    });

    const needed = widest + CELL_PADDING * 2 + 0.6;
    const width = column.numeric ? needed : Math.min(needed, MAX_TEXT_WIDTH);
    return Math.max(width, MIN_COLUMN_WIDTH);
  });
};

/**
 * Picks the first paper and type size the table fits on, and returns the column
 * widths for it. Falls back to the largest paper at the smallest type, where the
 * text columns are trimmed further - never the numeric ones.
 */
const planLayout = (columns, matrix) => {
  // Measurement depends only on font and size, so a scratch document does it.
  const scratch = new jsPDF({ unit: 'mm', format: 'a4' });

  for (const layout of LAYOUTS) {
    const widths = measureColumns(scratch, columns, matrix, layout.fontSize);
    const total = widths.reduce((sum, width) => sum + width, 0);
    if (total <= layout.width - MARGIN * 2) {
      return { ...layout, widths, total };
    }
  }

  const layout = LAYOUTS[LAYOUTS.length - 1];
  const widths = measureColumns(scratch, columns, matrix, layout.fontSize);
  const available = layout.width - MARGIN * 2;
  let excess = widths.reduce((sum, width) => sum + width, 0) - available;

  // Take the overflow out of the text columns, widest first, down to the floor.
  const textIndexes = columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => !column.numeric)
    .sort((a, b) => widths[b.index] - widths[a.index]);

  for (const { index } of textIndexes) {
    if (excess <= 0) break;
    const spare = widths[index] - MIN_COLUMN_WIDTH;
    const taken = Math.min(spare, excess);
    widths[index] -= taken;
    excess -= taken;
  }

  return { ...layout, widths, total: widths.reduce((sum, width) => sum + width, 0), overflowed: excess > 0 };
};

/**
 * Renders the report and hands back the document without saving it, so the layout
 * can be measured and checked. jsPDF puts save() on the instance rather than the
 * prototype, so there is nothing to intercept once it has been called.
 */
export const renderReportDocument = ({ columns, rows, totalsRow, title, subtitle }) => {
  const company = getCompanyConfig();

  const matrix = rows.map((row) => columns.map((column) => cell(row[column.key])));
  if (totalsRow) {
    matrix.push(columns.map((column) => cell(totalsRow[column.key])));
  }

  const layout = planLayout(columns, matrix);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: layout.format });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const rightX = pageWidth - MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(cell(title), MARGIN, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(cell(subtitle), MARGIN, 17.5);
  // Said once here rather than repeated as a symbol in every amount cell.
  doc.text(`All amounts in Rs.   |   Generated ${new Date().toLocaleString('en-IN')}`, MARGIN, 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(cell(company.name), rightX, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(cell(company.address), rightX, 17.5, { align: 'right' });
  doc.text(cell(`Contact: ${company.contactNumber}`), rightX, 22, { align: 'right' });

  autoTable(doc, {
    head: [columns.map((column) => cell(column.label))],
    body: matrix,
    startY: 27,
    theme: 'grid',
    // Fixed widths, so the header repeated on page four sits over the same
    // columns as the one on page one.
    tableWidth: layout.total,
    margin: { top: 27, left: MARGIN, right: MARGIN, bottom: 14 },
    styles: {
      font: 'helvetica',
      fontSize: layout.fontSize,
      cellPadding: CELL_PADDING,
      valign: 'middle',
      // A safety net only: the widths above are measured so nothing should need
      // to wrap. It matters that the fallback wraps rather than overprints.
      overflow: 'linebreak',
      lineColor: [205, 211, 219],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [31, 58, 95],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: columns.reduce((styles, column, index) => {
      styles[index] = {
        cellWidth: layout.widths[index],
        halign: column.numeric ? 'right' : 'left'
      };
      return styles;
    }, {}),
    didParseCell: (data) => {
      if (data.section === 'head' && columns[data.column.index]?.numeric) {
        data.cell.styles.halign = 'right';
      }
      // The last body row is the totals row when one was supplied.
      if (totalsRow && data.section === 'body' && data.row.index === matrix.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [232, 237, 244];
      }
    },
    didDrawPage: () => {
      const page = doc.internal.getCurrentPageInfo().pageNumber;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(110, 118, 128);
      doc.text(cell(`${company.name} - ${company.website}`), MARGIN, pageHeight - 6);
      doc.text(cell(title), pageWidth / 2, pageHeight - 6, { align: 'center' });
      doc.text(`Page ${page}`, rightX, pageHeight - 6, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    }
  });

  return {
    doc,
    fileName: `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${fileStamp()}.pdf`,
    layout
  };
};

/**
 * @param {Object} args
 * @param {Array<{key: string, label: string, numeric?: boolean}>} args.columns
 * @param {Array<Object>} args.rows
 * @param {Object|null} args.totalsRow  Pre-built totals keyed like a row.
 * @param {string} args.title
 * @param {string} args.subtitle
 */
export const exportReportToPdf = (args) => {
  const { doc, fileName } = renderReportDocument(args);
  doc.save(fileName);
  return fileName;
};

/**
 * Excel gets the numbers back.
 *
 * The screen formats values into strings before they reach here ("1,25,06,810"),
 * and a sheet full of text cannot be summed, sorted or charted - which is most of
 * why someone exports to Excel. Numeric columns are parsed back to numbers and
 * given a format, so the sheet shows the same thing and behaves like data.
 */
const asNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const stripped = String(value).replace(/[₹,\s]/g, '');
  if (stripped === '' || stripped === '-' || stripped === '—') return null;
  const parsed = Number(stripped);
  return Number.isFinite(parsed) ? parsed : null;
};

export const exportReportToExcel = ({ columns, rows, totalsRow, title }) => {
  const toRecord = (row) => {
    const record = {};
    columns.forEach((column) => {
      const raw = row[column.key];
      if (column.numeric) {
        const numeric = asNumber(raw);
        record[column.label] = numeric === null ? (raw ?? '') : numeric;
      } else {
        record[column.label] = raw ?? '';
      }
    });
    return record;
  };

  const data = rows.map(toRecord);
  if (totalsRow) {
    data.push(toRecord(totalsRow));
  }

  const sheet = XLSX.utils.json_to_sheet(data);

  // Column widths, so nothing arrives as ##### and needs widening by hand.
  sheet['!cols'] = columns.map((column) => {
    const longest = data.reduce(
      (widest, record) => Math.max(widest, String(record[column.label] ?? '').length),
      column.label.length
    );
    return { wch: Math.min(Math.max(longest + 2, 10), 40) };
  });
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Report');
  XLSX.writeFile(book, `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${fileStamp()}.xlsx`);
};
