import axios from 'axios';
import { API_BASE_URL } from '../../config/axiosConfig.js'

const getToken = () => localStorage.getItem('token');

export const fetchSuppliers = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/user/suppliers`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    throw error;
  }
};
export const fetchVehicles = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/user/vehicles`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    throw error;
  }
};

export const submitPurchase = async (formData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/user/purchases`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${getToken()}`
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting purchase entry:', error);
    throw error;
  }
};
export const submitPayment= async (formData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/user/purchases/payment`, formData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting payment entry:', error);
    throw error;
  }
};

export const fetchDrivers = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/user/drivers`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching drivers:', error);
    throw error;
  }
};
/*
 * The payables reports.
 *
 * Under /adminuser, like the customer and trading ledgers - office staff are the people who
 * answer a supplier asking what is outstanding, and until now nothing showed it.
 */
const REPORTS = '/adminuser/purchases';

const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });

/**
 * Every supplier with what is still owed them, most owed first.
 *
 * The date range bounds what was bought and paid inside it. The outstanding column is always
 * current, because what we owe is not a question about a date range.
 */
export const fetchPayables = async ({ from, to } = {}) => {
  const response = await axios.get(`${API_BASE_URL}${REPORTS}/payables`, {
    headers: authHeader(),
    params: { from: from || undefined, to: to || undefined }
  });
  return response.data ?? [];
};

/** One supplier's ledger and the purchases behind it, with their DC lines. */
export const fetchSupplierAccount = async (supplierId, { from, to } = {}) => {
  const response = await axios.get(`${API_BASE_URL}${REPORTS}/suppliers/${supplierId}`, {
    headers: authHeader(),
    params: { from: from || undefined, to: to || undefined }
  });
  return response.data;
};

export const fetchPurchaseDetails = async (supplierId, purchaseDate) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/user/purchases/getDetails`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        supplierId: supplierId,
        entryDate: purchaseDate
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching purchase details:', error);
    throw error;
  }
};
