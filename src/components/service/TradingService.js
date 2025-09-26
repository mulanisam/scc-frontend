import axios from 'axios';
import { API_BASE_URL } from './../common/axiosConfig.js';

const getToken = () => localStorage.getItem('token');

// Fetch list of parties
const getParties = () => {
  return axios.get(`${API_BASE_URL}/user/parties`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
};

// Fetch list of vendors
const getSuppliers = () => {
  return axios.get(`${API_BASE_URL}/user/suppliers`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
};

// Fetch vehicles filtered by party id
const getVehiclesByParty = (partyId) => {
  return axios.get(`${API_BASE_URL}/user/partyVehicles/party/${partyId}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
};

// Fetch balance amount for a specific party and vendor
const getBalanceAmount = (partyId, vendorId) => {
  return axios.get(`${API_BASE_URL}/user/balanceAmount`, {
    params: { partyId, vendorId },
    headers: { Authorization: `Bearer ${getToken()}` }
  });
};

// Create sales entry
const createSalesEntry = (salesEntry) => {
  return axios.post(`${API_BASE_URL}/user/sales/bulk`, salesEntry, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`
    }
  });
};

// Create payment entry
const createPaymentEntry = (paymentEntry) => {
  return axios.post(`${API_BASE_URL}/user/payments`, paymentEntry, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`
    }
  });
};

export {
  getParties,
  getSuppliers,
  getVehiclesByParty,
  getBalanceAmount,
  createSalesEntry,
  createPaymentEntry
};
