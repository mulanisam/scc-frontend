import axios from 'axios';
import { API_BASE_URL } from '../../config/axiosConfig.js';

// Get authentication token
const getToken = () => localStorage.getItem('token');

// Get common headers for API requests
const getHeaders = () => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json'
});

// Handle API errors consistently
const handleApiError = (error, context) => {
    console.error(`Dashboard API Error (${context}):`, error);
    
    if (error.response) {
        // Server responded with error status
        const { status, data } = error.response;
        switch (status) {
            case 401:
                // Unauthorized - redirect to login
                localStorage.removeItem('token');
                window.location.href = '/login';
                throw new Error('Session expired. Please login again.');
            case 403:
                throw new Error('Access denied. Insufficient permissions.');
            case 404:
                throw new Error('Dashboard data not found.');
            case 500:
                throw new Error('Server error. Please try again later.');
            default:
                throw new Error(data?.message || `API Error: ${status}`);
        }
    } else if (error.request) {
        // Network error
        throw new Error('Network error. Please check your connection.');
    } else {
        // Other error
        throw new Error(error.message || 'An unexpected error occurred.');
    }
};

/**
 * Fetch dashboard metrics for a specific date
 * @param {string} date - Date in YYYY-MM-DD format (optional, defaults to today)
 * @returns {Promise<Object>} Dashboard metrics data
 */
export const fetchDashboardData = async (date) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/dashboard/data`, {
            headers: getHeaders(),
            params: date ? { date } : {},
            timeout: 10000 // 10 second timeout
        });
        
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetchDashboardData');
    }
};

/**
 * Fetch dashboard data for a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Object>} Dashboard metrics data for date range
 */
export const fetchDashboardDataRange = async (startDate, endDate) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/dashboard/data/range`, {
            headers: getHeaders(),
            params: { startDate, endDate },
            timeout: 15000 // 15 second timeout for range queries
        });
        
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetchDashboardDataRange');
    }
};

/**
 * Fetch top performing routes for dashboard
 * @param {string} date - Date in YYYY-MM-DD format (optional)
 * @param {number} limit - Number of top routes to fetch (default: 5)
 * @returns {Promise<Array>} Top performing routes data
 */
export const fetchTopRoutes = async (date, limit = 5) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/dashboard/top-routes`, {
            headers: getHeaders(),
            params: { 
                date,
                limit
            },
            timeout: 10000
        });
        
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetchTopRoutes');
    }
};

/**
 * Fetch top customers for dashboard
 * @param {string} date - Date in YYYY-MM-DD format (optional)
 * @param {number} limit - Number of top customers to fetch (default: 5)
 * @returns {Promise<Array>} Top customers data
 */
export const fetchTopCustomers = async (date, limit = 5) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/dashboard/top-customers`, {
            headers: getHeaders(),
            params: { 
                date,
                limit
            },
            timeout: 10000
        });
        
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetchTopCustomers');
    }
};

/**
 * Fetch sales trends for chart display
 * @param {number} days - Number of days to fetch trends for (default: 7)
 * @returns {Promise<Array>} Sales trends data
 */
export const fetchSalesTrends = async (days = 7) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/dashboard/trends`, {
            headers: getHeaders(),
            params: { days },
            timeout: 10000
        });
        
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetchSalesTrends');
    }
};

/**
 * Fetch real-time dashboard updates
 * @returns {Promise<Object>} Real-time metrics
 */
export const fetchRealTimeUpdates = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/dashboard/realtime`, {
            headers: getHeaders(),
            timeout: 5000 // Shorter timeout for real-time data
        });
        
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetchRealTimeUpdates');
    }
};

/**
 * Fetch dashboard summary with all metrics
 * @param {string} date - Date in YYYY-MM-DD format (optional)
 * @returns {Promise<Object>} Complete dashboard summary
 */
export const fetchDashboardSummary = async (date) => {
    try {
        const [
            dashboardData,
            topRoutes,
            topCustomers,
            salesTrends
        ] = await Promise.allSettled([
            fetchDashboardData(date),
            fetchTopRoutes(date, 3),
            fetchTopCustomers(date, 3),
            fetchSalesTrends(7)
        ]);

        return {
            metrics: dashboardData.status === 'fulfilled' ? dashboardData.value : null,
            topRoutes: topRoutes.status === 'fulfilled' ? topRoutes.value : [],
            topCustomers: topCustomers.status === 'fulfilled' ? topCustomers.value : [],
            trends: salesTrends.status === 'fulfilled' ? salesTrends.value : [],
            errors: [
                dashboardData.status === 'rejected' ? dashboardData.reason : null,
                topRoutes.status === 'rejected' ? topRoutes.reason : null,
                topCustomers.status === 'rejected' ? topCustomers.reason : null,
                salesTrends.status === 'rejected' ? salesTrends.reason : null
            ].filter(Boolean)
        };
    } catch (error) {
        handleApiError(error, 'fetchDashboardSummary');
    }
};

/**
 * Export dashboard data to CSV
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Blob>} CSV file blob
 */
export const exportDashboardData = async (date) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/dashboard/export`, {
            headers: getHeaders(),
            params: { date },
            responseType: 'blob',
            timeout: 30000 // 30 second timeout for exports
        });
        
        return response.data;
    } catch (error) {
        handleApiError(error, 'exportDashboardData');
    }
};

/**
 * Utility function to format date for API calls
 * @param {Date|string} date - Date object or string
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
export const formatDateForApi = (date) => {
    if (!date) return new Date().toISOString().slice(0, 10);
    
    if (typeof date === 'string') {
        return new Date(date).toISOString().slice(0, 10);
    }
    
    return date.toISOString().slice(0, 10);
};

/**
 * Get date range for common periods
 * @param {string} period - 'today', 'week', 'month', 'year'
 * @returns {Object} Start and end dates
 */
export const getDateRange = (period) => {
    const today = new Date();
    const ranges = {
        today: {
            start: formatDateForApi(today),
            end: formatDateForApi(today)
        },
        week: {
            start: formatDateForApi(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)),
            end: formatDateForApi(today)
        },
        month: {
            start: formatDateForApi(new Date(today.getFullYear(), today.getMonth(), 1)),
            end: formatDateForApi(today)
        },
        year: {
            start: formatDateForApi(new Date(today.getFullYear(), 0, 1)),
            end: formatDateForApi(today)
        }
    };
    
    return ranges[period] || ranges.today;
};

// Default export for backward compatibility
export default {
    fetchDashboardData,
    fetchDashboardDataRange,
    fetchTopRoutes,
    fetchTopCustomers,
    fetchSalesTrends,
    fetchRealTimeUpdates,
    fetchDashboardSummary,
    exportDashboardData,
    formatDateForApi,
    getDateRange
};
