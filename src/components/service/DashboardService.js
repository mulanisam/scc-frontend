import axios from 'axios';
import { API_BASE_URL } from './../common/axiosConfig.js';

const getToken = () => localStorage.getItem('token');

export const fetchDashboardData = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/dashboard/data`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
};
