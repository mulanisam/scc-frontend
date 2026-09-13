import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
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
} from '@mui/material';
import {
  TrendingUp as TradingIcon,
  ShoppingCart as SalesIcon,
  Payment as PaymentIcon,
   LocalShipping as VehicleIcon,
   Person as PartyIcon,
  Business as SupplierIcon,
  AccountBalance as LedgerIcon,
  Assessment as ReportsIcon,
} from '@mui/icons-material';
import { 
  getParties, 
  getSuppliers, 
  createSalesEntry, 
  createPaymentEntry, 
  getVehiclesByParty 
} from '../service/TradingService';
import { calculateAmount } from '../../utils/businessRules';
import MessageChannelToggles from '../common/MessageChannelToggles';
import TradingLedger from './TradingLedger';
import TradingReports from './TradingReports';


/**
 * What the server said went wrong, or a fallback.
 *
 * The handler returns { message } for a business refusal and the message is the useful
 * part - "MH12AB1234 is not one of Ajit Poultry's vehicles" tells the operator what to do,
 * where "Error creating sales entry" tells them to call somebody.
 */
const serverMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  return data?.message || error?.message || fallback;
};

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
    vehicleNumber: '',
    supplierId: '',    // new
    birds: '',
    kilograms: '',
    rate: '',
    amount: '',
    payment: '',       // new
    description: '',
    // Per-entry, like the sales screen. Both can be on.
    sendSms: true,
    sendWhatsapp: false
  });

  // Payment Entry State - Updated field names
  const [paymentData, setPaymentData] = useState({
    date: new Date().toISOString().slice(0, 10),
    partyId: '',
    payment: '',
    paymentMode: 'CASH',
    transactionId: '',
    // Per-entry, like every other entry screen. Both can be on, and they say different
    // things: the SMS states the balance after the receipt, the WhatsApp message states
    // the amount received.
    sendSms: true,
    sendWhatsapp: false,
    description: ''
  });

  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const fetchInitialData = useCallback(async () => {
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
  }, [showSnackbar]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Sales Entry Handlers - Updated
  const handleSalesChange = async (field, value) => {
    setSalesData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'partyId' && value) {
      try {
        // A plain array of registration numbers now, read off the party.
        setVehicles(await getVehiclesByParty(value));
        // Reset vehicle selection when party changes
        setSalesData(prev => ({ ...prev, vehicleNumber: '' }));
      } catch (error) {
        showSnackbar('Error loading vehicles', 'error');
      }
    }

    // Recalculate the amount whenever weight or rate changes. This runs
    // unconditionally so clearing a field clears the amount rather than
    // leaving the previous figure on screen.
    if (field === 'kilograms' || field === 'rate') {
      const weight = field === 'kilograms' ? value : salesData.kilograms;
      const rate = field === 'rate' ? value : salesData.rate;
      setSalesData(prev => ({ ...prev, amount: calculateAmount(weight, rate) }));
    }
  };

  const handleSalesSubmit = async () => {
    // Supplier is optional: a load sold to a party need not say where the birds came
    // from, and the 571 converted entries have none recorded at all. Requiring it here
    // while the server does not would have blocked entries the server would accept.
    if (!salesData.partyId || !salesData.vehicleNumber || !salesData.birds
        || !salesData.kilograms || !salesData.rate) {
      showSnackbar('Party, vehicle, birds, weight and rate are all needed.', 'error');
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
      showSnackbar('Load recorded and billed to the party\'s account');
      setSalesData({
        date: new Date().toISOString().slice(0, 10),
        partyId: '',
        vehicleNumber: '',
        supplierId: '',    // reset supplier
        birds: '',
        kilograms: '',
        rate: '',
        amount: '',
        payment: '',       // reset payment
        description: '',
        // Kept: the next load usually goes out the same way as the last.
        sendSms: salesData.sendSms,
        sendWhatsapp: salesData.sendWhatsapp
      });
      setVehicles([]); // Clear vehicles
    } catch (error) {
      // The server's refusals are specific and worth reading: a vehicle that is not this
      // party's, an amount that disagrees with weight x rate, a party with no ledger
      // account. "Error creating sales entry" threw all of that away.
      showSnackbar(serverMessage(error, 'The load could not be recorded.'), 'error');
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
      showSnackbar('Payment recorded and credited to the party\'s account');
      setPaymentData((prev) => ({
        date: new Date().toISOString().slice(0, 10),
        partyId: '',
        payment: '',
        paymentMode: 'CASH',
        transactionId: '',
        description: '',
        // The channel choice survives, so the second receipt of the morning is not
        // silently sent on no channel at all.
        sendSms: prev.sendSms,
        sendWhatsapp: prev.sendWhatsapp
      }));
    } catch (error) {
      /*
       * The server's own words, not a generic line.
       *
       * This used to say "Error creating payment entry" for everything, which is how a
       * payment tab posting to an endpoint that did not exist looked like a glitch for
       * months instead of like nothing being saved. The refusals worth reading are real
       * ones - a party with no ledger account, a future date, an amount of zero.
       */
      showSnackbar(serverMessage(error, 'The payment could not be recorded.'), 'error');
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
            {/*
              The wholesale ledger and reports, kept separate from the retail ones.

              Route 9 - eleven parties and 44 lakh - used to live inside the route reports
              as a delivery round that does not exist. It is here now, and these two tabs
              are where it is read.
            */}
            <Tab
              label="Ledger"
              icon={<LedgerIcon />}
              iconPosition="start"
            />
            <Tab
              label="Reports"
              icon={<ReportsIcon />}
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
                    value={salesData.vehicleNumber}
                    onChange={(e) => handleSalesChange('vehicleNumber', e.target.value)}
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
                    {/* The number is the value: a trading entry records which vehicle
                        came, not a row id, so it still reads correctly after that
                        vehicle leaves the party's list. */}
                    {vehicles.map(vehicleNumber => (
                      <MenuItem key={vehicleNumber} value={vehicleNumber}>
                        {vehicleNumber}
                      </MenuItem>
                    ))}
                    {vehicles.length === 0 && salesData.partyId && (
                      <MenuItem value="" disabled>
                        <em>No vehicles recorded for this party</em>
                      </MenuItem>
                    )}
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

                {/*
                  The same two channels the sales screen offers.

                  Route 9's eleven parties were messaged like any other customer before
                  they moved here, and four of them have a usable number - so the toggles
                  had to come with them, or the move would have quietly stopped their
                  messages. They queue through the same outbox, so a party shows up in the
                  messaging dashboard with the same delivery status and resend button.
                */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <MessageChannelToggles
                      kind="trading"
                      sendSms={salesData.sendSms}
                      sendWhatsapp={salesData.sendWhatsapp}
                      onChange={handleSalesChange}
                      disabled={!salesData.partyId}
                    />
                  </Box>
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
                    setSalesData((prev) => ({
                      date: new Date().toISOString().slice(0, 10),
                      partyId: '',
                      vehicleNumber: '',
                      supplierId: '',
                      birds: '',
                      kilograms: '',
                      rate: '',
                      amount: '',
                      payment: '',
                      description: '',
                      // Kept, like the submit reset already does. Clearing the form dropped
                      // these to undefined, which turned both toggles off without saying so.
                      sendSms: prev.sendSms,
                      sendWhatsapp: prev.sendWhatsapp
                    }));
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

                {/*
                  Acknowledging the receipt, on the same two channels as everywhere else.

                  A payment is the money movement most worth telling a party about: a load
                  they can see arrive, but a cash settlement leaves them nothing until the
                  next statement. Disabled until a party is chosen, because there is nobody
                  to send to before that.
                */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <MessageChannelToggles
                      kind="payment"
                      sendSms={paymentData.sendSms}
                      sendWhatsapp={paymentData.sendWhatsapp}
                      onChange={handlePaymentChange}
                      disabled={!paymentData.partyId}
                    />
                  </Box>
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
                  onClick={() => setPaymentData((prev) => ({
                    date: new Date().toISOString().slice(0, 10),
                    partyId: '',
                    payment: '',
                    paymentMode: 'CASH',
                    transactionId: '',
                    description: '',
                    // Kept across a clear: the operator's channel choice is a standing
                    // preference for the session, not part of this one receipt. Resetting
                    // it silently turned messages off for every payment after the first.
                    sendSms: prev.sendSms,
                    sendWhatsapp: prev.sendWhatsapp
                  }))}
                >
                  Clear
                </Button>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        {/*
          Ledger and reports for the wholesale side.

          Mounted only when their tab is open - TabPanel returns null otherwise - so
          neither fetches until it is looked at. The ledger's party list reads every
          party's balance off the ledger, which is not free.
        */}
        <TabPanel value={tabValue} index={2}>
          <TradingLedger />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <TradingReports />
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
