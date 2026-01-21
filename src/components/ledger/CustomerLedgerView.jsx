import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Autocomplete
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { API_BASE_URL } from '../../config/axiosConfig';
import LedgerService from '../service/LedgerService';
import { getCompanyConfig } from '../../config/companyConfig';

const CustomerLedgerView = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const handleCustomerChange = (event, newValue) => {
    setSelectedCustomer(newValue);
    if (newValue) {
      fetchLedger(newValue.id, startDate, endDate);
    } else {
      setLedgerData([]);
    }
  };

  const fetchLedger = async (customerId, start, end) => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const data = await LedgerService.getCustomerLedger(customerId, start, end, token);
      setLedgerData(data);
    } catch (err) {
      setError('Failed to fetch ledger data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = () => {
    if (selectedCustomer) {
      fetchLedger(selectedCustomer.id, startDate, endDate);
    }
  };

  const getTransactionTypeColor = (type) => {
    switch (type) {
      case 'SALE':
        return 'error';
      case 'PAYMENT':
        return 'success';
      case 'OPENING_BALANCE':
        return 'default';
      case 'CREDIT_NOTE':
        return 'info';
      case 'DEBIT_NOTE':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const currentBalance = ledgerData.length > 0 ? ledgerData[ledgerData.length - 1].runningBalance : 0;

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Customer Ledger
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={customers}
              getOptionLabel={(option) => `${option.name} - ${option.shopName || ''}`}
              value={selectedCustomer}
              onChange={handleCustomerChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Customer"
                  placeholder="Search customer..."
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleFilterApply}
              disabled={!selectedCustomer || loading}
              sx={{ height: '56px' }}
            >
              Apply Filter
            </Button>
          </Grid>
        </Grid>

        {selectedCustomer && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Customer</Typography>
                <Typography variant="h6">{selectedCustomer.name}</Typography>
                <Typography variant="body2">{selectedCustomer.shopName}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} textAlign="right">
                <Typography variant="body2" color="text.secondary">Current Balance</Typography>
                <Typography 
                  variant="h4" 
                  color={currentBalance > 0 ? 'error.main' : currentBalance < 0 ? 'success.main' : 'text.primary'}
                >
                  {formatCurrency(Math.abs(currentBalance))}
                  {currentBalance > 0 && ' (Dr)'}
                  {currentBalance < 0 && ' (Cr)'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : ledgerData.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Debit (Sale)</TableCell>
                  <TableCell align="right">Credit (Payment)</TableCell>
                  <TableCell align="right">Balance</TableCell>
                  <TableCell>Payment Mode</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ledgerData.map((entry) => (
                  <TableRow 
                    key={entry.id}
                    sx={{ 
                      bgcolor: entry.isBackdated ? 'action.hover' : 'inherit',
                      '&:hover': { bgcolor: 'action.selected' }
                    }}
                  >
                    <TableCell>
                      {formatDate(entry.transactionDate)}
                      {entry.isBackdated && (
                        <Chip 
                          label="Backdated" 
                          size="small" 
                          color="warning" 
                          sx={{ ml: 1 }} 
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={entry.transactionType} 
                        color={getTransactionTypeColor(entry.transactionType)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : '-'}
                    </TableCell>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        fontWeight: 'bold',
                        color: entry.runningBalance > 0 ? 'error.main' : entry.runningBalance < 0 ? 'success.main' : 'text.primary'
                      }}
                    >
                      {formatCurrency(Math.abs(entry.runningBalance))}
                      {entry.runningBalance > 0 && ' Dr'}
                      {entry.runningBalance < 0 && ' Cr'}
                    </TableCell>
                    <TableCell>{entry.paymentMode || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : selectedCustomer ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No ledger entries found for this customer
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Please select a customer to view ledger
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default CustomerLedgerView;
