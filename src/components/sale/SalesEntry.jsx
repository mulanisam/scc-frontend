import React, { useState, useEffect, useCallback } from 'react';
import {
    Container,
    Grid,
    TextField,
    Select,
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
    Alert
} from '@mui/material';
import { getRoutes, getDrivers, getCustomersByRoute, createSalesEntry, getVehicles, getSaleDetailsByCriteria } from '../service/SalesService';
import UserService from '../service/UserService';
import { Navigate } from 'react-router-dom';

const SalesEntry = () => {
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [routes, setRoutes] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState('');
    const [drivers, setDrivers] = useState([]);
    const [selectedDriver, setSelectedDriver] = useState('');
    const [customers, setCustomers] = useState([]);
    const [salesData, setSalesData] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [totalBirds, setTotalBirds] = useState('');
    const [mortality, setMortality] = useState('');
    const [returnToFarm, setReturnToFarm] = useState('');
    const [description, setDescription] = useState('');

    const isFormValid = selectedRoute && selectedDriver && selectedVehicle && date;
    useEffect(() => {
        if (!UserService.isAuthenticated()) {
            return <Navigate to="/" />;
        }

        const fetchData = async () => {
            try {
                const [routesResponse, driversResponse, vehiclesResponse] = await Promise.all([
                    getRoutes(),
                    getDrivers(),
                    getVehicles()
                ]);
                setRoutes(routesResponse.data);
                setDrivers(driversResponse.data);
                setVehicles(vehiclesResponse.data);
            } catch (error) {
                console.error('Error fetching initial data:', error);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        const fetchCustomers = async () => {
            if (selectedRoute) {
                try {
                    const response = await getCustomersByRoute(selectedRoute);
                    const initialSalesData = response.data.map(customer => ({
                        customerId: customer.id,
                        city:customer.city.name,
                        birds: 0,
                        kilograms: '',
                        rate: '',
                        amount: 0,
                        paymentMode: 'cash',
                        payment: 0,
                        pending: 0,
                        balanceAmount: customer.balanceAmount || 0.0,
                        description: '',
                        obsolete:customer.obsolete
                    }));
                    const filteredInitialSalesData = initialSalesData.filter(customer => !customer.obsolete);
                    const filteredCustomersData = response.data.filter(customer => !customer.obsolete);
                    setCustomers(filteredCustomersData);
                    setSalesData(filteredInitialSalesData);
                } catch (error) {
                    console.error('Error fetching customers:', error);
                }
            }
        };

        fetchCustomers();
    }, [selectedRoute]);

    useEffect(() => {
        const fetchSaleDetails = async () => {
            if (isFormValid) {
                try {
                    const response = await getSaleDetailsByCriteria(date, selectedRoute, selectedVehicle, selectedDriver);
                    if (response.data) {
                        const details = response.data;
                        setTotalBirds(details.totalBirds || '');
                        setMortality(details.mortality || '');
                        setReturnToFarm(details.returnToFarm || '');
                        setDescription(details.description || '');
                        //setSalesData(details.salesDetails || []);
                    }
                } catch (error) {
                    console.error('Error fetching sale details:', error);
                }
            }
        };

        fetchSaleDetails();
    }, [date, selectedRoute, selectedVehicle, selectedDriver, isFormValid]);

    const roundToNearestTen = (amount) => {
        return Math.round(amount / 10) * 10;
      };
    const handleSalesDataChange = useCallback((index, field, value) => {
        setSalesData(prevSalesData => {
            const newData = [...prevSalesData];
            newData[index] = {
                ...newData[index],
                [field]: value,
            };
            if (field === 'rate' || field === 'kilograms') {
                newData[index].amount = roundToNearestTen(newData[index].rate * newData[index].kilograms);
            }
            newData[index].pending = roundToNearestTen(newData[index].amount - newData[index].payment);
            return newData;
        });
    }, []);

    const handleSubmit = async () => {
        if (!selectedRoute || !selectedDriver || !selectedVehicle) {
            setSnackbarMessage('Route, Driver, and Vehicle are mandatory fields.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
        }

        const completedSalesData = salesData.filter(customerData =>
            customerData.birds !== '' &&
            customerData.kilograms !== '' &&
            customerData.rate !== ''
        );
        const totals = calculateTotals();
        console.log();
        const salesEntry = {
            date,
            route: selectedRoute,
            driver: selectedDriver,
            vehicleNo: selectedVehicle,
            salesDetails: completedSalesData,

            totalBirds: Number(totalBirds),
            mortality: Number(mortality),
            returnToFarm: Number(returnToFarm),
            description,
            totalBirdSale: totals.birds,
            totalKilogramSale: totals.kilograms,
            totalAmount: totals.amount,
            totalPaymentReceived: totals.payment,
            totalPending: totals.pending
        };
        

        try {
            console.log("salesEntry: ",salesEntry);
            await createSalesEntry(salesEntry);
            setSnackbarMessage('Sales entry created successfully');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            handleClear(); // Clear form on success
        } catch (error) {
            setSnackbarMessage('Error creating sales entry');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const handleClear = () => {
        setSelectedRoute('');
        setSelectedDriver('');
        setSelectedVehicle('');
        setTotalBirds('');
        setMortality('');
        setReturnToFarm('');
        setDescription('');
        setSalesData([]);
    };

    const calculateTotals = () => {
        return salesData.reduce(
            (totals, data) => {
                totals.birds += Number(data.birds || 0);
                totals.kilograms += Number(data.kilograms || 0);
                totals.rate += Number(data.rate || 0);
                totals.amount += Number(data.amount || 0);
                totals.payment += Number(data.payment || 0);
                totals.pending += Number(data.pending || 0);
                return totals;
            },
            {
                birds: 0,
                kilograms: 0,
                rate: 0,
                amount: 0,
                payment: 0,
                pending: 0,
            }
        );
    };

    return (
        <Container>
             <Typography variant="h4" gutterBottom>Sales Entry</Typography>
            <Grid container spacing={6}>
                <Grid item xs={12} md={3}>
                    <TextField
                        label="Date"
                        type="date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <Select
                        label="Route"
                        fullWidth
                        value={selectedRoute}
                        onChange={(e) => setSelectedRoute(e.target.value)}
                        displayEmpty
                        required
                    >
                        <MenuItem value=""><em>Select Route</em></MenuItem>
                        {routes.map(route => (
                            <MenuItem key={route.id} value={route.id}>{route.name}</MenuItem>
                        ))}
                    </Select>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Select
                        label="Vehicle No"
                        fullWidth
                        value={selectedVehicle}
                        onChange={(e) => setSelectedVehicle(e.target.value)}
                        displayEmpty
                        required
                    >
                        <MenuItem value=""><em>Select Vehicle</em></MenuItem>
                        {vehicles.map(vehicle => (
                            <MenuItem key={vehicle.id} value={vehicle.id}>{vehicle.vehicleNo}</MenuItem>
                        ))}
                    </Select>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Select
                        label="Driver"
                        fullWidth
                        value={selectedDriver}
                        onChange={(e) => setSelectedDriver(e.target.value)}
                        displayEmpty
                        required
                    >
                        <MenuItem value=""><em>Select Driver</em></MenuItem>
                        {drivers.map(driver => (
                            <MenuItem key={driver.id} value={driver.id}>{driver.name}</MenuItem>
                        ))}
                    </Select>
                </Grid>
            </Grid>

            {/* Additional Fields */}
            <Grid container spacing={2} style={{ marginTop: '20px' }}>
                <Grid item xs={12} md={3}>
                    <TextField
                        label="Total Birds"
                        type="number"
                        fullWidth
                        value={totalBirds}
                        onChange={(e) => setTotalBirds(e.target.value)}
                        required
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <TextField
                        label="Mortality"
                        type="number"
                        fullWidth
                        value={mortality}
                        onChange={(e) => setMortality(e.target.value)}
                        required
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <TextField
                        label="Return to Farm"
                        type="number"
                        fullWidth
                        value={returnToFarm}
                        onChange={(e) => setReturnToFarm(e.target.value)}
                        required
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <TextField
                        label="Description"
                        type="text"
                        fullWidth
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </Grid>
            </Grid>
            
    
            <Typography variant="h5" gutterBottom style={{ marginTop: '20px' }}>Customers</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Customer</TableCell>
                            <TableCell>City</TableCell>
                            <TableCell>Birds</TableCell>
                            <TableCell>Kilograms</TableCell>
                            <TableCell>Rate</TableCell>
                            <TableCell>Amount</TableCell>
                            {/* <TableCell>Payment Mode</TableCell> */}
                            <TableCell>Payment</TableCell>
                            <TableCell>Pending</TableCell>
                            <TableCell>Balance Amount</TableCell>
                            <TableCell>Description</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {customers.map((customer, index) => (
                            <TableRow key={customer.id}>
                                <TableCell >{customer.name}</TableCell>
                                <TableCell >{customer.city.name}</TableCell>
                                <TableCell>
                                    <TextField
                                        type="number"
                                        fullWidth
                                        value={salesData[index]?.birds || 0}
                                        onChange={(e) => handleSalesDataChange(index, 'birds', e.target.value)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        type="number"
                                        fullWidth
                                        value={salesData[index]?.kilograms || ''}
                                        onChange={(e) => handleSalesDataChange(index, 'kilograms', e.target.value)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        type="number"
                                        fullWidth
                                        value={salesData[index]?.rate || ''}
                                        onChange={(e) => handleSalesDataChange(index, 'rate', e.target.value)}
                                    />
                                </TableCell>
                                <TableCell>{salesData[index]?.amount || 0}</TableCell>
                                {/* <TableCell>{salesData[index]?.paymentMode || 'cash'}</TableCell> */}
                                <TableCell>
                                    <TextField
                                        type="number"
                                        fullWidth
                                        value={salesData[index]?.payment || 0}
                                        onChange={(e) => handleSalesDataChange(index, 'payment', e.target.value)}
                                    />
                                </TableCell>
                                <TableCell>{salesData[index]?.pending || 0}</TableCell>
                                <TableCell>{salesData[index]?.balanceAmount || 0}</TableCell>
                                <TableCell>
                                    <TextField
                                        fullWidth
                                        value={salesData[index]?.description || ''}
                                        onChange={(e) => handleSalesDataChange(index, 'description', e.target.value)}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                         <TableRow>
                <TableCell><strong>Total</strong></TableCell>
                <TableCell><strong>{calculateTotals().birds}</strong></TableCell>
                <TableCell><strong>{calculateTotals().kilograms}</strong></TableCell>
                <TableCell></TableCell> {/* Optional: If you need a total for rate */}
                <TableCell><strong>{calculateTotals().amount}</strong></TableCell>
                <TableCell><strong>{calculateTotals().payment}</strong></TableCell>
                <TableCell><strong>{calculateTotals().pending}</strong></TableCell>
                <TableCell></TableCell> {/* Optional: If you need a total for balance */}
                <TableCell></TableCell> {/* Optional: If you need a total for description */}
            </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>

            <Grid container spacing={6} style={{ marginTop: '20px' }}>
                <Grid item xs={12} md={4}>
                    <Button variant="contained" color="primary" onClick={handleSubmit} disabled={!isFormValid}>
                        Submit
                    </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Button variant="contained" color="secondary" onClick={handleClear}>
                        Clear
                    </Button>
                </Grid>
            </Grid>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={300}
                onClose={handleCloseSnackbar}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbarSeverity}
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default SalesEntry;
