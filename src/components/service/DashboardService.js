import apiClient from './api.js';

/**
 * Dashboard data access.
 *
 * One call. The previous version exported four fetchers and a fetchDashboardAll
 * that ran them through Promise.all - but /dashboard/route-wise,
 * /dashboard/high-balance-customers and /dashboard/route-pending have never
 * existed on the server, so any use of fetchDashboardAll rejected on the first
 * 404 and took the working call down with it. /dashboard/overview carries
 * everything those three were meant to provide.
 */

/**
 * Everything the dashboard shows, for one date.
 *
 * @param {string} [date] ISO date; omitted means today. The server honours it -
 *   the old /dashboard/data ignored the date and always answered for today, which
 *   is why the date picker appeared to do nothing.
 */
export const fetchDashboardOverview = async (date) => {
  const response = await apiClient.get('/dashboard/overview', {
    params: date ? { date } : {}
  });
  return response.data;
};

/** The original seven today-only figures. Kept only for backwards compatibility. */
export const fetchDashboardData = async () => {
  const response = await apiClient.get('/dashboard/data');
  return response.data;
};

const DashboardService = {
  fetchDashboardOverview,
  fetchDashboardData
};

export default DashboardService;
