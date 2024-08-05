import axios from 'axios';
import { API_BASE_URL } from './../common/axiosConfig.js'

const getToken = () => localStorage.getItem('token');
export const getData = (type) => {
    return axios.get(`${API_BASE_URL}/user/${type}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
    });
};

export const createData = (type,id, data) => {
    return axios.post(`${API_BASE_URL}/user/${type}`, data, {
        headers: { Authorization: `Bearer ${getToken()}` }
    });
};

export const updateData = (type, id, data) => {
    return axios.put(`${API_BASE_URL}/user/${type}/${id}`, data, {
        headers: { Authorization: `Bearer ${getToken()}` }
    });
};

export const deleteData = (type, id) => {
    return axios.delete(`${API_BASE_URL}/user/${type}/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
    });
};