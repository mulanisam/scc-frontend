import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080'; // Replace with your actual API URL

export const getData = (type) => {
    return axios.get(`${API_BASE_URL}/user/${type}`);
};

export const createData = (type, data) => {
    return axios.post(`${API_BASE_URL}/user/${type}`, data);
};

export const updateData = (type, id, data) => {
    return axios.put(`${API_BASE_URL}/user/${type}/${id}`, data);
};

export const deleteData = (type, id) => {
    return axios.delete(`${API_BASE_URL}/user/${type}/${id}`);
};
