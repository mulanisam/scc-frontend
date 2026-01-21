import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
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
import { 
  PostAdd as SingleIcon,
  CalendarToday as DateIcon,
  Person as PersonIcon,
  LocalShipping as VehicleIcon,
  Scale as WeightIcon
} from '@mui/icons-material';
import { createSingleSale, getRoutes, getDrivers, getVehicles, getCustomersByRoute } from '../service/SalesService';

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
    description: ''
  });

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    if (formData.routeId) {
      loadCustomers(formData.routeId);
    }
  }, [formData.routeId]);

  useEffect(() => {
    calculateAmount();
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

  const calculateAmount = () => {
    const kg = parseFloat(formData.kilograms) || 0;
    const rate = parseFloat(formData.rate) || 0;
    const amount = Math.round(kg * rate);
    setFormData(prev => ({ ...prev, amount: amount.toString() }));
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
        description: formData.description
      };

      await createSingleSale(saleData);
      setSuccess('Sale created successfully!');
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        customerId: '',
        routeId: formData.routeId,
        vehicleId: formData.vehicleId,
        driverId: formData.driverId,
        kilograms: '',
        rate: '',
        birds: '',
        amount: '',
        payment: '',
        paymentMode: 'CASH',
        description: ''
      });
    } catch (err) {
      setError(err.response?.data || 'Failed to create sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Card elevation={2}>
        <CardHeader
          avatar={<SingleIcon color="primary" />}
          title="Single Sale Entry"
          subheader="Quick entry for individual sales"
          sx={{ bgcolor: 'grey.50' }}
        />
        <Divider />
        <CardContent>
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
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

            <Grid item xs={12} sm={6}>
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
                    {route.routeName}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
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
                    {customer.name} - {customer.shopName}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
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

            <Grid item xs={12} sm={6}>
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

            <Grid item xs={12} sm={6}>
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

            <Grid item xs={12} sm={6}>
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

            <Grid item xs={12} sm={6}>
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

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Birds (Optional)"
                type="number"
                name="birds"
                value={formData.birds}
                onChange={handleChange}
                inputProps={{ min: "0" }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
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

            <Grid item xs={12} sm={6}>
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
