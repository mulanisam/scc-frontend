import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  MenuItem,
  Alert,
  CircularProgress,
  Autocomplete
} from '@mui/material';
import axios from 'axios';
import { API_BASE_URL } from '../../config/axiosConfig';
import PaymentService from '../service/PaymentService';

const PaymentEntry = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [formData, setFormData] = useState({
    customerId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMode: 'CASH',
    transactionReference: '',
    remarks: '',
    receivedBy: localStorage.getItem('username') || 'Admin'
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/user/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data);
    } catch (err) {
      setError('Failed to load customers');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomerChange = (event, newValue) => {
    setSelectedCustomer(newValue);
    setFormData(prev => ({ 
      ...prev, 
      customerId: newValue ? newValue.id : '' 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const paymentData = {
        customerId: parseInt(formData.customerId),
        paymentDate: formData.paymentDate,
        amount: parseFloat(formData.amount),
        paymentMode: formData.paymentMode,
        transactionReference: formData.transactionReference,
        remarks: formData.remarks,
        receivedBy: formData.receivedBy
      };

      await PaymentService.createPayment(paymentData, token);
      setSuccess(`Payment of ₹${formData.amount} recorded successfully for ${selectedCustomer?.name}!`);
      
      // Reset form
      setFormData({
        customerId: '',
        paymentDate: new Date().toISOString().split('T')[0],
        amount: '',
        paymentMode: 'CASH',
        transactionReference: '',
        remarks: '',
        receivedBy: localStorage.getItem('username') || 'Admin'
      });
      setSelectedCustomer(null);
    } catch (err) {
      setError(err.response?.data || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Payment Entry
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Record customer payment independent of sales
        </Typography>

        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Payment Date"
                type="date"
                name="paymentDate"
                value={formData.paymentDate}
                onChange={handleChange}
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={customers}
                getOptionLabel={(option) => `${option.name} - ${option.shopName || ''} (Balance: ₹${option.balanceAmount || 0})`}
                value={selectedCustomer}
                onChange={handleCustomerChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Customer"
                    required
                    placeholder="Search customer..."
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                inputProps={{ step: "0.01", min: "0" }}
                helperText={selectedCustomer ? `Current Balance: ₹${selectedCustomer.balanceAmount || 0}` : ''}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Payment Mode"
                name="paymentMode"
                value={formData.paymentMode}
                onChange={handleChange}
                required
              >
                <MenuItem value="CASH">Cash</MenuItem>
                <MenuItem value="UPI">UPI</MenuItem>
                <MenuItem value="CHEQUE">Cheque</MenuItem>
                <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                <MenuItem value="CARD">Card</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Transaction Reference"
                name="transactionReference"
                value={formData.transactionReference}
                onChange={handleChange}
                placeholder="UPI ID, Cheque No, etc."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Received By"
                name="receivedBy"
                value={formData.receivedBy}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Remarks"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                multiline
                rows={2}
                placeholder="Additional notes..."
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={loading}
                fullWidth
              >
                {loading ? <CircularProgress size={24} /> : 'Record Payment'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default PaymentEntry;
