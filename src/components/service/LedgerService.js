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
}

export default LedgerService;
