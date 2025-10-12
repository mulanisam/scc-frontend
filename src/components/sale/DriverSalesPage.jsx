import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  TextField,
  MenuItem,
  Button,
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  CardHeader,
  Autocomplete,
  InputAdornment,
  Snackbar,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  CalendarToday as DateIcon,
  Route as RouteIcon,
  LocalShipping as VehicleIcon,
  Person as CustomerIcon,
  Save as SaveIcon,
  Clear as ClearIcon,
  ShoppingCart as SaleIcon,
  LocalAtm as PaymentIcon
} from '@mui/icons-material';
import { getRoutes, getCustomersByRoute, getVehicles, getDrivers } from '../service/SalesService';
import UserService from '../service/UserService';
import { Navigate } from 'react-router-dom';
import { getCompanyConfig } from '../../config/companyConfig';

const DriverSalesPage = () => {
  const companyConfig = getCompanyConfig();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  
  // Session Configuration (set once)
  const [sessionConfig, setSessionConfig] = useState({
    date: new Date().toISOString().slice(0, 10),
    route: '',
    vehicle: '',
    driver: ''
  });
  const [isSessionConfigured, setIsSessionConfigured] = useState(false);
  
  // Master Data
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  // Current Sale Data
  const [saleData, setSaleData] = useState({
    customer: null,
    birds: '',
    kilograms: '',
    rate: '',
    amount: 0,
    paymentMode: 'cash',
    payment: '',
    pending: 0,
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [todaySales, setTodaySales] = useState(0);
  const [todayAmount, setTodayAmount] = useState(0);

  // CSS to remove number input arrows
  const numberInputStyles = `
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    
    input[type="number"] {
      -moz-appearance: textfield;
    }
  `;

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = UserService.isAuthenticated();
      const driver = UserService.isDriver();
      setIsAuthenticated(authenticated);
      setIsDriver(driver);
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  useEffect(() => {
    if (isAuthenticated && isDriver) {
      fetchInitialData();
    }
  }, [isAuthenticated, isDriver]);

  useEffect(() => {
    if (sessionConfig.route) {
      fetchCustomers();
    }
  }, [sessionConfig.route]);

  useEffect(() => {
    if (saleData.rate && saleData.kilograms) {
      const amount = Math.round((parseFloat(saleData.rate) * parseFloat(saleData.kilograms)) / 10) * 10;
      setSaleData(prev => ({ ...prev, amount }));
    }
  }, [saleData.rate, saleData.kilograms]);

  useEffect(() => {
    if (saleData.amount && saleData.payment) {
      const pending = Math.round((parseFloat(saleData.amount) - parseFloat(saleData.payment)) / 10) * 10;
      setSaleData(prev => ({ ...prev, pending }));
    }
  }, [saleData.amount, saleData.payment]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [routesResponse, vehiclesResponse, driversResponse] = await Promise.all([
        getRoutes(),
        getVehicles(),
        getDrivers()
      ]);

      setRoutes(routesResponse.data || []);
      setVehicles(vehiclesResponse.data || []);
      setDrivers(driversResponse.data || []);
    } catch (error) {
      showSnackbar('Error loading data. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await getCustomersByRoute(sessionConfig.route);
      const filteredCustomers = (response.data || []).filter(customer => !customer.obsolete);
      setCustomers(filteredCustomers);
    } catch (error) {
      showSnackbar('Error loading customers', 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSessionConfigSubmit = () => {
    if (!sessionConfig.date || !sessionConfig.route || !sessionConfig.vehicle || !sessionConfig.driver) {
      showSnackbar('Please fill all session configuration fields', 'error');
      return;
    }

    const selectedDriver = drivers.find(d => d.id === sessionConfig.driver);
    if (selectedDriver) {
      UserService.setDriverInfo(selectedDriver);
    }

    setIsSessionConfigured(true);
    showSnackbar('Session configured successfully!', 'success');
  };

  const handleSaleSubmit = async () => {
    if (!saleData.customer || !saleData.birds || !saleData.kilograms || !saleData.rate) {
      showSnackbar('Please fill all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const selectedCustomer = customers.find(c => c.id === saleData.customer?.id);
      
      const salesEntry = {
        date: sessionConfig.date,
        route: sessionConfig.route,
        driver: sessionConfig.driver,
        vehicleNo: sessionConfig.vehicle,
        salesDetails: [{
          customerId: saleData.customer.id,
          city: selectedCustomer?.city?.name || '',
          birds: parseInt(saleData.birds),
          kilograms: parseFloat(saleData.kilograms),
          rate: parseFloat(saleData.rate),
          amount: saleData.amount,
          paymentMode: saleData.paymentMode,
          payment: parseFloat(saleData.payment || 0),
          pending: saleData.pending,
          balanceAmount: selectedCustomer?.balanceAmount || 0,
          description: saleData.description,
          obsolete: false
        }],
        totalBirds: parseInt(saleData.birds),
        mortality: 0,
        returnToFarm: 0,
        description: `Driver sale - ${saleData.description}`,
        totalBirdSale: parseInt(saleData.birds),
        totalKilogramSale: parseFloat(saleData.kilograms),
        totalAmount: saleData.amount,
        totalPaymentReceived: parseFloat(saleData.payment || 0),
        totalPending: saleData.pending,
        sendSms: false
      };

      // Use the same service as regular sales entry
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(salesEntry)
      });

      if (response.ok) {
        showSnackbar('Sale recorded successfully!', 'success');
        setTodaySales(prev => prev + 1);
        setTodayAmount(prev => prev + saleData.amount);
        handleClearSale();
      } else {
        throw new Error('Failed to submit sale');
      }
    } catch (error) {
      showSnackbar('Error recording sale. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearSale = () => {
    setSaleData({
      customer: null,
      birds: '',
      kilograms: '',
      rate: '',
      amount: 0,
      paymentMode: 'cash',
      payment: '',
      pending: 0,
      description: ''
    });
  };

  const handleResetSession = () => {
    const confirmReset = window.confirm('Are you sure you want to reset the session? You will need to reconfigure.');
    if (confirmReset) {
      setIsSessionConfigured(false);
      setSessionConfig({
        date: new Date().toISOString().slice(0, 10),
        route: '',
        vehicle: '',
        driver: ''
      });
      setCustomers([]);
      handleClearSale();
    }
  };

  if (!isAuthenticated || !isDriver) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
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
    <Box sx={{ minHeight: '100%', bgcolor: '#f5f5f5' }}>
      <style>{numberInputStyles}</style>
      
      <Container maxWidth="md" sx={{ py: 2 }}>
        {!isSessionConfigured ? (
          // Session Configuration Card
          <Card elevation={3} sx={{ borderRadius: 2, mt: 2 }}>
            <CardHeader 
              title="Configure Your Sales Session" 
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                textAlign: 'center',
                '& .MuiCardHeader-title': { fontWeight: 600, fontSize: '1.1rem' }
              }}
            />
            <CardContent sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                Set up your session details. These cannot be changed once confirmed.
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Date"
                    type="date"
                    value={sessionConfig.date}
                    onChange={(e) => setSessionConfig(prev => ({ ...prev, date: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DateIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Route"
                    value={sessionConfig.route}
                    onChange={(e) => setSessionConfig(prev => ({ ...prev, route: e.target.value }))}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <RouteIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  >
                    <MenuItem value=""><em>Select Route</em></MenuItem>
                    {routes.map(route => (
                      <MenuItem key={route.id} value={route.id}>
                        {route.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Vehicle"
                    value={sessionConfig.vehicle}
                    onChange={(e) => setSessionConfig(prev => ({ ...prev, vehicle: e.target.value }))}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <VehicleIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  >
                    <MenuItem value=""><em>Select Vehicle</em></MenuItem>
                    {vehicles.map(vehicle => (
                      <MenuItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicleNo}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Driver"
                    value={sessionConfig.driver}
                    onChange={(e) => setSessionConfig(prev => ({ ...prev, driver: e.target.value }))}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CustomerIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  >
                    <MenuItem value=""><em>Select Driver</em></MenuItem>
                    {drivers.map(driver => (
                      <MenuItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSessionConfigSubmit}
                  startIcon={<SaveIcon />}
                  disabled={loading}
                  size="large"
                  sx={{ minWidth: 200 }}
                >
                  Start Sales Session
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          // Sales Entry Interface
          <>
            {/* Session Info Header */}
            <Paper elevation={2} sx={{ 
              mb: 2, 
              borderRadius: 2, 
              bgcolor: 'success.main',
              color: 'white',
              p: 2
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <SaleIcon sx={{ fontSize: 28, color: 'white' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'white', lineHeight: 1 }}>
                      Sales Session Active
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      {routes.find(r => r.id === sessionConfig.route)?.name} | {vehicles.find(v => v.id === sessionConfig.vehicle)?.vehicleNo}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'end' }}>
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    Today: {todaySales} sales
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    ₹{todayAmount.toLocaleString()}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ color: 'white', borderColor: 'white', mt: 1 }}
                    onClick={handleResetSession}
                  >
                    Reset Session
                  </Button>
                </Box>
              </Box>
            </Paper>

            {/* Sale Entry Form */}
            <Card elevation={3} sx={{ borderRadius: 2 }}>
              <CardHeader 
                title="Record New Sale" 
                action={
                  <Chip 
                    label={new Date(sessionConfig.date).toLocaleDateString()} 
                    color="primary"
                    variant="outlined"
                  />
                }
                sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  '& .MuiCardHeader-title': { fontWeight: 600, fontSize: '1.1rem' }
                }}
              />
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  {/* Customer Selection with Search */}
                  <Grid item xs={12}>
                    <Autocomplete
                      options={customers}
                      getOptionLabel={(option) => `${option.name} - ${option.city.name}`}
                      value={saleData.customer}
                      onChange={(_, newValue) => setSaleData(prev => ({ ...prev, customer: newValue }))}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Select Customer"
                          placeholder="Search customer..."
                          required
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <InputAdornment position="start">
                                <CustomerIcon color="primary" />
                              </InputAdornment>
                            )
                          }}
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {option.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {option.city.name} | Balance: ₹{option.balanceAmount || 0}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      noOptionsText="No customers found"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Birds Quantity"
                      type="number"
                      value={saleData.birds}
                      onChange={(e) => setSaleData(prev => ({ ...prev, birds: e.target.value }))}
                      required
                      InputProps={{
                        startAdornment: <InputAdornment position="start">#</InputAdornment>
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Weight (Kg)"
                      type="number"
                      step="0.1"
                      value={saleData.kilograms}
                      onChange={(e) => setSaleData(prev => ({ ...prev, kilograms: e.target.value }))}
                      required
                      InputProps={{
                        startAdornment: <InputAdornment position="start">Kg</InputAdornment>
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Rate per Kg"
                      type="number"
                      step="0.1"
                      value={saleData.rate}
                      onChange={(e) => setSaleData(prev => ({ ...prev, rate: e.target.value }))}
                      required
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Total Amount"
                      value={`₹${saleData.amount}`}
                      InputProps={{ readOnly: true }}
                      sx={{ bgcolor: '#f9f9f9' }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      select
                      fullWidth
                      label="Payment Mode"
                      value={saleData.paymentMode}
                      onChange={(e) => setSaleData(prev => ({ ...prev, paymentMode: e.target.value }))}
                    >
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="credit">Credit</MenuItem>
                      <MenuItem value="online">Online</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Payment Received"
                      type="number"
                      value={saleData.payment}
                      onChange={(e) => setSaleData(prev => ({ ...prev, payment: e.target.value }))}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PaymentIcon color="primary" />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Pending Amount"
                      value={`₹${saleData.pending}`}
                      InputProps={{ readOnly: true }}
                      sx={{ bgcolor: '#fff3e0' }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description"
                      value={saleData.description}
                      onChange={(e) => setSaleData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter sale details..."
                    />
                  </Grid>
                </Grid>

                {/* Customer Balance Info */}
                {saleData.customer && (
                  <Box sx={{ 
                    mt: 2, 
                    p: 2, 
                    bgcolor: 'info.light', 
                    borderRadius: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Customer: {saleData.customer.name} | City: {saleData.customer.city.name}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Current Balance: ₹{saleData.customer.balanceAmount || 0}
                    </Typography>
                  </Box>
                )}

                {/* Action Buttons */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  justifyContent: 'center',
                  mt: 3
                }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={handleSaleSubmit}
                    disabled={submitting}
                    sx={{ minWidth: 150 }}
                  >
                    {submitting ? 'Recording...' : 'Record Sale'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="large"
                    startIcon={<ClearIcon />}
                    onClick={handleClearSale}
                    disabled={submitting}
                    sx={{ minWidth: 120 }}
                  >
                    Clear Form
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </>
        )}
      </Container>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
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

export default DriverSalesPage;
