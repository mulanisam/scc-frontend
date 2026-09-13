import apiClient from './api.js';

/**
 * Customer ledger and statement access.
 *
 * Goes through apiClient, which attaches the bearer token, handles a 401 centrally
 * and turns a server rejection into an Error carrying the server's own message -
 * so a reversed date range surfaces as "End date ... is before start date ..."
 * rather than a generic failure. The previous version took a token argument and
 * built its own axios call, which meant every caller had to read localStorage.
 */
class LedgerService {

  /**
   * Raw ledger rows for a date range. Kept for callers that only need the rows;
   * a statement wants getCustomerStatement instead, which also carries the
   * balance brought forward and the closing figures.
   */
  static async getCustomerLedger(customerId, startDate, endDate) {
    const response = await apiClient.get(`/user/ledger/customer/${customerId}`, {
      params: {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {})
      }
    });
    return response.data;
  }

  /**
   * Full statement of account: identity, period, opening balance, transactions
   * with each sale's birds/weight/rate resolved, and the closing totals.
   */
  static async getCustomerStatement(customerId, startDate, endDate) {
    const response = await apiClient.get(`/user/ledger/customer/${customerId}/statement`, {
      params: {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {})
      }
    });
    return response.data;
  }

  /** Closing balance over the whole history. */
  static async getCurrentBalance(customerId) {
    const statement = await this.getCustomerStatement(customerId, null, null);
    return statement?.totals?.closingBalance ?? 0;
  }

  /**
   * The statement as a PDF, rendered by the server.
   *
   * The same endpoint the weekly WhatsApp statement uses, so the file a customer
   * downloads here and the file they are sent are byte for byte the same document.
   * Drawing it in the browser instead would leave two layouts to keep in step, and
   * the scheduled send could not use either of them.
   *
   * responseType 'blob' is required: without it axios decodes the PDF as text and
   * the saved file is corrupt.
   *
   * @returns {Promise<{blob: Blob, fileName: string}>}
   */
  static async getCustomerStatementPdf(customerId, startDate, endDate) {
    const response = await apiClient.get(
      `/user/ledger/customer/${customerId}/statement.pdf`,
      {
        params: {
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {})
        },
        responseType: 'blob',
        // A long history takes longer to render than the 15 second default allows.
        timeout: 60000
      }
    );

    return {
      blob: response.data,
      // The server names the file; the header is the only place that name exists.
      fileName: filenameFrom(response.headers?.['content-disposition'])
        || `statement-${customerId}.pdf`
    };
  }
}

/**
 * Reads the name out of `inline; filename="statement-javed-kureshi-2026-09-01_...pdf"`.
 *
 * filename* is tried first, and deliberately: a header can carry both, and the plain
 * filename may be the RFC 2047 form - "=?UTF-8?Q?statement-...?=" - which taking the
 * first match would hand straight to the browser as the name to save under. The
 * extended form is always percent-encoded UTF-8 and needs no decoding beyond that.
 */
const filenameFrom = (contentDisposition) => {
  if (!contentDisposition) return '';

  const extended = /filename\*=\s*UTF-8''([^;]+)/i.exec(contentDisposition);
  if (extended) {
    try {
      return decodeURIComponent(extended[1].trim());
    } catch {
      // A malformed escape should not cost the download; fall through to filename.
    }
  }

  const plain = /filename=\s*"?([^";]+)"?/i.exec(contentDisposition);
  return plain ? plain[1].trim() : '';
};

export default LedgerService;
