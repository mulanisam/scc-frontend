import axios from "axios";
import { API_BASE_URL } from '../../config/axiosConfig.js';

class PaymentService {
    
    /**
     * Create a new payment entry
     */
    static async createPayment(paymentData, token) {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/user/payments`, 
                paymentData,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            return response.data;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Get all payments for a customer
     */
    static async getCustomerPayments(customerId, token) {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/user/payments/customer/${customerId}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            return response.data;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Get payments by date range
     */
    static async getPaymentsByDateRange(startDate, endDate, token) {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/user/payments/date-range`,
                {
                    params: { startDate, endDate },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            return response.data;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Get payment by ID
     */
    static async getPaymentById(paymentId, token) {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/user/payments/${paymentId}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            return response.data;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Delete payment
     */
    static async deletePayment(paymentId, token) {
        try {
            const response = await axios.delete(
                `${API_BASE_URL}/user/payments/${paymentId}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            return response.data;
        } catch (err) {
            throw err;
        }
    }
}

export default PaymentService;
