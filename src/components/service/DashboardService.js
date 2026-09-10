import apiClient from './api.js';

// ===== Common Error Logger =====
const logApiError = (error, context) => {
  console.error(`Dashboard API Error (${context}):`, error);
};

// ===== 1. Dashboard Summary =====
export const fetchDashboardData = async (date) => {
  try {
    const response = await apiClient.get('/dashboard/data', {
      params: date ? { date } : {},
    });
    return response.data;
  } catch (error) {
    logApiError(error, 'fetchDashboardData');
    throw error;
  }
};

// ===== 2. Route-wise Metrics =====
export const fetchRouteWiseData = async (date) => {
  try {
    const response = await apiClient.get('/dashboard/route-wise', {
      params: date ? { date } : {},
    });
    return response.data;
  } catch (error) {
    logApiError(error, 'fetchRouteWiseData');
    throw error;
  }
};

// ===== 3. High Balance Customers (No Date Needed) =====
export const fetchHighBalanceCustomers = async () => {
  try {
    const response = await apiClient.get('/dashboard/high-balance-customers');
    return response.data;
  } catch (error) {
    logApiError(error, 'fetchHighBalanceCustomers');
    throw error;
  }
};

// ===== 4. Route-wise Pending Chart =====
export const fetchRoutePending = async (date) => {
  try {
    const response = await apiClient.get('/dashboard/route-pending', {
      params: date ? { date } : {},
    });
    return response.data;
  } catch (error) {
    logApiError(error, 'fetchRoutePending');
    throw error;
  }
};

// ===== Optional: Combined Fetch (Performance Optimized) =====
export const fetchDashboardAll = async (date) => {
  try {
    const [dashboard, routes, customers, pending] = await Promise.all([
      fetchDashboardData(date),
      fetchRouteWiseData(date),
      fetchHighBalanceCustomers(),
      fetchRoutePending(date),
    ]);

    return {
      metrics: dashboard,
      routeData: routes,
      customers,
      routePending: pending,
    };
  } catch (error) {
    logApiError(error, 'fetchDashboardAll');
    throw error;
  }
};

// ===== Default Export =====
const DashboardService = {
  fetchDashboardData,
  fetchRouteWiseData,
  fetchHighBalanceCustomers,
  fetchRoutePending,
  fetchDashboardAll,
};

export default DashboardService;
