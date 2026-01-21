import axios from "axios";
import { API_BASE_URL } from '../../config/axiosConfig.js';

class LedgerService {
    
    /**
     * Get customer ledger with optional date range
     */
    static async getCustomerLedger(customerId, startDate, endDate, token) {
        try {
            let url = `${API_BASE_URL}/user/ledger/customer/${customerId}`;
            const params = new URLSearchParams();
            
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }
            
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Get customer's current balance from ledger
     */
    static async getCurrentBalance(customerId, token) {
        try {
            const ledger = await this.getCustomerLedger(customerId, null, null, token);
            if (ledger && ledger.length > 0) {
                return ledger[ledger.length - 1].runningBalance;
            }
            return 0;
        } catch (err) {
            throw err;
        }
    }
}

export default LedgerService;
