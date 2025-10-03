import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Tabs,
  Tab,
  Box,
  Grid,
  TextField,
  Select,
  MenuItem,
  Button,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  getParties,
  getSuppliers,
  getBalanceAmount,
  createSalesEntry,
  createPaymentEntry,
  getVehiclesByParty
} from '../service/TradingService'; // Update with your actual APIs

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TradingPage = () => {
  const navigate = useNavigate();

  const [tabIndex, setTabIndex] = useState(0);
  const [parties, setParties] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  // Shared selections
  const [selectedPartySales, setSelectedPartySales] = useState('');
  const [selectedSupplierSales, setSelectedSupplierSales] = useState('');
  const [selectedPartyPayment, setSelectedPartyPayment] = useState('');
  const [selectedSupplierPayment, setSelectedSupplierPayment] = useState('');
  const [selectedVehicleSales, setSelectedVehicleSales] = useState('');

  // Sales tab state
  const [salesData, setSalesData] = useState({
    date: new Date().toISOString().slice(0, 10),
    birds: '',
    kilograms: '',
    rate: '',
    amount: 0,
    payment: '',
    pending: 0,
    balanceAmount: '',
    description: '',
  });

  // Payments tab state
  const [paymentData, setPaymentData] = useState({
    date: new Date().toISOString().slice(0, 10),
    saleDate: '',
    amountReceived: '',
    transactionId: '',
    notes: '',
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [partiesResponse, suppliersResponse] = await Promise.all([getParties(), getSuppliers()]);
        setParties(partiesResponse.data);
        setSuppliers(suppliersResponse.data);
      } catch (error) {
        console.error('Error fetching parties or Suppliers:', error);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch vehicles when party changes in Sales tab
  useEffect(() => {
    const fetchVehicles = async () => {
      if (selectedPartySales) {
        try {
          const response = await getVehiclesByParty(selectedPartySales);
          setVehicles(response.data);
        } catch (error) {
          console.error('Error fetching vehicles for party:', error);
          setVehicles([]);
        }
      } else {
        setVehicles([]);
        setSelectedVehicleSales('');
      }
    };
    fetchVehicles();
  }, [selectedPartySales]);
  // Fetch balance amount whenever party or Supplier changes in Sales tab
  useEffect(() => {
    const fetchBalance = async () => {
      if (selectedPartySales && selectedSupplierSales) {
        try {
          const response = await getBalanceAmount(selectedPartySales, selectedSupplierSales);
          setSalesData((prev) => ({
            ...prev,
            balanceAmount: response.data.balanceAmount || '',
          }));
        } catch (error) {
          console.error('Error fetching balance amount:', error);
          setSalesData((prev) => ({
            ...prev,
            balanceAmount: '',
          }));
        }
      } else {
        setSalesData((prev) => ({
          ...prev,
          balanceAmount: '',
        }));
      }
    };
    fetchBalance();
  }, [selectedPartySales, selectedSupplierSales]);

  // Compute amount and pending in sales form
  useEffect(() => {
    const birdsNum = Number(salesData.birds || 0);
    const kgNum = Number(salesData.kilograms || 0);
    const rateNum = Number(salesData.rate || 0);
    const paymentNum = Number(salesData.payment || 0);
    const amountCalc = Math.round((rateNum * kgNum) / 10) * 10;
    const pendingCalc = amountCalc - paymentNum;

    setSalesData((prev) => ({
      ...prev,
      amount: amountCalc,
      pending: pendingCalc >= 0 ? pendingCalc : 0,
    }));
  }, [salesData.birds, salesData.kilograms, salesData.rate, salesData.payment]);

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  const handleSalesChange = (field, value) => {
    setSalesData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePaymentChange = (field, value) => {
    setPaymentData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSalesSubmit = async () => {
    if (!selectedPartySales || !selectedSupplierSales || !salesData.date) {
      setSnackbar({ open: true, message: 'Date, Party, and Supplier are required.', severity: 'error' });
      return;
    }

    try {
      await createSalesEntry({
        partyId: selectedPartySales,
        supplierId: selectedSupplierSales,
        ...salesData,
        birds: Number(salesData.birds),
        kilograms: Number(salesData.kilograms),
        rate: Number(salesData.rate),
        amount: salesData.amount,
        payment: Number(salesData.payment),
        pending: salesData.pending,
        balanceAmount: Number(salesData.balanceAmount),
        description: salesData.description,
      });

      setSnackbar({ open: true, message: 'Sales entry created successfully.', severity: 'success' });
      // Reset sales form
      setSelectedPartySales('');
      setSelectedSupplierSales('');
      setSalesData({
        date: new Date().toISOString().slice(0, 10),
        birds: '',
        kilograms: '',
        rate: '',
        amount: 0,
        payment: '',
        pending: 0,
        balanceAmount: '',
        description: '',
      });
    } catch (error) {
      setSnackbar({ open: true, message: 'Error creating sales entry.', severity: 'error' });
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPartyPayment || !selectedSupplierPayment || !paymentData.date || !paymentData.saleDate || !paymentData.amountReceived) {
      setSnackbar({
        open: true,
        message: 'Date, Sale Date, Party, Supplier, and Amount Received are required.',
        severity: 'error',
      });
      return;
    }

    try {
      await createPaymentEntry({
        partyId: selectedPartyPayment,
       supplierId: selectedSupplierPayment,
        ...paymentData,
        amountReceived: Number(paymentData.amountReceived),
      });

      setSnackbar({ open: true, message: 'Payment recorded successfully.', severity: 'success' });
      // Reset payment form
      setSelectedPartyPayment('');
      setSelectedSupplierPayment('');
      setPaymentData({
        date: new Date().toISOString().slice(0, 10),
        saleDate: '',
        amountReceived: '',
        transactionId: '',
        notes: '',
      });
    } catch (error) {
      setSnackbar({ open: true, message: 'Error recording payment.', severity: 'error' });
    }
  };

  const handleCancel = () => {
    navigate('/dashboard'); // Adjust this path to your dashboard route
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3}>
        <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Sales and Payments Tabs" centered>
          <Tab label="Sales" />
          <Tab label="Payments" />
        </Tabs>

        <TabPanel value={tabIndex} index={0}>
          <Box component="form" noValidate autoComplete="off">
            <Grid container spacing={2}>
              {/* Date */}
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Date"
                  type="date"
                  fullWidth
                  value={salesData.date}
                  onChange={(e) => handleSalesChange('date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Party dropdown */}
              <Grid item xs={12} sm={3}>
                <Select
                  fullWidth
                  value={selectedPartySales}
                  onChange={(e) => setSelectedPartySales(e.target.value)}
                  displayEmpty
                  required
                >
                  <MenuItem value="">
                    <em>Select Party</em>
                  </MenuItem>
                  {parties.map((party) => (
                    <MenuItem key={party.id} value={party.id}>
                      {party.name}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
<Grid item xs={12} sm={3}>
                <Select
                  fullWidth
                  value={selectedVehicleSales}
                  onChange={(e) => setSelectedVehicleSales(e.target.value)}
                  displayEmpty
                  required
                  disabled={vehicles.length === 0}
                >
                  <MenuItem value="">
                    <em>Select Vehicle</em>
                  </MenuItem>
                  {vehicles.map((vehicle) => (
                    <MenuItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicleNo}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              {/* Supplier dropdown */}
              <Grid item xs={12} sm={3}>
                <Select
                  fullWidth
                  value={selectedSupplierSales}
                  onChange={(e) => setSelectedSupplierSales(e.target.value)}
                  displayEmpty
                  required
                >
                  <MenuItem value="">
                    <em>Select Supplier</em>
                  </MenuItem>
                  {suppliers.map((supplier) => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>

              {/* Birds, Kilograms, Rate */}
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Birds"
                  type="number"
                  fullWidth
                  value={salesData.birds}
                  onChange={(e) => handleSalesChange('birds', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Kilograms"
                  type="number"
                  fullWidth
                  value={salesData.kilograms}
                  onChange={(e) => handleSalesChange('kilograms', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Rate"
                  type="number"
                  fullWidth
                  value={salesData.rate}
                  onChange={(e) => handleSalesChange('rate', e.target.value)}
                />
              </Grid>

              {/* Calculated Amount */}
              <Grid item xs={12} sm={4}>
                <TextField label="Amount" type="number" fullWidth value={salesData.amount} InputProps={{ readOnly: true }} />
              </Grid>

              {/* Payment */}
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Payment"
                  type="number"
                  fullWidth
                  value={salesData.payment}
                  onChange={(e) => handleSalesChange('payment', e.target.value)}
                />
              </Grid>

              {/* Pending */}
              <Grid item xs={12} sm={4}>
                <TextField label="Pending" type="number" fullWidth value={salesData.pending} InputProps={{ readOnly: true }} />
              </Grid>

              {/* Auto-filled Balance Amount */}
              <Grid item xs={12} sm={6}>
                <TextField label="Balance Amount" type="number" fullWidth value={salesData.balanceAmount} InputProps={{ readOnly: true }} />
              </Grid>

              {/* Description */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Description"
                  type="text"
                  fullWidth
                  value={salesData.description}
                  onChange={(e) => handleSalesChange('description', e.target.value)}
                />
              </Grid>

              {/* Buttons */}
              <Grid item xs={12} display="flex" justifyContent="flex-end" spacing={1} container>
                <Grid item>
                  <Button variant="outlined" onClick={handleCancel}>
                    Cancel
                  </Button>
                </Grid>
                <Grid item>
                  <Button variant="contained" color="primary" onClick={handleSalesSubmit}>
                    Submit Sale
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={tabIndex} index={1}>
          <Box component="form" noValidate autoComplete="off">
            <Grid container spacing={2}>
              {/* Date and Sale Date */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date"
                  type="date"
                  fullWidth
                  value={paymentData.date}
                  onChange={(e) => handlePaymentChange('date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Sale Date"
                  type="date"
                  fullWidth
                  value={paymentData.saleDate}
                  onChange={(e) => handlePaymentChange('saleDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Party dropdown */}
              <Grid item xs={12} sm={6}>
                <Select
                  fullWidth
                  value={selectedPartyPayment}
                  onChange={(e) => setSelectedPartyPayment(e.target.value)}
                  displayEmpty
                  required
                >
                  <MenuItem value="">
                    <em>Select Party</em>
                  </MenuItem>
                  {parties.map((party) => (
                    <MenuItem key={party.id} value={party.id}>
                      {party.name}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>

              {/* Supplier dropdown */}
              <Grid item xs={12} sm={6}>
                <Select
                  fullWidth
                  value={selectedSupplierPayment}
                  onChange={(e) => setSelectedSupplierPayment(e.target.value)}
                  displayEmpty
                  required
                >
                  <MenuItem value="">
                    <em>Select Supplier</em>
                  </MenuItem>
                  {suppliers.map((supplier) => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>

              {/* Amount Received */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Amount Received"
                  type="number"
                  fullWidth
                  value={paymentData.amountReceived}
                  onChange={(e) => handlePaymentChange('amountReceived', e.target.value)}
                />
              </Grid>

              {/* Transaction ID */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Transaction ID"
                  fullWidth
                  value={paymentData.transactionId}
                  onChange={(e) => handlePaymentChange('transactionId', e.target.value)}
                />
              </Grid>

              {/* Notes */}
              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  fullWidth
                  multiline
                  minRows={3}
                  value={paymentData.notes}
                  onChange={(e) => handlePaymentChange('notes', e.target.value)}
                />
              </Grid>

              {/* Buttons */}
              <Grid item xs={12} display="flex" justifyContent="flex-end" spacing={1} container>
                <Grid item>
                  <Button variant="outlined" onClick={handleCancel}>
                    Cancel
                  </Button>
                </Grid>
                <Grid item>
                  <Button variant="contained" color="primary" onClick={handlePaymentSubmit}>
                    Submit Payment
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={handleSnackbarClose}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TradingPage;
