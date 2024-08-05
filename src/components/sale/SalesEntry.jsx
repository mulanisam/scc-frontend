import React, { useState, useEffect } from 'react';
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
    FormControl,
    RadioGroup,
    FormControlLabel,
    Radio,
    Snackbar,
    Alert,
} from '@mui/material';
import { getRoutes, getDrivers, getCustomersByRoute, createSalesEntry, getVehicles } from '../service/SalesService'; // Ensure this path is correct
import UserService from '../service/UserService';
import { Navigate } from 'react-router-dom';

const SalesEntry = () => {
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10)); // Auto-select today's date
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

    useEffect(() => {
        if(!UserService.isAuthenticated()){
            window.location.href = '/'; 
        }
        getRoutes()
            .then(response => setRoutes(response.data))
            .catch(error => console.error('Error fetching routes:', error));

        getDrivers()
            .then(response => setDrivers(response.data))
            .catch(error => console.error('Error fetching drivers:', error));

        getVehicles()
            .then(response => setVehicles(response.data))
            .catch(error => console.error('Error fetching vehicles:', error));
        
            
    }, []);

    useEffect(() => {
        if (selectedRoute) {
            getCustomersByRoute(selectedRoute)
                .then(response => {
                    setCustomers(response.data);
                    setSalesData(response.data.map(customer => ({
                        customerId: customer.id,
                        kilograms: '',
                        rate: '',
                        amount: 0,
                        paymentMode: '',
                        payment: 0,
                        pending: 0,
                        description: '',
                    })));
                })
                .catch(error => console.error('Error fetching customers:', error));
        }
    }, [selectedRoute]);

    const handleSalesDataChange = (index, field, value) => {
        const newData = [...salesData];
        newData[index] = {
            ...newData[index],
            [field]: value,
        };
        if (field === 'rate' || field === 'kilograms') {
            newData[index].amount = newData[index].rate * newData[index].kilograms;
        }
        newData[index].pending = newData[index].amount - newData[index].payment;
        setSalesData(newData);
    };

    const handleSubmit = () => {
        if (!selectedRoute || !selectedDriver || !selectedVehicle) {
            setSnackbarMessage('Route, Driver, and Vehicle are mandatory fields.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
        }

        // Filter out customers with incomplete data
        const completedSalesData = salesData.filter(customerData =>
            customerData.kilograms !== '' &&
            customerData.rate !== ''
        );

        const salesEntry = {
            date,
            route: selectedRoute,
            driver: selectedDriver,
            vehicleNo: selectedVehicle,
            salesDetails: completedSalesData
        };

        createSalesEntry(salesEntry)
            .then(response => {
                setSnackbarMessage('Sales entry created successfully');
                setSnackbarSeverity('success');
                setSnackbarOpen(true);
                window.location.reload();  
            })
            .catch(error => {
                setSnackbarMessage('Error creating sales entry');
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
            });
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
        setSalesData([]);
    };

    return (
        <Container style={{ height: '100vh', overflow: 'auto' }}>
            <Typography variant="h4" gutterBottom>Sales Entry</Typography>
            <Grid container spacing={4}>
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
            <Typography variant="h5" gutterBottom style={{ marginTop: '20px' }}>Customers</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Customer</TableCell>
                            <TableCell>Kilograms</TableCell>
                            <TableCell>Rate</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Payment Mode</TableCell>
                            <TableCell>Payment</TableCell>
                            <TableCell>Pending</TableCell>
                            <TableCell>Description</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {customers.map((customer, index) => (
                            <TableRow key={customer.id}>
                                <TableCell>{customer.name}</TableCell>
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
                                <TableCell>
                                    <TextField
                                        type="number"
                                        fullWidth
                                        value={salesData[index]?.amount || 0}
                                        InputProps={{ readOnly: true }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <FormControl component="fieldset">
                                        <RadioGroup
                                            row
                                            value={salesData[index]?.paymentMode || 'cash'}
                                            onChange={(e) => handleSalesDataChange(index, 'paymentMode', e.target.value)}
                                        >
                                            <FormControlLabel value="cash" control={<Radio />} label="Cash" />
                                            <FormControlLabel value="online" control={<Radio />} label="Online" />
                                        </RadioGroup>
                                    </FormControl>
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        type="number"
                                        fullWidth
                                        value={salesData[index]?.payment || 0}
                                        onChange={(e) => handleSalesDataChange(index, 'payment', e.target.value)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        type="number"
                                        fullWidth
                                        value={salesData[index]?.pending || 0}
                                        InputProps={{ readOnly: true }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        type="text"
                                        fullWidth
                                        value={salesData[index]?.description || ''}
                                        onChange={(e) => handleSalesDataChange(index, 'description', e.target.value)}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Grid container spacing={2} style={{ marginTop: '16px', marginBottom: '20px' }}>
                <Grid item>
                    <Button variant="contained" color="primary" onClick={handleSubmit}>Submit</Button>
                </Grid>
                <Grid item>
                    <Button variant="contained" color="secondary" onClick={handleClear}>Clear</Button>
                </Grid>
                {/* <Grid item>
                    <Button variant="contained" color="success">Add new customer</Button>
                </Grid> */}
            </Grid>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default SalesEntry;
