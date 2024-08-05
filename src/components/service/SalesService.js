import axios from 'axios';
import { API_BASE_URL } from './../common/axiosConfig.js'

const getToken = () => localStorage.getItem('token');

const getRoutes = () => {
  return axios.get(`${API_BASE_URL}/user/routes`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
};

const getDrivers = () => {
  return axios.get(`${API_BASE_URL}/user/drivers`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
};

const getVehicles = () => {
  return axios.get(`${API_BASE_URL}/user/vehicles`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
};

const getCustomersByRoute = (routeId) => {
  return axios.get(`${API_BASE_URL}/user/customers/byRoute/${routeId}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
};

const createSalesEntry = (salesEntry) => {
  return axios.post(`${API_BASE_URL}/user/sales/bulk`, salesEntry, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`
    }
  });
};

export {
  getRoutes,
  getDrivers,
  getCustomersByRoute,
  createSalesEntry,
  getVehicles
};
