import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  TextField,
  Grid,
  Button,
  MenuItem,
  IconButton,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Paper,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  CardHeader,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Clear as ClearIcon,
  Payment as PaymentIcon,
  AttachFile as AttachFileIcon,
  Calculate as CalculateIcon,
  LocalShipping as VehicleIcon,
  Person as DriverIcon,
  Business as SupplierIcon,
  LocationOn as BranchIcon,
  Agriculture as FarmIcon,
  SupervisorAccount as SupervisorIcon,
  Phone as PhoneIcon,
  LocalGasStation as DieselIcon,
  Build as HamaliIcon,
  MonetizationOn as ExpenseIcon
} from '@mui/icons-material';
import { fetchSuppliers, fetchVehicles, fetchDrivers, submitPurchase, fetchPurchaseDetails, submitPayment } from '../service/PurchaseService';

const PurchaseEntryPage = () => {
  const [tableRows, setTableRows] = useState([{ srNo: 1, dcNo: '', nos: '', kilograms: '', rate: '', amount: '' }]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  
  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().slice(0, 10),
    vehicle: '',
    driver: '',
    supplier: '',
    branch: '',
    farm: '',
    supervisorName: '',
    supervisorPhoneNo: '',
    driverExpense: '',
    diesel: '',
    hamali: '',
    dcDetails: tableRows
  });
  
  const [suppliers, setSuppliers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    dateOfPurchase: '',
    dateOfTransaction: '',
    trans_id: '',
    totalAmount: '',
    paidAmount: '',
    pendingPayment: '',
    comment: '',
    supplier: ''
  });

  const clearPaymentData = () => {
    setPaymentData({
      dateOfPurchase: '',
      dateOfTransaction: '',
      trans_id: '',
      totalAmount: '',
      paidAmount: '',
      pendingPayment: '',
      comment: '',
      supplier: ''
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppliersData, vehiclesData, driversData] = await Promise.all([
          fetchSuppliers(), 
          fetchVehicles(), 
          fetchDrivers()
        ]);
        setSuppliers(suppliersData);
        setVehicles(vehiclesData);
        setDrivers(driversData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setSnackbarMessage('Error fetching data: ' + error.message);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    };
    fetchData();
  }, []);

  const addRow = () => {
    const newRow = { srNo: tableRows.length + 1, dcNo: '', nos: '', kilograms: '', rate: '', amount: '' };
    setTableRows([...tableRows, newRow]);
  };

  const deleteRow = (index) => {
    if (tableRows.length === 1) return;
    const updatedRows = [...tableRows.slice(0, index), ...tableRows.slice(index + 1)];
    const reindexedRows = updatedRows.map((row, idx) => ({ ...row, srNo: idx + 1 }));
    setTableRows(reindexedRows);
    setFormData({ ...formData, dcDetails: reindexedRows });
  };

  const handleTableChange = (index, field, value) => {
    const updatedRows = [...tableRows];
    updatedRows[index][field] = value;
    if (field === 'rate' || field === 'kilograms') {
      const rate = parseFloat(updatedRows[index].rate) || 0;
      const kilograms = parseFloat(updatedRows[index].kilograms) || 0;
      updatedRows[index].amount = (rate * kilograms).toFixed(2);
    }
    setTableRows(updatedRows);
    setFormData({ ...formData, dcDetails: updatedRows });
  };

  const calculateTotalAmount = () => {
    const total = parseFloat(formData.driverExpense || 0) + parseFloat(formData.diesel || 0) + parseFloat(formData.hamali || 0);
    return isNaN(total) ? 0 : total;
  };

  const calculateTotal = (field) => {
    return tableRows.reduce((total, row) => total + (parseFloat(row[field]) || 0), 0);
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    const MAX_FILE_SIZE_MB = 5;
    const fileSizeInMB = selectedFile.size / (1024 * 1024);
    if (fileSizeInMB > MAX_FILE_SIZE_MB) {
      setSnackbarMessage(`File size exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB} MB.`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      event.target.value = null;
    } else {
      setFiles([...files, selectedFile]);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!formData.entryDate || !formData.vehicle || !formData.supplier || !formData.driver) {
      setSnackbarMessage('Date, Vehicle, Driver, and Supplier are mandatory fields.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setIsSubmitting(false);
      return;
    }

    if (tableRows.some(row => !row.nos || !row.kilograms)) {
      setSnackbarMessage('Quantity and Weight are mandatory in DC details.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setIsSubmitting(false);
      return;
    }

    const purchaseEntry = {
      entryDate: formData.entryDate,
      vehicle: formData.vehicle,
      driver: formData.driver,
      supplier: formData.supplier,
      branch: formData.branch,
      farm: formData.farm,
      supervisorName: formData.supervisorName,
      supervisorPhoneNo: formData.supervisorPhoneNo,
      driverExpense: formData.driverExpense,
      diesel: formData.diesel,
      hamali: formData.hamali,
      dcDetails: formData.dcDetails
    };

    const data = new FormData();
    data.append('purchaseEntry', JSON.stringify(purchaseEntry));
    files.forEach((file) => {
      data.append(`files`, file);
    });

    try {
      await submitPurchase(data);
      setSnackbarMessage('Purchase Entry created successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      handleClear();
    } catch (error) {
      console.error('Error creating purchase entry:', error);
      setSnackbarMessage('Error creating Purchase Entry: ' + (error.message || 'Unknown error'));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setFormData({
      entryDate: new Date().toISOString().slice(0, 10),
      vehicle: '',
      driver: '',
      supplier: '',
      branch: '',
      farm: '',
      supervisorName: '',
      supervisorPhoneNo: '',
      driverExpense: '',
      diesel: '',
      hamali: '',
      dcDetails: [{ srNo: 1, dcNo: '', nos: '', kilograms: '', rate: '', amount: '' }]
    });
    setTableRows([{ srNo: 1, dcNo: '', nos: '', kilograms: '', rate: '', amount: '' }]);
    setFiles([]);
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  const handleOpenPaymentDialog = () => {
    setPaymentDialogOpen(true);
  };

  const handleClosePaymentDialog = () => {
    clearPaymentData();
    setPaymentDialogOpen(false);
  };

  const handlePaymentChange = async (event) => {
    const { name, value } = event.target;
    const newPaymentData = { ...paymentData, [name]: value };

    if ((name === 'supplier' && newPaymentData.dateOfPurchase) || (name === 'dateOfPurchase' && newPaymentData.supplier)) {
      try {
        const purchaseDetails = await fetchPurchaseDetails(newPaymentData.supplier, newPaymentData.dateOfPurchase);
        newPaymentData.totalAmount = purchaseDetails.totalAmount || 0;
        newPaymentData.paidAmount = purchaseDetails.paidAmount || 0;
        newPaymentData.pendingPayment = (parseFloat(newPaymentData.totalAmount) - parseFloat(newPaymentData.paidAmount)).toFixed(2);
      } catch (error) {
        setSnackbarMessage('Error fetching purchase details.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } else {
      if (name === 'totalAmount' || name === 'paidAmount') {
        const totalAmount = parseFloat(newPaymentData.totalAmount) || 0;
        const paidAmount = parseFloat(newPaymentData.paidAmount) || 0;
        newPaymentData.pendingPayment = (totalAmount - paidAmount).toFixed(2);
      }
    }
    setPaymentData(newPaymentData);
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();
    
    try {
      await submitPayment(paymentData);
      setSnackbarMessage('Payment Entry created successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      clearPaymentData();
      setPaymentDialogOpen(false);
    } catch (error) {
      console.error('Error creating payment entry:', error);
      setSnackbarMessage('Error creating Payment Entry: ' + (error.message || 'Unknown error'));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* CSS to remove number input arrows */}
      <style>
        {`
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          
          input[type="number"] {
            -moz-appearance: textfield;
          }
        `}
      </style>

      {/* Fixed Form Section */}
      <Box sx={{ flexShrink: 0 }}>
        <Container maxWidth="xl" sx={{ py: 2 }}>
          {/* Purchase Information */}
          <Card elevation={3} sx={{ mb: 2, borderRadius: 2 }}>
            <CardHeader 
              title="Purchase Information" 
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                py: 1,
                '& .MuiCardHeader-title': { fontWeight: 600, fontSize: '0.9rem', color: 'white' }
              }}
            />
            <CardContent sx={{ py: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Entry Date"
                    type="date"
                    name="entryDate"
                    value={formData.entryDate}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    required
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <TextField 
                    select 
                    fullWidth 
                    label="Vehicle" 
                    name="vehicle" 
                    value={formData.vehicle} 
                    onChange={handleChange} 
                    required
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <VehicleIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  >
                    <MenuItem value=""><em>Select Vehicle</em></MenuItem>
                    {vehicles.map((vehicle) => (
                      <MenuItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicleNo}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField 
                    select 
                    fullWidth 
                    label="Driver" 
                    name="driver" 
                    value={formData.driver} 
                    onChange={handleChange} 
                    required
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DriverIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  >
                    <MenuItem value=""><em>Select Driver</em></MenuItem>
                    {drivers.map((driver) => (
                      <MenuItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField 
                    select 
                    fullWidth 
                    label="Supplier" 
                    name="supplier" 
                    value={formData.supplier} 
                    onChange={handleChange} 
                    required
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SupplierIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  >
                    <MenuItem value=""><em>Select Supplier</em></MenuItem>
                    {suppliers.map((supplier) => (
                      <MenuItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField 
                    fullWidth 
                    label="Branch" 
                    name="branch" 
                    value={formData.branch} 
                    onChange={handleChange}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BranchIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField 
                    fullWidth 
                    label="Farm" 
                    name="farm" 
                    value={formData.farm} 
                    onChange={handleChange}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FarmIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField 
                    fullWidth 
                    label="Supervisor Name" 
                    name="supervisorName" 
                    value={formData.supervisorName} 
                    onChange={handleChange}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SupervisorIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Supervisor Phone"
                    type="tel"
                    name="supervisorPhoneNo"
                    value={formData.supervisorPhoneNo}
                    onChange={handleChange}
                    inputProps={{ maxLength: 10, pattern: "[0-9]{10}" }}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Expenses Section */}
          <Card elevation={3} sx={{ mb: 2, borderRadius: 2 }}>
            <CardHeader 
              title="Expenses" 
              sx={{ 
                bgcolor: 'primary.main',
                color: 'white',
                py: 1,
                '& .MuiCardHeader-title': { fontWeight: 600, fontSize: '0.9rem', color: 'white' }
              }}
            />
            <CardContent sx={{ py: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField 
                    fullWidth
                    label="Driver Expense" 
                    type="number" 
                    name="driverExpense" 
                    value={formData.driverExpense} 
                    onChange={handleChange}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <ExpenseIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField 
                    fullWidth
                    label="Diesel Amount" 
                    type="number" 
                    name="diesel" 
                    value={formData.diesel} 
                    onChange={handleChange}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DieselIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField 
                    fullWidth
                    label="Hamali Amount" 
                    type="number" 
                    name="hamali" 
                    value={formData.hamali} 
                    onChange={handleChange}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <HamaliIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>

                {/* Total Expenses moved here - same height, no background */}
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ 
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    pl: 2
                  }}>
                    <Typography variant="body1" sx={{ 
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: 'text.primary'
                    }}>
                      Total: ₹{calculateTotalAmount().toFixed(2)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Container>
      </Box>

      {/* Scrollable DC Details Section */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="xl" sx={{ height: '100%', pb: 1 }}>
          <Card elevation={3} sx={{ height: '100%', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
            <CardHeader 
              title="DC Details" 
              action={
                <IconButton onClick={addRow} color="inherit" size="small">
                  <AddIcon />
                </IconButton>
              }
              sx={{ 
                bgcolor: 'primary.main',
                color: 'white',
                py: 1,
                flexShrink: 0,
                '& .MuiCardHeader-title': { fontWeight: 600, fontSize: '0.9rem', color: 'white' }
              }}
            />
            
            {/* Scrollable Table */}
            <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {['Sr No', 'DC No', 'Quantity', 'Weight (kg)', 'Rate', 'Amount', 'DC File', 'Action'].map(header => (
                      <TableCell 
                        key={header} 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: '#f5f5f5',
                          whiteSpace: 'nowrap',
                          py: 1,
                          fontSize: '0.85rem'
                        }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.map((row, index) => (
                    <TableRow 
                      key={index} 
                      hover
                      sx={{ '& td': { py: 0.5 } }}
                    >
                      <TableCell sx={{ fontSize: '0.85rem' }}>{row.srNo}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          value={row.dcNo}
                          onChange={(e) => handleTableChange(index, 'dcNo', e.target.value)}
                          required
                          inputProps={{ style: { fontSize: '0.85rem', padding: '4px 8px' } }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          type="number"
                          value={row.nos}
                          onChange={(e) => handleTableChange(index, 'nos', e.target.value)}
                          required
                          inputProps={{ style: { fontSize: '0.85rem', padding: '4px 8px' } }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          type="number"
                          step="0.01"
                          value={row.kilograms}
                          onChange={(e) => handleTableChange(index, 'kilograms', e.target.value)}
                          required
                          inputProps={{ style: { fontSize: '0.85rem', padding: '4px 8px' } }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          type="number"
                          step="0.01"
                          value={row.rate}
                          onChange={(e) => handleTableChange(index, 'rate', e.target.value)}
                          required
                          inputProps={{ style: { fontSize: '0.85rem', padding: '4px 8px' } }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
                        ₹{row.amount}
                      </TableCell>
                      <TableCell>
                        <IconButton component="label" color="primary" size="small">
                          <AttachFileIcon />
                          <input 
                            type="file" 
                            accept=".jpg,.jpeg,.png,.pdf,.txt" 
                            onChange={handleFileChange}
                            hidden
                          />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        {index === 0 ? (
                          <IconButton onClick={addRow} color="success" size="small">
                            <AddIcon />
                          </IconButton>
                        ) : (
                          <IconButton onClick={() => deleteRow(index)} color="error" size="small">
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Fixed Totals Row */}
            <Box sx={{ 
              borderTop: '2px solid #e0e0e0', 
              bgcolor: 'primary.main',
              flexShrink: 0 
            }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={2} sx={{ 
                      fontWeight: 'bold', 
                      color: 'white', 
                      py: 1,
                      bgcolor: 'primary.main',
                      border: 'none'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalculateIcon />
                        TOTALS
                      </Box>
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold', 
                      color: 'white',
                      bgcolor: 'primary.main',
                      border: 'none'
                    }}>
                      {calculateTotal('nos').toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold', 
                      color: 'white',
                      bgcolor: 'primary.main',
                      border: 'none'
                    }}>
                      {calculateTotal('kilograms').toFixed(2)} kg
                    </TableCell>
                    <TableCell sx={{ bgcolor: 'primary.main', border: 'none' }}></TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold', 
                      color: 'white',
                      bgcolor: 'primary.main',
                      border: 'none'
                    }}>
                      ₹{calculateTotal('amount').toFixed(2)}
                    </TableCell>
                    <TableCell colSpan={2} sx={{ bgcolor: 'primary.main', border: 'none' }}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Card>
        </Container>
      </Box>

      {/* Fixed Action Buttons */}
      <Box sx={{ flexShrink: 0, borderTop: '1px solid #e0e0e0', bgcolor: 'white' }}>
        <Container maxWidth="xl">
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 2, 
            justifyContent: 'center',
            py: 2
          }}>
            <Button 
              variant="contained" 
              color="primary" 
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              size="large"
              sx={{ minWidth: 150 }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
            
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={handleClear}
              disabled={isSubmitting}
              startIcon={<ClearIcon />}
              size="large"
              sx={{ minWidth: 120 }}
            >
              Clear
            </Button>
            
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleOpenPaymentDialog}
              startIcon={<PaymentIcon />}
              size="large"
              sx={{ minWidth: 150 }}
            >
              Payment Details
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
          elevation={6}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Payment Dialog */}
      <Dialog 
        open={paymentDialogOpen} 
        onClose={handleClosePaymentDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 600 }}>
          Payment Details
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <DialogContentText sx={{ mb: 3 }}>
            Please fill in the payment details for the purchase transaction.
          </DialogContentText>
          <form onSubmit={handlePaymentSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Supplier"
                  select
                  fullWidth
                  name="supplier"
                  value={paymentData.supplier}
                  onChange={handlePaymentChange}
                  required
                >
                  <MenuItem value=""><em>Select Supplier</em></MenuItem>
                  {suppliers.map((supplier) => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date of Purchase"
                  type="date"
                  name="dateOfPurchase"
                  value={paymentData.dateOfPurchase}
                  onChange={handlePaymentChange}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date of Transaction"
                  type="date"
                  name="dateOfTransaction"
                  value={paymentData.dateOfTransaction}
                  onChange={handlePaymentChange}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Transaction ID"
                  name="trans_id"
                  value={paymentData.trans_id}
                  onChange={handlePaymentChange}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Total Amount"
                  type="number"
                  name="totalAmount"
                  value={paymentData.totalAmount}
                  onChange={handlePaymentChange}
                  required
                  fullWidth
                  InputProps={{ startAdornment: '₹' }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Paid Amount"
                  type="number"
                  name="paidAmount"
                  value={paymentData.paidAmount}
                  onChange={handlePaymentChange}
                  required
                  fullWidth
                  InputProps={{ startAdornment: '₹' }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Pending Payment"
                  type="number"
                  name="pendingPayment"
                  value={paymentData.pendingPayment}
                  onChange={handlePaymentChange}
                  required
                  fullWidth
                  InputProps={{ readOnly: true, startAdornment: '₹' }}
                  sx={{ bgcolor: '#f9f9f9' }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Comment"
                  name="comment"
                  value={paymentData.comment}
                  onChange={handlePaymentChange}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Enter any payment related notes..."
                />
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handlePaymentSubmit}
            startIcon={<SaveIcon />}
          >
            Submit Payment
          </Button>
          <Button 
            variant="outlined" 
            color="warning" 
            onClick={clearPaymentData}
            startIcon={<ClearIcon />}
          >
            Clear
          </Button>
          <Button 
            variant="outlined" 
            color="error" 
            onClick={handleClosePaymentDialog}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseEntryPage;
