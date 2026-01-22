import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Snackbar,
  Alert,
  FormControlLabel,
  Checkbox,
  Box,
  CircularProgress,
  InputAdornment,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Switch
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  RestartAlt as RestartIcon,
  CalendarToday as DateIcon,
  Route as RouteIcon,
  LocalShipping as VehicleIcon,
  Person as DriverIcon,
  Sms as SmsIcon,
  ShoppingCart as SaleIcon,
  Agriculture as FarmIcon,
  Message as MessageIcon
} from '@mui/icons-material';
import { getRoutes, getDrivers, getCustomersByRoute, createSalesEntry, getVehicles, getSaleDetailsByCriteria } from '../service/SalesService';
import UserService from '../service/UserService';
import { Navigate } from 'react-router-dom';

// Constants
const INITIAL_DATE = () => new Date().toISOString().slice(0, 10);
const VALIDATION_MESSAGES = {
  REQUIRED_FIELDS: 'Please fill in all required fields',
  FETCH_ERROR: 'Error loading data. Please try again.',
  SUBMIT_SUCCESS: 'Sales entry created successfully',
  SUBMIT_ERROR: 'Error creating sales entry. Please try again.'
};

const roundToNearestTen = (amount) => Math.round(amount / 10) * 10;

const createInitialSalesData = (customers) =>
  customers
    .filter(customer => !customer.obsolete)
    .map(customer => ({
      customerId: customer.id,
      city: customer.city.name,
      birds: 0,
      kilograms: '',
      rate: '',
      amount: 0,
      paymentMode: 'cash',
      payment: 0,
      pending: 0,
      balanceAmount: customer.balanceAmount || 0.0,
      description: '',
      obsolete: customer.obsolete
    }));

const validateFormData = (formData) => {
  const errors = {};
  if (!formData.selectedRoute) errors.route = 'Route is required';
  if (!formData.selectedDriver) errors.driver = 'Driver is required';
  if (!formData.selectedVehicle) errors.vehicle = 'Vehicle is required';
  if (!formData.date) errors.date = 'Date is required';
  if (!formData.totalBirds) errors.totalBirds = 'Total Birds is required';
  if (!formData.mortality) errors.mortality = 'Mortality is required';
  if (!formData.returnToFarm) errors.returnToFarm = 'Return to Farm is required';
  return errors;
};

const SalesEntry = () => {
  const isAuthenticated = UserService.isAuthenticated();
  
  const [formData, setFormData] = useState({
    date: INITIAL_DATE(),
    selectedRoute: '',
    selectedDriver: '',
    selectedVehicle: '',
    totalBirds: '',
    mortality: '',
    returnToFarm: '',
    description: '',
    sendSms: true
  });

  const [masterData, setMasterData] = useState({
    routes: [],
    drivers: [],
    vehicles: [],
    customers: []
  });

  const [salesData, setSalesData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [uiState, setUiState] = useState({
    loading: false,
    submitting: false,
    errors: {}
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const isFormValid = useMemo(() => {
    const errors = validateFormData(formData);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const filteredCustomersWithSales = useMemo(() => {
    if (!searchQuery.trim()) {
      return masterData.customers.map((customer, index) => ({
        customer,
        salesIndex: index,
        salesData: salesData[index]
      }));
    }

    const query = searchQuery.toLowerCase().trim();
    return masterData.customers
      .map((customer, index) => ({
        customer,
        salesIndex: index,
        salesData: salesData[index],
        matches: customer.name.toLowerCase().includes(query) ||
                customer.city.name.toLowerCase().includes(query)
      }))
      .sort((a, b) => {
        if (a.matches && !b.matches) return -1;
        if (!a.matches && b.matches) return 1;
        return 0;
      });
  }, [masterData.customers, salesData, searchQuery]);

  const totals = useMemo(() =>
    salesData.reduce((acc, data) => ({
      birds: acc.birds + Number(data.birds || 0),
      kilograms: acc.kilograms + Number(data.kilograms || 0),
      rate: acc.rate + Number(data.rate || 0),
      amount: acc.amount + Number(data.amount || 0),
      payment: acc.payment + Number(data.payment || 0),
      pending: acc.pending + Number(data.pending || 0)
    }), { birds: 0, kilograms: 0, rate: 0, amount: 0, payment: 0, pending: 0 }),
    [salesData]
  );

  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = useCallback((event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setUiState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: null }
    }));
  }, []);

  const handleSalesDataChange = useCallback((index, field, value) => {
    setSalesData(prevSalesData => {
      try {
        const newData = [...prevSalesData];
        newData[index] = { ...newData[index], [field]: value };
        
        if (field === 'rate' || field === 'kilograms') {
          const rate = Number(newData[index].rate) || 0;
          const kilograms = Number(newData[index].kilograms) || 0;
          newData[index].amount = roundToNearestTen(rate * kilograms);

          if(newData[index].amount > 0 && (newData[index].payment !== '' || newData[index].payment !== null)){
             const payment = Number(newData[index].payment) || 0;
             const amount = Number(newData[index].amount) || 0;
            newData[index].pending = roundToNearestTen(amount - payment);
        }
      }
        
        if (field === 'payment' || field === 'amount') {
          const amount = Number(newData[index].amount) || 0;
          const payment = Number(newData[index].payment) || 0;
          newData[index].pending = roundToNearestTen(amount - payment);
        }
        
        return newData;
      } catch (error) {
        console.error('Error updating sales data:', error);
        return prevSalesData;
      }
    });
  }, []);

  // Load initial data
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchInitialData = async () => {
      setUiState(prev => ({ ...prev, loading: true }));
      try {
        const [routesResponse, driversResponse, vehiclesResponse] = await Promise.all([
          getRoutes(),
          getDrivers(),
          getVehicles()
        ]);

        setMasterData(prev => ({
          ...prev,
          routes: routesResponse.data || [],
          drivers: driversResponse.data || [],
          vehicles: vehiclesResponse.data || []
        }));
      } catch (error) {
        console.error('Error fetching initial data:', error);
        showSnackbar(VALIDATION_MESSAGES.FETCH_ERROR, 'error');
      } finally {
        setUiState(prev => ({ ...prev, loading: false }));
      }
    };

    fetchInitialData();
  }, [isAuthenticated, showSnackbar]);

  // Load customers when route changes
  useEffect(() => {
    if (!isAuthenticated || !formData.selectedRoute) return;

    const fetchCustomers = async () => {
      try {
        const response = await getCustomersByRoute(formData.selectedRoute);
        const filteredCustomers = (response.data || []).filter(customer => !customer.obsolete);
        setMasterData(prev => ({ ...prev, customers: filteredCustomers }));
        setSalesData(createInitialSalesData(response.data || []));
        setSearchQuery('');
      } catch (error) {
        console.error('Error fetching customers:', error);
        showSnackbar('Error loading customers', 'error');
        setMasterData(prev => ({ ...prev, customers: [] }));
        setSalesData([]);
      }
    };

    fetchCustomers();
  }, [formData.selectedRoute, isAuthenticated, showSnackbar]);

  const handleSubmit = async () => {
    const errors = validateFormData(formData);
    if (Object.keys(errors).length > 0) {
      setUiState(prev => ({ ...prev, errors }));
      showSnackbar(VALIDATION_MESSAGES.REQUIRED_FIELDS, 'error');
      return;
    }

    const completedSalesData = salesData.filter(customerData =>
      customerData.birds !== '' &&
      customerData.kilograms !== '' &&
      customerData.rate !== ''
    );

    if (completedSalesData.length === 0) {
      showSnackbar('Please add at least one sale entry', 'error');
      return;
    }

    const salesEntry = {
      date: formData.date,
      route: formData.selectedRoute,
      driver: formData.selectedDriver,
      vehicleNo: formData.selectedVehicle,
      salesDetails: completedSalesData,
      totalBirds: Number(formData.totalBirds),
      mortality: Number(formData.mortality),
      returnToFarm: Number(formData.returnToFarm),
      description: formData.description,
      totalBirdSale: totals.birds,
      totalKilogramSale: totals.kilograms,
      totalAmount: totals.amount,
      totalPaymentReceived: totals.payment,
      totalPending: totals.pending,
      sendSms: formData.sendSms
    };

    setUiState(prev => ({ ...prev, submitting: true }));
    try {
      await createSalesEntry(salesEntry);
      showSnackbar(VALIDATION_MESSAGES.SUBMIT_SUCCESS);
      handleClear();
    } catch (error) {
      console.error('Error creating sales entry:', error);
      showSnackbar(VALIDATION_MESSAGES.SUBMIT_ERROR, 'error');
    } finally {
      setUiState(prev => ({ ...prev, submitting: false }));
    }
  };

  const handleClear = useCallback(() => {
    setFormData({
      date: INITIAL_DATE(),
      selectedRoute: '',
      selectedDriver: '',
      selectedVehicle: '',
      totalBirds: '',
      mortality: '',
      returnToFarm: '',
      description: '',
      sendSms: true
    });
    setSalesData([]);
    setSearchQuery('');
    setMasterData(prev => ({ ...prev, customers: [] }));
    setUiState(prev => ({ ...prev, errors: {} }));
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (uiState.loading) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading...</Typography>
      </Box>
    );
  }

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

      {/* Fixed Header Section */}
      <Box sx={{ flexShrink: 0 }}>
        <Container maxWidth="xl" sx={{ py: 1 }}>
         
          {/* Form Section - Fixed */}
          <Card elevation={3} sx={{ mb: 2, borderRadius: 2 }}>
            <CardHeader 
              title="Sales Information" 
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
                    label="Date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleFormChange('date', e.target.value)}
                    required
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
                
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Route"
                    value={formData.selectedRoute}
                    onChange={(e) => handleFormChange('selectedRoute', e.target.value)}
                    required
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <RouteIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  >
                    <MenuItem value=""><em>Select Route</em></MenuItem>
                    {masterData.routes.map(route => (
                      <MenuItem key={route.id} value={route.id}>
                        {route.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Vehicle"
                    value={formData.selectedVehicle}
                    onChange={(e) => handleFormChange('selectedVehicle', e.target.value)}
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
                    {masterData.vehicles.map(vehicle => (
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
                    value={formData.selectedDriver}
                    onChange={(e) => handleFormChange('selectedDriver', e.target.value)}
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
                    {masterData.drivers.map(driver => (
                      <MenuItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Total Birds"
                    type="number"
                    value={formData.totalBirds}
                    onChange={(e) => handleFormChange('totalBirds', e.target.value)}
                    required
                    size="small"
                     InputProps={{
                      startAdornment: <InputAdornment position="start"><img width="28" height="28" src="https://img.icons8.com/color/48/chicken.png" alt="chicken"/></InputAdornment>
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Mortality"
                    type="number"
                    value={formData.mortality}
                    onChange={(e) => handleFormChange('mortality', e.target.value)}
                    required
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Return to Farm"
                    type="number"
                    value={formData.returnToFarm}
                    onChange={(e) => handleFormChange('returnToFarm', e.target.value)}
                    required
                    size="small"
                     InputProps={{
                      startAdornment: <InputAdornment position="start"><FarmIcon color="primary" /></InputAdornment>
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    size="small"
                    placeholder="Enter description..."
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Container>
      </Box>

      {/* Scrollable Customer Sales Details Section */}
      {formData.selectedRoute && (
        <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Container maxWidth="xl" sx={{ height: '100%', pb: 0 }}>
            <Card elevation={3} sx={{ height: '100%', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
              <CardHeader 
                title="Customer Sales Details" 
                sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  py: 1,
                  flexShrink: 0,
                  '& .MuiCardHeader-title': { fontWeight: 600, fontSize: '0.9rem', color: 'white' }
                }}
              />
              
              {/* Search Box - Fixed */}
              <Box sx={{ p: 1, bgcolor: '#f8f9fa', flexShrink: 0 }}>
                <TextField
                  fullWidth
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="primary" />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <Button 
                          size="small" 
                          onClick={() => setSearchQuery('')}
                          startIcon={<ClearIcon />}
                        >
                          Clear
                        </Button>
                      </InputAdornment>
                    )
                  }}
                />
              </Box>

              {/* Scrollable Table with Fixed Totals */}
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Data Rows - Scrollable */}
                <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        {['Customer', 'City', 'Birds', 'Kilograms', 'Rate', 'Amount', 'Payment', 'Pending', 'Balance', 'Description'].map(header => (
                          <TableCell 
                            key={header} 
                            sx={{ 
                              fontWeight: 'bold', 
                              bgcolor: '#f5f5f5',
                              whiteSpace: 'nowrap',
                              py: 0.5,
                              fontSize: '0.85rem'
                            }}
                          >
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredCustomersWithSales.map(({ customer, salesIndex, salesData: customerSalesData, matches }) => (
                        <TableRow 
                          key={customer.id} 
                          hover
                          sx={{ 
                            bgcolor: matches === false ? 'rgba(0,0,0,0.05)' : 'inherit',
                            '& td': { py: 0.5 }
                          }}
                        >
                          <TableCell sx={{ fontWeight: 500, fontSize: '0.85rem' }}>{customer.name}</TableCell>
                          <TableCell sx={{ fontSize: '0.85rem' }}>{customer.city.name}</TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={customerSalesData?.birds || ''}
                              onChange={(e) => handleSalesDataChange(salesIndex, 'birds', e.target.value)}
                              sx={{ width: 80 }}
                              inputProps={{ style: { fontSize: '0.85rem', padding: '8px 16px' } }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              step="0.1"
                              value={customerSalesData?.kilograms || ''}
                              onChange={(e) => handleSalesDataChange(salesIndex, 'kilograms', e.target.value)}
                              sx={{ width: 80 }}
                              inputProps={{ style: { fontSize: '0.85rem', padding: '8px 16px' } }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              step="0.1"
                              value={customerSalesData?.rate || ''}
                              onChange={(e) => handleSalesDataChange(salesIndex, 'rate', e.target.value)}
                              sx={{ width: 80 }}
                              inputProps={{ style: { fontSize: '0.85rem', padding: '8px 16px' } }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
                            ₹{customerSalesData?.amount || 0}
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={customerSalesData?.payment || ''}
                              onChange={(e) => handleSalesDataChange(salesIndex, 'payment', e.target.value)}
                              sx={{ width: 100 }}
                              inputProps={{ style: { fontSize: '0.85rem', padding: '8px 16px' } }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
                            ₹{customerSalesData?.pending || 0}
                          </TableCell>               
                          <TableCell
                            sx={{
                              fontSize: '1rem',
                              color:
                                customerSalesData?.balanceAmount > 100000
                                  ? 'darkred'
                                  : customerSalesData?.balanceAmount > 50000
                                  ? 'darkred'
                                  : customerSalesData?.balanceAmount > 20000
                                  ? 'darkgoldenrod'
                                  : 'inherit',
                              fontWeight: customerSalesData?.balanceAmount > 100000 ? 'bold' : 'normal',
                            }}
                          >
                            ₹{customerSalesData?.balanceAmount || 0}
                          </TableCell>

                          <TableCell>
                            <TextField
                              size="small"
                              value={customerSalesData?.description || ''}
                              onChange={(e) => handleSalesDataChange(salesIndex, 'description', e.target.value)}
                              sx={{ width: 120 }}
                              inputProps={{ style: { fontSize: '0.85rem', padding: '8px 16px' } }}
                            />
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
                          TOTALS
                        </TableCell>
                        <TableCell sx={{ 
                          fontWeight: 'bold', 
                          color: 'white',
                          bgcolor: 'primary.main',
                          border: 'none',
                          //width: 70
                        }}>
                          BIRDS: {totals.birds}
                        </TableCell>
                        <TableCell sx={{ 
                          fontWeight: 'bold', 
                          color: 'white',
                          bgcolor: 'primary.main',
                          border: 'none',
                         // width: 70
                        }}>
                          WEIGHT: {totals.kilograms.toFixed(1)}
                        </TableCell>
                        <TableCell sx={{ bgcolor: 'primary.main', border: 'none', width: 70 }}></TableCell>
                        <TableCell sx={{ 
                          fontWeight: 'bold', 
                          color: 'white',
                          bgcolor: 'primary.main',
                          border: 'none'
                        }}>
                          AMOUNT: ₹{totals.amount}
                        </TableCell>
                        <TableCell sx={{ 
                          fontWeight: 'bold', 
                          color: 'white',
                          bgcolor: 'primary.main',
                          border: 'none',
                          //width: 70
                        }}>
                          PAYMENT: ₹{totals.payment}
                        </TableCell>
                        <TableCell sx={{ 
                          fontWeight: 'bold', 
                          color: 'white',
                          bgcolor: 'primary.main',
                          border: 'none'
                        }}>
                          PENDING: ₹{totals.pending}
                        </TableCell>
                        <TableCell colSpan={2} sx={{ bgcolor: 'primary.main', border: 'none' }}></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            </Card>
          </Container>
        </Box>
      )}

      {/* Fixed Action Buttons */}
      <Box sx={{ flexShrink: 0, borderTop: '1px solid #e0e0e0', bgcolor: 'white' }}>
        <Container maxWidth="xl">
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 3, 
            justifyContent: 'center',
            py: 1
          }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={uiState.submitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={handleSubmit}
              disabled={uiState.submitting || !isFormValid}
              sx={{ minWidth: 150 }}
            >
              {uiState.submitting ? 'Submitting...' : 'Submit Sales'}
            </Button>
            
            <Button
              variant="outlined"
              color="secondary"
              size="large"
              startIcon={<RestartIcon />}
              onClick={handleClear}
              disabled={uiState.submitting}
              sx={{ minWidth: 120 }}
            >
              Clear Form
            </Button>

           {/* Enhanced SMS Toggle - No background color when on */}
<Box sx={{ 
  display: 'flex', 
  alignItems: 'center',
  gap: 1,
  border: '1px solid',
  borderColor: formData.sendSms ? 'primary.main' : 'grey.300',
  borderRadius: 2,
  px: 0.5,
  py: 0.5,
  bgcolor: 'white', // Always white background
  transition: 'all 0.3s ease',
  '&:hover': {
    borderColor: 'primary.main',
    bgcolor: 'white', // Keep white on hover too
    boxShadow: formData.sendSms ? '0 2px 8px rgba(21, 101, 192, 0.2)' : '0 1px 4px rgba(0,0,0,0.1)'
  }
}}>
  <MessageIcon 
    color={formData.sendSms ? 'primary' : 'disabled'} 
    sx={{ fontSize: 24 }}
  />
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
    <Typography 
      variant="body2" 
      sx={{ 
        fontWeight: 600,
        color: formData.sendSms ? 'primary.main' : 'text.secondary'
      }}
    >
      SMS Notification
    </Typography>
    <Typography 
      variant="caption" 
      sx={{ 
        color: formData.sendSms ? 'primary.dark' : 'text.disabled',
        lineHeight: 1
      }}
    >
      {formData.sendSms ? 'Send to customers' : 'Not sending'}
    </Typography>
  </Box>
  <Switch
    checked={formData.sendSms}
    onChange={(e) => handleFormChange('sendSms', e.target.checked)}
    color="primary"
    size="medium"
  />
</Box>

          </Box>
        </Container>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
          elevation={6}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SalesEntry;
// Also export as BulkSalesEntry for the tabs component
export { SalesEntry as BulkSalesEntry };
