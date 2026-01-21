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

  const downloadLedgerPDF = () => {
    if (!selectedCustomer || ledgerData.length === 0) {
      alert('No data to download');
      return;
    }

    const companyConfig = getCompanyConfig();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Company Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(companyConfig.name, pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(companyConfig.address, pageWidth / 2, 22, { align: 'center' });
    
    doc.setFontSize(9);
    doc.text(`Phone: ${companyConfig.contactNumber} | Email: ${companyConfig.email}`, pageWidth / 2, 28, { align: 'center' });
    
    // Document Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER LEDGER REPORT', pageWidth / 2, 38, { align: 'center' });
    
    // Line separator
    doc.setLineWidth(0.5);
    doc.line(15, 41, pageWidth - 15, 41);
    
    // Customer Details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Details:', 15, 48);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${selectedCustomer.name}`, 15, 54);
    doc.text(`Shop: ${selectedCustomer.shopName || 'N/A'}`, 15, 60);
    doc.text(`Mobile: ${selectedCustomer.mobileNo || 'N/A'}`, 15, 66);
    
    // Period
    const periodText = startDate && endDate 
      ? `Period: ${formatDate(startDate)} to ${formatDate(endDate)}`
      : 'Period: All Transactions';
    doc.text(periodText, pageWidth - 15, 54, { align: 'right' });
    
    // Current Balance
    doc.setFont('helvetica', 'bold');
    const balanceColor = currentBalance > 0 ? [220, 38, 38] : currentBalance < 0 ? [46, 125, 50] : [0, 0, 0];
    doc.setTextColor(...balanceColor);
    doc.text(`Current Balance: ${formatCurrency(Math.abs(currentBalance))} ${currentBalance > 0 ? '(Dr)' : currentBalance < 0 ? '(Cr)' : ''}`, pageWidth - 15, 60, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    
    // Prepare table data
    const tableData = ledgerData.map(entry => [
      formatDate(entry.transactionDate),
      entry.transactionType,
      entry.description || '-',
      entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : '-',
      entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : '-',
      formatCurrency(Math.abs(entry.runningBalance)) + (entry.runningBalance > 0 ? ' Dr' : entry.runningBalance < 0 ? ' Cr' : ''),
      entry.paymentMode || '-'
    ]);
    
    // Add table
    doc.autoTable({
      startY: 72,
      head: [['Date', 'Type', 'Description', 'Debit', 'Credit', 'Balance', 'Mode']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 22 }, // Date
        1: { cellWidth: 25 }, // Type
        2: { cellWidth: 45 }, // Description
        3: { cellWidth: 25, halign: 'right' }, // Debit
        4: { cellWidth: 25, halign: 'right' }, // Credit
        5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }, // Balance
        6: { cellWidth: 20 } // Mode
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { left: 15, right: 15 },
      didDrawPage: (data) => {
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        doc.text(
          `Generated on: ${new Date().toLocaleString('en-IN')}`,
          15,
          pageHeight - 10
        );
        doc.text(
          companyConfig.website,
          pageWidth - 15,
          pageHeight - 10,
          { align: 'right' }
        );
      }
    });
    
    // Summary box at the end
    const finalY = doc.lastAutoTable.finalY + 10;
    
    // Calculate totals
    const totalDebit = ledgerData.reduce((sum, entry) => sum + entry.debitAmount, 0);
    const totalCredit = ledgerData.reduce((sum, entry) => sum + entry.creditAmount, 0);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary:', 15, finalY);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Debit (Sales): ${formatCurrency(totalDebit)}`, 15, finalY + 7);
    doc.text(`Total Credit (Payments): ${formatCurrency(totalCredit)}`, 15, finalY + 13);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...balanceColor);
    doc.text(`Net Balance: ${formatCurrency(Math.abs(currentBalance))} ${currentBalance > 0 ? '(Dr)' : currentBalance < 0 ? '(Cr)' : ''}`, 15, finalY + 19);
    doc.setTextColor(0, 0, 0);
    
    // Save PDF
    const fileName = `Ledger_${selectedCustomer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
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
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={5}>
                <Typography variant="body2" color="text.secondary">Customer</Typography>
                <Typography variant="h6">{selectedCustomer.name}</Typography>
                <Typography variant="body2">{selectedCustomer.shopName}</Typography>
              </Grid>
              <Grid item xs={12} sm={4} textAlign="right">
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
              <Grid item xs={12} sm={3} textAlign="right">
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<DownloadIcon />}
                  onClick={downloadLedgerPDF}
                  disabled={!ledgerData || ledgerData.length === 0}
                  fullWidth
                  sx={{ height: '48px' }}
                >
                  Download PDF
                </Button>
              </Grid>
            </Grid>
          </Box>
        )} 
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
