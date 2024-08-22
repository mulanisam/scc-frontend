import axios from 'axios';
import { API_BASE_URL } from './../common/axiosConfig.js';

const getToken = () => localStorage.getItem('token');

// Fetch report data based on selected parameters
export const fetchReportData = async (reportRequest) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/reports/fetch`, reportRequest, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching report data:', error);
      throw error;
    }
  };

// Download report in PDF format
export const downloadReportPDF = async (reportType, subType, startDate, endDate) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/reports/download/pdf`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        reportType,
        subType,
        startDate,
        endDate,
      },
      responseType: 'blob', // Important for downloading files
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'report.pdf');
    document.body.appendChild(link);
    link.click();
  } catch (error) {
    console.error('Error downloading PDF report:', error);
    throw error;
  }
};

// Download report in Excel format
export const downloadReportExcel = async (reportType, subType, startDate, endDate) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/reports/download/excel`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        reportType,
        subType,
        startDate,
        endDate,
      },
      responseType: 'blob', // Important for downloading files
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'report.xlsx');
    document.body.appendChild(link);
    link.click();
  } catch (error) {
    console.error('Error downloading Excel report:', error);
    throw error;
  }
};
