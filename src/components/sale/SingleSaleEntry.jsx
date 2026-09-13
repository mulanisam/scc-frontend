import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Divider,
  InputAdornment
} from '@mui/material';
import { PostAdd as SingleIcon, CalendarToday as DateIcon } from '@mui/icons-material';
import { createSingleSale, getRoutes, getDrivers, getVehicles, getCustomersByRoute } from '../service/SalesService';
import { calculateAmount } from '../../utils/businessRules';
import MessageChannelToggles from '../common/MessageChannelToggles';

const SingleSaleEntry = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    routeId: '',
    vehicleId: '',
    driverId: '',
    kilograms: '',
    rate: '',
    birds: '',
    amount: '',
    payment: '',
    paymentMode: 'CASH',
    description: '',
    /*
     * The same two switches the bulk screen has.
     *
     * A single sale is the one entered after the trip has gone out - a customer served late,
     * or a line corrected - so it is precisely the case where the customer has not already
     * had the day's message. The server has accepted both flags all along; this screen
     * offered neither, so a sale entered here told the customer nothing.
     */
    sendSms: true,
    sendWhatsapp: false
  });

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    if (formData.routeId) {
      loadCustomers(formData.routeId);
    }
  }, [formData.routeId]);

  // Amount is derived from weight x rate, rounded to the nearest ₹10.
  useEffect(() => {
    const amount = calculateAmount(formData.kilograms, formData.rate);
    setFormData(prev => ({ ...prev, amount: amount.toString() }));
  }, [formData.kilograms, formData.rate]);

  const loadMasterData = async () => {
    try {
      const [routesRes, driversRes, vehiclesRes] = await Promise.all([
        getRoutes(),
        getDrivers(),
        getVehicles()
      ]);
      setRoutes(routesRes.data);
      setDrivers(driversRes.data);
      setVehicles(vehiclesRes.data);
    } catch (err) {
      setError('Failed to load master data');
    }
  };

  const loadCustomers = async (routeId) => {
    try {
      const response = await getCustomersByRoute(routeId);
      setCustomers(response.data);
    } catch (err) {
      setError('Failed to load customers');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const saleData = {
        date: formData.date,
        customerId: parseInt(formData.customerId),
        routeId: parseInt(formData.routeId),
        vehicleId: parseInt(formData.vehicleId),
        driverId: parseInt(formData.driverId),
        kilograms: parseFloat(formData.kilograms),
        rate: parseFloat(formData.rate),
        birds: parseInt(formData.birds) || 0,
        amount: parseInt(formData.amount),
        payment: parseInt(formData.payment) || 0,
        paymentMode: formData.paymentMode,
        description: formData.description,
        sendSms: formData.sendSms,
        sendWhatsapp: formData.sendWhatsapp
      };

      await createSingleSale(saleData);
      setSuccess(describeSaved(formData));

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        customerId: '',
        // Route, vehicle and driver are kept: single entries come in runs for one trip.
        routeId: formData.routeId,
        vehicleId: formData.vehicleId,
        driverId: formData.driverId,
        kilograms: '',
        rate: '',
        birds: '',
        amount: '',
        payment: '',
        paymentMode: 'CASH',
        description: '',
        // Kept for the same reason - the next entry is usually messaged the same way.
        sendSms: formData.sendSms,
        sendWhatsapp: formData.sendWhatsapp
      });
    } catch (err) {
      /*
       * The server's message, not the raw response object.
       *
       * err.response.data is a { message, ... } body for every refusal the handler
       * produces, so putting it in state rendered "[object Object]" for exactly the
       * failures worth reading - a bird count that does not reconcile, a future date, a
       * credit limit.
       */
      const data = err.response?.data;
      setError((typeof data === 'string' && data.trim() ? data : data?.message)
        || err.message || 'The sale could not be saved.');
    } finally {
      setLoading(false);
    }
  };

  /** Says what was saved and who was told, so the toggles visibly did something. */
  const describeSaved = ({ sendSms, sendWhatsapp }) => {
    if (sendSms && sendWhatsapp) return 'Sale saved. An SMS and a WhatsApp message are queued.';
    if (sendWhatsapp) return 'Sale saved. A WhatsApp message is queued.';
    if (sendSms) return 'Sale saved. An SMS is queued.';
    return 'Sale saved. No message was sent.';
  };

  return (
    <Box>
      <Card elevation={3} sx={{ mb: 2, borderRadius: 2 }}>
        <CardHeader
          avatar={<SingleIcon color="primary" />}
          title="Single Sale Entry"
          sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                py: 1,
                '& .MuiCardHeader-title': { fontWeight: 600, fontSize: '0.9rem', color: 'white' }
              }}
        />
        <Divider />
        <CardContent>
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Date"
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
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
                fullWidth
                select
                label="Route"
                name="routeId"
                value={formData.routeId}
                onChange={handleChange}
                required
              >
                {routes.map((route) => (
                  <MenuItem key={route.id} value={route.id}>
                    {route.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="Vehicle"
                name="vehicleId"
                value={formData.vehicleId}
                onChange={handleChange}
                required
              >
                {vehicles.map((vehicle) => (
                  <MenuItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicleNo}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="Driver"
                name="driverId"
                value={formData.driverId}
                onChange={handleChange}
                required
              >
                {drivers.map((driver) => (
                  <MenuItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="Customer"
                name="customerId"
                value={formData.customerId}
                onChange={handleChange}
                required
                disabled={!formData.routeId}
              >
                {customers.map((customer) => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.name} - {customer.city.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Birds "
                type="number"
                name="birds"
                value={formData.birds}
                onChange={handleChange}
                required
                inputProps={{ min: "0" }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Kilograms"
                type="number"
                name="kilograms"
                value={formData.kilograms}
                onChange={handleChange}
                required
                inputProps={{ step: "0.01", min: "0" }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Rate per Kg"
                type="number"
                name="rate"
                value={formData.rate}
                onChange={handleChange}
                required
                inputProps={{ step: "0.01", min: "0" }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                InputProps={{ readOnly: true }}
              />
            </Grid>


            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Payment Received"
                type="number"
                name="payment"
                value={formData.payment}
                onChange={handleChange}
                inputProps={{ min: "0" }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="Payment Mode"
                name="paymentMode"
                value={formData.paymentMode}
                onChange={handleChange}
              >
                <MenuItem value="CASH">Cash</MenuItem>
                <MenuItem value="UPI">UPI</MenuItem>
                <MenuItem value="CHEQUE">Cheque</MenuItem>
                <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={2}
              />
            </Grid>

            {/*
              Telling the customer, on the same two channels as the bulk screen.

              Disabled until a customer is chosen: before that there is no number to send
              to, and a switch left on for nobody reads as a message that went.
            */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <MessageChannelToggles
                  kind="sale"
                  sendSms={formData.sendSms}
                  sendWhatsapp={formData.sendWhatsapp}
                  onChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
                  disabled={!formData.customerId}
                />
              </Box>
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
                {loading ? <CircularProgress size={24} /> : 'Create Sale'}
              </Button>
            </Grid>
          </Grid>
        </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SingleSaleEntry;
