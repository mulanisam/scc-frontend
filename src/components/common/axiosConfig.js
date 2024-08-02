// src/axiosConfig.js
import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'scc-backend-production.up.railway.app:8080',
});

export default axiosInstance;
