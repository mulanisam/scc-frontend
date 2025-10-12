import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Tabs, 
  Tab, 
  Box, 
  Grid, 
  TextField, 
  MenuItem, 
  Button, 
  Typography, 
  Snackbar, 
  Alert,
  Card,
  CardContent,
  CardHeader,
  Chip,
  InputAdornment,
  Divider
} from '@mui/material';
import {
  TrendingUp as TradingIcon,
  ShoppingCart as SalesIcon,
  Payment as PaymentIcon,
   LocalShipping as VehicleIcon,
   Person as PartyIcon,
  Business as SupplierIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { 
  getParties, 
  getSuppliers, 
  createSalesEntry, 
  createPaymentEntry, 
  getVehiclesByParty 
} from '../service/TradingService';


function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`trading-tabpanel-${index}`}
      aria-labelledby={`trading-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}


function TradingPage() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [parties, setParties] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Sales Entry State - Updated with separate birds and kilograms
  const [salesData, setSalesData] = useState({
    date: new Date().toISOString().slice(0, 10),
    partyId: '',
    partyVehicleId: '',
    supplierId: '',    // new
    birds: '',
    kilograms: '',
    rate: '',
    amount: '',
    payment: '',       // new
    description: ''
  });

  // Payment Entry State - Updated field names
  const [paymentData, setPaymentData] = useState({
    date: new Date().toISOString().slice(0, 10),
    partyId: '',
    payment: '',
    paymentMode: 'cash',
    transactionId: '',
    description: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [partiesRes, suppliersRes] = await Promise.all([
        getParties(),
        getSuppliers()
      ]);
      setParties(partiesRes.data || []);
      setSuppliers(suppliersRes.data || []);
    } catch (error) {
      showSnackbar('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Sales Entry Handlers - Updated
  const handleSalesChange = async (field, value) => {
    setSalesData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'partyId' && value) {
      try {
        const vehiclesRes = await getVehiclesByParty(value);
        setVehicles(vehiclesRes.data || []);
        // Reset vehicle selection when party changes
        setSalesData(prev => ({ ...prev, partyVehicleId: '' }));
      } catch (error) {
        showSnackbar('Error loading vehicles', 'error');
      }
    }

    // Calculate amount when kilograms or rate changes
    if ((field === 'kilograms' || field === 'rate')) {
      const weight = field === 'kilograms' ? parseFloat(value) : parseFloat(salesData.kilograms);
      const rate = field === 'rate' ? parseFloat(value) : parseFloat(salesData.rate);
      if (weight && rate && !isNaN(weight) && !isNaN(rate)) {
        setSalesData(prev => ({ ...prev, amount: (weight * rate).toFixed(2) }));
      }
    }
  };

  const handleSalesSubmit = async () => {
    if (!salesData.partyId || !salesData.partyVehicleId || !salesData.birds || !salesData.kilograms || !salesData.rate || !salesData.supplierId ) {
      showSnackbar('Please fill all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...salesData,
        amount: parseInt(salesData.amount), // Convert to integer if needed
        payment: salesData.payment ? parseInt(salesData.payment) : 0
      };
      await createSalesEntry(submitData);
      showSnackbar('Sales entry created successfully');
      setSalesData({
        date: new Date().toISOString().slice(0, 10),
        partyId: '',
        partyVehicleId: '',
        supplierId: '',    // reset supplier
        birds: '',
        kilograms: '',
        rate: '',
        amount: '',
        payment: '',       // reset payment
        description: ''
      });
      setVehicles([]); // Clear vehicles
    } catch (error) {
      showSnackbar('Error creating sales entry', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Payment Entry Handlers - Updated
  const handlePaymentChange = (field, value) => {
    setPaymentData(prev => ({ ...prev, [field]: value }));
  };

  const handlePaymentSubmit = async () => {
    if (!paymentData.partyId || !paymentData.payment) {
      showSnackbar('Please fill all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...paymentData,
        payment: parseInt(paymentData.payment) // Convert to integer
      };
      await createPaymentEntry(submitData);
      showSnackbar('Payment entry created successfully');
      setPaymentData({
        date: new Date().toISOString().slice(0, 10),
        partyId: '',
        payment: '',
        paymentMode: 'cash',
        transactionId: '',
        description: ''
      });
    } catch (error) {
      showSnackbar('Error creating payment entry', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ height: '100%', py: 2, overflow: 'auto' }}>
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

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <TradingIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
          Trading Operations
        </Typography>
        <Chip 
          label={`Today: ${new Date().toLocaleDateString()}`} 
          color="primary" 
          variant="outlined" 
        />
      </Box>

      {/* Main Content */}
      <Card elevation={3} sx={{ borderRadius: 2 }}>
        {/* Navigation Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                minWidth: 120
              }
            }}
          >
            <Tab 
              label="Sales Entry" 
              icon={<SalesIcon />}
              iconPosition="start"
            />
            <Tab 
              label="Payment Entry" 
              icon={<PaymentIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Sales Entry Tab */}
        <TabPanel value={tabValue} index={0}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardHeader 
              title="Create Sales Entry"
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                py: 1,
                '& .MuiCardHeader-title': { fontWeight: 600, fontSize: '0.9rem', color: 'white' }
              }}
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Date"
                    type="date"
                    value={salesData.date}
                    onChange={(e) => handleSalesChange('date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Party"
                    value={salesData.partyId}
                    onChange={(e) => handleSalesChange('partyId', e.target.value)}
                    size="small"
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PartyIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  >
                    <MenuItem value=""><em>Select Party</em></MenuItem>
                    {parties.map(party => (
                      <MenuItem key={party.id} value={party.id}>
                        {party.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Vehicle"
                    value={salesData.partyVehicleId}
                    onChange={(e) => handleSalesChange('partyVehicleId', e.target.value)}
                    disabled={!salesData.partyId}
                    size="small"
                    required
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
                        {vehicle.vehicleNumber}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
{/* Supplier Dropdown */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  select
                  fullWidth
                  label="Supplier"
                  value={salesData.supplierId}
                  onChange={(e) => handleSalesChange('supplierId', e.target.value)}
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
                  {suppliers.map(s => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Birds Quantity"
                    type="number"
                    value={salesData.birds}
                    onChange={(e) => handleSalesChange('birds', e.target.value)}
                    size="small"
                    required
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><img width="28" height="28" src="https://img.icons8.com/color/48/chicken.png" alt="chicken"/></InputAdornment>
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Weight"
                    type="number"
                    step="0.01"
                    value={salesData.kilograms}
                    onChange={(e) => handleSalesChange('kilograms', e.target.value)}
                    size="small"
                    required
                    InputProps={{
                      startAdornment: <InputAdornment position="start">Kg</InputAdornment>
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Rate per Kg"
                    type="number"
                    step="0.01"
                    value={salesData.rate}
                    onChange={(e) => handleSalesChange('rate', e.target.value)}
                    size="small"
                    required
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Total Amount"
                    value={salesData.amount}
                    size="small"
                    InputProps={{ 
                      readOnly: true,
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>
                    }}
                    sx={{ bgcolor: '#f9f9f9' }}
                  />
                </Grid>
                {/* Payment Received */}
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Payment Received (₹)"
                    type="number"
                    step="0.01"
                    value={salesData.payment}
                    onChange={(e) => handleSalesChange('payment', e.target.value)}
                    size="small"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={2}
                    value={salesData.description}
                    onChange={(e) => handleSalesChange('description', e.target.value)}
                    size="small"
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSalesSubmit}
                  disabled={loading}
                  startIcon={<SalesIcon />}
                >
                  {loading ? 'Creating...' : 'Create Sales Entry'}
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSalesData({
                      date: new Date().toISOString().slice(0, 10),
                      partyId: '',
                      partyVehicleId: '',
                      birds: '',
                      kilograms: '',
                      rate: '',
                      amount: '',
                      description: ''
                    });
                    setVehicles([]);
                  }}
                >
                  Clear
                </Button>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Payment Entry Tab */}
        <TabPanel value={tabValue} index={1}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardHeader 
              title="Create Payment Entry"
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                py: 1,
                '& .MuiCardHeader-title': { fontWeight: 600, fontSize: '0.9rem', color: 'white' }
              }}
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Date"
                    type="date"
                    value={paymentData.date}
                    onChange={(e) => handlePaymentChange('date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Party"
                    value={paymentData.partyId}
                    onChange={(e) => handlePaymentChange('partyId', e.target.value)}
                    size="small"
                    required
                  >
                    <MenuItem value=""><em>Select Party</em></MenuItem>
                    {parties.map(party => (
                      <MenuItem key={party.id} value={party.id}>
                        {party.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Payment Amount"
                    type="number"
                    step="0.01"
                    value={paymentData.payment}
                    onChange={(e) => handlePaymentChange('payment', e.target.value)}
                    size="small"
                    required
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Payment Mode"
                    value={paymentData.paymentMode}
                    onChange={(e) => handlePaymentChange('paymentMode', e.target.value)}
                    size="small"
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="bank">Bank Transfer</MenuItem>
                    <MenuItem value="cheque">Cheque</MenuItem>
                    <MenuItem value="online">Online</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Transaction ID"
                    value={paymentData.transactionId}
                    onChange={(e) => handlePaymentChange('transactionId', e.target.value)}
                    size="small"
                    helperText="For non-cash payments"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={2}
                    value={paymentData.description}
                    onChange={(e) => handlePaymentChange('description', e.target.value)}
                    size="small"
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handlePaymentSubmit}
                  disabled={loading}
                  startIcon={<PaymentIcon />}
                >
                  {loading ? 'Processing...' : 'Create Payment Entry'}
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={() => setPaymentData({
                    date: new Date().toISOString().slice(0, 10),
                    partyId: '',
                    payment: '',
                    paymentMode: 'cash',
                    transactionId: '',
                    description: ''
                  })}
                >
                  Clear
                </Button>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>
      </Card>

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
    </Container>
  );
}

export default TradingPage;
