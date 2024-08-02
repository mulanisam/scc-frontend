import axios from 'axios';

const API_BASE_URL = 'http://scc-backend-production.up.railway.app:8080';

export const fetchSuppliers = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/user/suppliers`);
    return response.data;
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    throw error;
  }
};

export const fetchVehicles = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/user/vehicles`);
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
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting purchase entry:', error);
    throw error;
  }
};

export const fetchDrivers = async () => {
    const response = await axios.get(`${API_BASE_URL}/user/drivers`);
    return response.data;
  };
