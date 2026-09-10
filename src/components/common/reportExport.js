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
 */

const fileStamp = () => new Date().toISOString().slice(0, 10);

/** Escape a value for display; null and undefined become an empty cell. */
const cell = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).split("").filter((ch) => ch.codePointAt(0) >= 32 && ch.codePointAt(0) !== 127).join("");
};

/**
 * @param {Object} args
 * @param {Array<{key: string, label: string, numeric?: boolean}>} args.columns
 * @param {Array<Object>} args.rows
 * @param {Object|null} args.totalsRow  Pre-built totals keyed like a row.
 * @param {string} args.title
 * @param {string} args.subtitle
 */
export const exportReportToPdf = ({ columns, rows, totalsRow, title, subtitle }) => {
  const company = getCompanyConfig();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - 10;

  doc.setFontSize(14);
  doc.text(title, 10, 12);
  doc.setFontSize(9);
  doc.text(subtitle, 10, 18);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 10, 23);

  doc.setFontSize(13);
  doc.text(company.name, rightX, 12, { align: 'right' });
  doc.setFontSize(9);
  doc.text(company.address, rightX, 18, { align: 'right' });
  doc.text(`Contact: ${company.contactNumber}`, rightX, 23, { align: 'right' });

  const body = rows.map((row) => columns.map((column) => cell(row[column.key])));
  if (totalsRow) {
    body.push(columns.map((column) => cell(totalsRow[column.key])));
  }

  autoTable(doc, {
    head: [columns.map((column) => column.label)],
    body,
    startY: 28,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.5, valign: 'middle' },
    headStyles: { fillColor: [31, 58, 95], textColor: 255, fontStyle: 'bold' },
    columnStyles: columns.reduce((styles, column, index) => {
      if (column.numeric) styles[index] = { halign: 'right' };
      return styles;
    }, {}),
    // The last row is the totals row when one was supplied.
    didParseCell: (data) => {
      if (totalsRow && data.section === 'body' && data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [232, 237, 244];
      }
    }
  });

  doc.save(`${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${fileStamp()}.pdf`);
};

export const exportReportToExcel = ({ columns, rows, totalsRow, title }) => {
  const data = rows.map((row) => {
    const record = {};
    columns.forEach((column) => {
      record[column.label] = row[column.key] ?? '';
    });
    return record;
  });

  if (totalsRow) {
    const record = {};
    columns.forEach((column) => {
      record[column.label] = totalsRow[column.key] ?? '';
    });
    data.push(record);
  }

  const sheet = XLSX.utils.json_to_sheet(data);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Report');
  XLSX.writeFile(book, `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${fileStamp()}.xlsx`);
};
