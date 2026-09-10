import apiClient from './api.js';

/**
 * Sales reporting.
 *
 * Goes through apiClient, which attaches the bearer token and turns a server
 * rejection into an Error carrying the server's own message - so an invalid date
 * range surfaces as "End date ... is before start date ..." rather than a
 * generic failure.
 *
 * The previous version also exported downloadReportPDF and downloadReportExcel,
 * which called /reports/download/pdf and /reports/download/excel. Neither
 * endpoint has ever existed; exports are produced in the browser instead.
 */

/**
 * Transaction lines. Every filter is optional except the date range, and they
 * combine, so this one call serves the customer-, route- and driver-wise views.
 *
 * @param {Object} filters { startDate, endDate, routeId?, customerId?,
 *                           driverId?, vehicleId?, cityId?, excludeObsolete? }
 */
export const fetchSalesDetail = async (filters) => {
  const response = await apiClient.post('/reports/sales/detail', filters);
  return response.data;
};

/**
 * Aggregates per time bucket crossed with one business dimension.
 *
 * @param {Object} filters As above, plus:
 *   period  - DAY | WEEK | MONTH | YEAR | ALL
 *   groupBy - ROUTE | CUSTOMER | DRIVER | VEHICLE | CITY | NONE
 */
export const fetchSalesSummary = async (filters) => {
  const response = await apiClient.post('/reports/sales/summary', filters);
  return response.data;
};

export const REPORT_PERIODS = [
  { value: 'DAY', label: 'Daily' },
  { value: 'WEEK', label: 'Weekly' },
  { value: 'MONTH', label: 'Monthly' },
  { value: 'YEAR', label: 'Yearly' },
  { value: 'ALL', label: 'Whole range' }
];

export const REPORT_DIMENSIONS = [
  { value: 'CUSTOMER', label: 'Customer', master: 'customers', filterKey: 'customerId' },
  { value: 'ROUTE', label: 'Route', master: 'routes', filterKey: 'routeId' },
  { value: 'DRIVER', label: 'Driver', master: 'drivers', filterKey: 'driverId' },
  { value: 'VEHICLE', label: 'Vehicle', master: 'vehicles', filterKey: 'vehicleId' },
  { value: 'CITY', label: 'City', master: 'cities', filterKey: 'cityId' },
  { value: 'NONE', label: 'No breakdown', master: null, filterKey: null }
];

/**
 * Trip reconciliation: per vehicle load, birds out and what became of them,
 * weight and money back, what is still owed, and whether it balances.
 *
 * @param {Object} filters { startDate, endDate, routeId?, driverId?, vehicleId? }
 */
export const fetchTripReconciliation = async (filters) => {
  const response = await apiClient.post('/reports/sales/reconciliation', filters);
  return response.data;
};
