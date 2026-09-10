import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Typography,
  Snackbar,
  Alert,
  Box,
  CircularProgress,
  InputAdornment,
  Card,
  CardContent,
  CardHeader,
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
  Agriculture as FarmIcon,
  Message as MessageIcon
} from '@mui/icons-material';
import { getRoutes, getDrivers, getCustomersByRoute, createSalesEntry, getVehicles, getTripContext } from '../service/SalesService';
import UserService from '../service/UserService';
import { Navigate } from 'react-router-dom';
import { calculateAmount, calculatePending, reconcileBirds, isCompleteSaleLine } from '../../utils/businessRules';
import { validateSaleDate, checkDuplicateEntry, buildSaleSummary } from '../../utils/saleValidation';
import SaleSubmitDialog from './SaleSubmitDialog';

// Constants
const INITIAL_DATE = () => new Date().toISOString().slice(0, 10);
const VALIDATION_MESSAGES = {
  REQUIRED_FIELDS: 'Please fill in all required fields',
  FETCH_ERROR: 'Error loading data. Please try again.',
  SUBMIT_SUCCESS: 'Sales entry created successfully',
  SUBMIT_ERROR: 'Error creating sales entry. Please try again.'
};


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

// Column order used by the grid and by keyboard navigation.
const EDITABLE_FIELDS = ['birds', 'kilograms', 'rate', 'payment', 'description'];

const balanceColor = (balance) => {
  if (balance > 50000) return 'error.dark';
  if (balance > 20000) return 'warning.dark';
  return 'inherit';
};

const cellInputSx = { '& .MuiInputBase-input': { fontSize: '0.85rem', py: '6px' } };

/**
 * One customer row.
 *
 * Memoised so that typing in a cell re-renders only that row: `onChange`
 * replaces a single entry in the sales array, leaving every other row's `row`
 * object identity intact.
 */
const SaleRow = React.memo(function SaleRow({ customer, row, rowIndex, salesIndex, dimmed, onChange }) {
  const numericCell = (field, width) => (
    <TableCell>
      <TextField
        size="small"
        type="number"
        value={row?.[field] ?? ''}
        onChange={(e) => onChange(salesIndex, field, e.target.value)}
        sx={{ width, ...cellInputSx }}
        inputProps={{ 'data-row': rowIndex, 'data-field': field }}
      />
    </TableCell>
  );

  return (
    <TableRow hover sx={{ bgcolor: dimmed ? 'action.hover' : 'inherit', '& td': { py: 0.5 } }}>
      <TableCell sx={{ fontWeight: 500, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
        {customer.name}
      </TableCell>
      <TableCell sx={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{customer.city?.name}</TableCell>

      {numericCell('birds', 80)}
      {numericCell('kilograms', 90)}
      {numericCell('rate', 90)}

      <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>
        ₹{(row?.amount ?? 0).toLocaleString('en-IN')}
      </TableCell>

      {numericCell('payment', 100)}

      <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>
        ₹{(row?.pending ?? 0).toLocaleString('en-IN')}
      </TableCell>

      <TableCell
        sx={{
          fontSize: '0.85rem',
          textAlign: 'right',
          color: balanceColor(row?.balanceAmount ?? 0),
          fontWeight: (row?.balanceAmount ?? 0) > 50000 ? 700 : 400
        }}
      >
        ₹{(row?.balanceAmount ?? 0).toLocaleString('en-IN')}
      </TableCell>

      <TableCell>
        <TextField
          size="small"
          value={row?.description ?? ''}
          onChange={(e) => onChange(salesIndex, 'description', e.target.value)}
          sx={{ width: 140, ...cellInputSx }}
          inputProps={{ 'data-row': rowIndex, 'data-field': 'description' }}
        />
      </TableCell>
    </TableRow>
  );
});

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

  // Row ORDER depends only on the customer list and the search box. It
  // deliberately does not depend on salesData: including it rebuilt this array
  // on every keystroke, which re-rendered all ~100 rows (five inputs each)
  // instead of just the cell being typed into.
  const orderedCustomers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      return masterData.customers.map((customer, index) => ({
        customer,
        salesIndex: index,
        matches: true
      }));
    }

    return masterData.customers
      .map((customer, index) => ({
        customer,
        salesIndex: index,
        matches: customer.name.toLowerCase().includes(query) ||
                customer.city.name.toLowerCase().includes(query)
      }))
      .sort((a, b) => Number(b.matches) - Number(a.matches));
  }, [masterData.customers, searchQuery]);

  // Only lines that will actually be submitted. The server reconciles birds
  // against the lines it receives, so totalling rows that are never sent would
  // show a balanced load on screen and then be rejected on submit.
  const completedLines = useMemo(
    () => salesData.filter(isCompleteSaleLine),
    [salesData]
  );

  const totals = useMemo(() =>
    completedLines.reduce((acc, data) => ({
      birds: acc.birds + Number(data.birds || 0),
      kilograms: acc.kilograms + Number(data.kilograms || 0),
      amount: acc.amount + Number(data.amount || 0),
      payment: acc.payment + Number(data.payment || 0),
      pending: acc.pending + Number(data.pending || 0)
    }), { birds: 0, kilograms: 0, amount: 0, payment: 0, pending: 0 }),
    [completedLines]
  );

  // What the server already knows about this date and route. Fetched rather
  // than guessed: the browser cannot see what is already saved.
  const [tripContext, setTripContext] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !formData.selectedRoute || !formData.date) {
      setTripContext(null);
      return undefined;
    }

    let active = true;
    getTripContext(formData.date, formData.selectedRoute)
      .then((response) => {
        if (active) setTripContext(response.data || null);
      })
      .catch(() => {
        // A failed lookup must not block entry: the server revalidates on
        // submit regardless, so the warnings are a convenience, not the gate.
        if (active) setTripContext(null);
      });

    return () => {
      active = false;
    };
  }, [formData.date, formData.selectedRoute, isAuthenticated]);

  const dateCheck = useMemo(
    () => validateSaleDate({
      saleDate: formData.date,
      lastSaleDate: tripContext?.lastSaleDate
    }),
    [formData.date, tripContext]
  );

  const duplicateCheck = useMemo(() => checkDuplicateEntry(tripContext), [tripContext]);

  // Every bird loaded must be sold, dead, or returned to the farm.
  const birdCheck = useMemo(() => reconcileBirds({
    totalBirds: formData.totalBirds,
    soldBirds: totals.birds,
    mortality: formData.mortality,
    returnToFarm: formData.returnToFarm
  }), [formData.totalBirds, formData.mortality, formData.returnToFarm, totals.birds]);

  // Figures shown on the review screen, with ids resolved to the names the
  // operator recognises rather than the raw selections.
  const reviewSummary = useMemo(() => buildSaleSummary({
    formData,
    lines: completedLines,
    totals,
    birdCheck,
    labels: {
      route: masterData.routes.find(r => r.id === formData.selectedRoute)?.name ?? '',
      vehicle: masterData.vehicles.find(v => v.id === formData.selectedVehicle)?.vehicleNo ?? '',
      driver: masterData.drivers.find(d => d.id === formData.selectedDriver)?.name ?? ''
    }
  }), [formData, completedLines, totals, birdCheck, masterData]);

  const gridRef = useRef(null);

  /**
   * Spreadsheet-style navigation for the entry grid: Enter / Arrow Down move
   * down a column, Arrow Up moves back, Arrow Left/Right step across columns.
   * Tab keeps its native row-wise behaviour.
   */
  const handleGridKeyDown = useCallback((event) => {
    const { key, target } = event;
    const rowIndex = Number(target.dataset?.row);
    const field = target.dataset?.field;
    if (!field || Number.isNaN(rowIndex)) return;

    const vertical = key === 'Enter' || key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0;
    const horizontal = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;
    if (!vertical && !horizontal) return;

    // Let arrow keys move the caret inside a text field with content in it,
    // rather than hijacking them for navigation.
    if (horizontal && target.type !== 'number' && target.value) return;

    let nextRow = rowIndex;
    let nextField = field;

    if (vertical) {
      nextRow = rowIndex + vertical;
    } else {
      const col = EDITABLE_FIELDS.indexOf(field) + horizontal;
      if (col < 0 || col >= EDITABLE_FIELDS.length) return;
      nextField = EDITABLE_FIELDS[col];
    }

    const next = gridRef.current?.querySelector(
      `input[data-row="${nextRow}"][data-field="${nextField}"]`
    );
    if (!next) return;

    event.preventDefault();
    next.focus();
    next.select?.();
  }, []);

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
        const row = { ...newData[index], [field]: value };

        // Amount and pending are always derived, so clearing a field
        // recalculates rather than leaving a stale figure in the row.
        if (field === 'rate' || field === 'kilograms') {
          row.amount = calculateAmount(row.kilograms, row.rate);
        }
        row.pending = calculatePending(row.amount, row.payment);

        newData[index] = row;
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

  /**
   * Opens the review screen. Cheap, local problems are reported straight away;
   * anything the operator needs to weigh up — a duplicate trip, a backdated
   * entry — is shown on the review screen so they can see it alongside the
   * figures before deciding.
   */
  const handleReview = () => {
    const errors = validateFormData(formData);
    if (Object.keys(errors).length > 0) {
      setUiState(prev => ({ ...prev, errors }));
      showSnackbar(VALIDATION_MESSAGES.REQUIRED_FIELDS, 'error');
      return;
    }

    if (completedLines.length === 0) {
      showSnackbar('Please add at least one sale entry', 'error');
      return;
    }

    if (dateCheck.blocked) {
      showSnackbar(dateCheck.message, 'error');
      return;
    }

    if (!birdCheck.balanced) {
      showSnackbar(
        `Bird count does not balance: ${birdCheck.totalBirds} loaded vs ` +
        `${birdCheck.accountedFor} accounted for (${birdCheck.message}).`,
        'error'
      );
      return;
    }

    setReviewOpen(true);
  };

  const handleSubmit = async () => {
    const completedSalesData = completedLines;

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
      setReviewOpen(false);
      showSnackbar(VALIDATION_MESSAGES.SUBMIT_SUCCESS);
      handleClear();
    } catch (error) {
      // The API now returns a specific reason for a rejected entry (amount
      // mismatch, unbalanced birds, a future date), so show that rather than a
      // generic failure. The dialog stays open so the figures are still visible.
      showSnackbar(error.message || VALIDATION_MESSAGES.SUBMIT_ERROR, 'error');
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

                {/* What the server already knows about this date and route. */}
                {(dateCheck.blocked || dateCheck.requiresConfirmation || duplicateCheck.isDuplicate) && (
                  <Grid item xs={12}>
                    {dateCheck.blocked && (
                      <Alert severity="error" sx={{ py: 0.25, mb: 0.5 }}>
                        {dateCheck.message}
                      </Alert>
                    )}
                    {dateCheck.requiresConfirmation && (
                      <Alert severity="warning" sx={{ py: 0.25, mb: 0.5 }}>
                        {dateCheck.message}
                      </Alert>
                    )}
                    {duplicateCheck.isDuplicate && (
                      <Alert severity="warning" sx={{ py: 0.25 }}>
                        {duplicateCheck.message}
                      </Alert>
                    )}
                  </Grid>
                )}

                {/* Live bird reconciliation: loaded = sold + mortality + returned */}
                <Grid item xs={12}>
                  <Alert
                    severity={birdCheck.balanced ? 'success' : 'warning'}
                    icon={false}
                    sx={{ py: 0.25, '& .MuiAlert-message': { py: 0.5 } }}
                  >
                    <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                      Birds:
                    </Typography>{' '}
                    <Typography variant="body2" component="span">
                      {birdCheck.totalBirds.toLocaleString('en-IN')} loaded ={' '}
                      {totals.birds.toLocaleString('en-IN')} sold +{' '}
                      {(Number(formData.mortality) || 0).toLocaleString('en-IN')} mortality +{' '}
                      {(Number(formData.returnToFarm) || 0).toLocaleString('en-IN')} returned
                      {birdCheck.balanced ? ' — balanced' : ` — ${birdCheck.message}`}
                    </Typography>
                  </Alert>
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
                <TableContainer
                  ref={gridRef}
                  onKeyDown={handleGridKeyDown}
                  sx={{ flexGrow: 1, overflow: 'auto' }}
                >
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        {['Customer', 'City', 'Birds', 'Kilograms', 'Rate', 'Amount', 'Payment', 'Pending', 'Balance', 'Description'].map(header => (
                          <TableCell
                            key={header}
                            sx={{
                              fontWeight: 700,
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
                      {orderedCustomers.map(({ customer, salesIndex, matches }, rowIndex) => (
                        <SaleRow
                          key={customer.id}
                          customer={customer}
                          row={salesData[salesIndex]}
                          rowIndex={rowIndex}
                          salesIndex={salesIndex}
                          dimmed={!matches}
                          onChange={handleSalesDataChange}
                        />
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
              startIcon={<SaveIcon />}
              onClick={handleReview}
              disabled={uiState.submitting || !isFormValid || dateCheck.blocked || !birdCheck.balanced}
              sx={{ minWidth: 150 }}
            >
              Review &amp; Submit
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
      <SaleSubmitDialog
        open={reviewOpen}
        summary={reviewSummary}
        dateCheck={dateCheck}
        duplicateCheck={duplicateCheck}
        submitting={uiState.submitting}
        onConfirm={handleSubmit}
        onCancel={() => setReviewOpen(false)}
      />

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
