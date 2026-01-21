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
  Autocomplete,
  Card,
  CardContent,
  CardHeader,
  Divider,
  InputAdornment,
  Tooltip,
  Container
} from '@mui/material';
import { 
  Download as DownloadIcon,
  AccountBalanceWallet as LedgerIcon,
  Person as PersonIcon,
  CalendarToday as DateIcon,
  FilterList as FilterIcon,
  Assessment as ReportIcon
} from '@mui/icons-material';
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
        0: { cellWidth: 22 },
        1: { cellWidth: 25 },
        2: { cellWidth: 45 },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 20 }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { left: 15, right: 15 },
      didDrawPage: (data) => {
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
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Filter Card */}
      <Card elevation={3} sx={{ mb: 2, borderRadius: 2 }}>
        <CardHeader 
          avatar={<LedgerIcon />}
          title="Customer Ledger"
       
           sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                py: 1,
                '& .MuiCardHeader-title': { fontWeight: 600, fontSize: '0.9rem', color: 'white' }
              }}
        />
        <CardContent>
          <Grid container spacing={2}>
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
                    size="small"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <PersonIcon color="primary" />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
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
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DateIcon color="primary" />
                    </InputAdornment>
                  )
                }}
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
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DateIcon color="primary" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <Tooltip title="Apply filter to view ledger">
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleFilterApply}
                  disabled={!selectedCustomer || loading}
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <FilterIcon />}
                  size="small"
                  sx={{ height: '40px' }}
                >
                  {loading ? 'Loading...' : 'Apply'}
                </Button>
              </Tooltip>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Customer Info & Download Card */}
      {selectedCustomer && (
        <Card elevation={1} sx={{ mb: 1, bgcolor: 'background.default' }}>
          <CardContent>
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={12} sm={4}>
                <Box>
                  {/* <Typography variant="caption" color="text.secondary">Customer</Typography> */}
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>{selectedCustomer.name}</Typography>
                  <Typography variant="body1" color="text.secondary">{selectedCustomer.shopName}</Typography>
                  <Typography variant="body1" color="text.secondary">{selectedCustomer.mobileNo}</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={4} textAlign="center">
                <Typography variant="caption" color="text.secondary">Current Balance</Typography>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold',
                    color: currentBalance > 0 ? 'error.main' : currentBalance < 0 ? 'success.main' : 'text.primary'
                  }}
                >
                  {formatCurrency(Math.abs(currentBalance))}
                </Typography>
                <Chip 
                  label={currentBalance > 0 ? 'Debit (Dr)' : currentBalance < 0 ? 'Credit (Cr)' : 'Settled'}
                  color={currentBalance > 0 ? 'error' : currentBalance < 0 ? 'success' : 'default'}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Grid>

              <Grid item xs={12} sm={4} textAlign="right">
                <Tooltip title="Download ledger as PDF">
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<DownloadIcon />}
                    onClick={downloadLedgerPDF}
                    disabled={!ledgerData || ledgerData.length === 0}
                    size="large"
                    sx={{ minWidth: 180 }}
                  >
                    Download PDF
                  </Button>
                </Tooltip>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Ledger Data Card */}
      <Card elevation={3} sx={{ height: 'calc(100vh - 520px)', minHeight: 400, display: 'flex', flexDirection: 'column' }}>
        <CardHeader 
          avatar={<ReportIcon />}
          title="Transaction History"
          titleTypographyProps={{ variant: 'h6' }}
          sx={{ flexShrink: 0 }}
        />
        <Divider />
        <CardContent sx={{ p: 0, flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : ledgerData.length > 0 ? (
            <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Description</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Debit (Sale)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Credit (Payment)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Balance</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Mode</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ledgerData.map((entry) => (
                    <TableRow 
                      key={entry.id}
                      sx={{ 
                        bgcolor: entry.isBackdated ? 'warning.lighter' : 'inherit',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <TableCell>
                        {formatDate(entry.transactionDate)}
                        {entry.isBackdated && (
                          <Chip 
                            label="Backdated" 
                            size="small" 
                            color="warning" 
                            sx={{ ml: 1, height: 20 }} 
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
                      <TableCell align="right" sx={{ color: 'error.main', fontWeight: 500 }}>
                        {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 500 }}>
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
                      <TableCell>
                        {entry.paymentMode ? (
                          <Chip label={entry.paymentMode} size="small" variant="outlined" />
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : selectedCustomer ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <ReportIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No ledger entries found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This customer has no transactions in the selected period
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <PersonIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Select a customer to view ledger
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Use the filter above to choose a customer
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default CustomerLedgerView;
