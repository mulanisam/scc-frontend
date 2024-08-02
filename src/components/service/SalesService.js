import axios from 'axios';

const API_BASE_URL = 'http://scc-backend-production.up.railway.app:8080'; // Replace with your API base URL

const getRoutes = () => axios.get(`${API_BASE_URL}/user/routes`);

const getDrivers = () => axios.get(`${API_BASE_URL}/user/drivers`);
const getVehicles = () => axios.get(`${API_BASE_URL}/user/vehicles`);

const getCustomersByRoute = (routeId) => axios.get(`${API_BASE_URL}/user/customers/byRoute/${routeId}`);

const createSalesEntry = (salesEntry) => axios.post(`${API_BASE_URL}/user/sales/bulk`, salesEntry);

export {
    getRoutes,
    getDrivers,
    getCustomersByRoute,
    createSalesEntry,
    getVehicles,
};
