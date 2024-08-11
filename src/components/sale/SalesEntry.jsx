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
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
} from '@mui/material';
import { getRoutes, getDrivers, getCustomersByRoute, createSalesEntry, getVehicles, saveDialogData, getSaleDetailsByCriteria } from '../service/SalesService';
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

    // State for the Sale Details dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogData, setDialogData] = useState({
        date: '',
        route:'',
        vehicle: '',
        driver: '',
        totalBirds: '',
        mortality: '',
        returnToFarm: '',
        description: ''
    });

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
                        birds: 0,
                        kilograms: '',
                        rate: '',
                        amount: 0,
                        paymentMode: 'cash',
                        payment: 0,
                        pending: 0,
                        balanceAmount: customer.balanceAmount || 0.0,
                        description: '',
                    }));
                    setCustomers(response.data);
                    setSalesData(initialSalesData);
                } catch (error) {
                    console.error('Error fetching customers:', error);
                }
            }
        };

        fetchCustomers();
    }, [selectedRoute]);

    const handleSalesDataChange = useCallback((index, field, value) => {
        setSalesData(prevSalesData => {
            const newData = [...prevSalesData];
            newData[index] = {
                ...newData[index],
                [field]: value,
            };
            if (field === 'rate' || field === 'kilograms') {
                newData[index].amount = newData[index].rate * newData[index].kilograms;
            }
            newData[index].pending = newData[index].amount - newData[index].payment;
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

        try {
            await createSalesEntry(salesEntry);
            setSnackbarMessage('Sales entry created successfully');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            handleClear(); // Clear form on success
        } catch (error) {
            setSnackbarMessage('Error creating sales entry',error);
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
    

    // Functions to open/close the Sale Details dialog
    const handleDialogOpen = async () => {
        if (!date || !selectedRoute || !selectedVehicle || !selectedDriver) {
            setSnackbarMessage('Please select Date, Route, Vehicle, and Driver before opening Sale Details.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
        }
    
        try {
            // Fetch existing sale details based on selected criteria
            const response = await getSaleDetailsByCriteria(date, selectedRoute, selectedVehicle, selectedDriver);
            if (response.data) {
                // If data exists, pre-fill dialog fields
                setDialogData({
                    date: date,
                    route: selectedRoute,
                    vehicle: selectedVehicle,
                    driver: selectedDriver,
                    totalBirds: response.data.totalBirds || '',
                    mortality: response.data.mortality || '',
                    returnToFarm: response.data.returnToFarm || '',
                    description: response.data.description || '',
                });
            } else {
                // If no existing data, set default empty values
                setDialogData({
                    date: date,
                    route: selectedRoute,
                    vehicle: selectedVehicle,
                    driver: selectedDriver,
                    totalBirds: '',
                    mortality: '',
                    returnToFarm: '',
                    description: '',
                });
            }
            setDialogOpen(true);
        } catch (error) {
            console.error('Error fetching sale details:', error);
            setSnackbarMessage('Error fetching sale details');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };
    
    const handleDialogClose = () => {
        setDialogData({
            date: '',
            route:'',
            vehicle: '',
            driver: '',
            totalBirds: '',
            mortality: '',
            returnToFarm: '',
            description: ''
        });
        setDialogOpen(false);
    };
    
    const handleDialogDataChange = (field, value) => {
        setDialogData(prevData => ({
            ...prevData,
            [field]: value
        }));
    };
    
    const handleDialogSubmit = async () => {
        try {
            // Make the API call to save dialog data
            await saveDialogData(dialogData);  // You need to create this service method
    
            // Clear the data and close the dialog
            handleDialogClose();
            setSnackbarMessage('Sales details saved successfully');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            handleClear(); // Clear form on success
        } catch (error) {
            setSnackbarMessage('Error saving sale details: ',error);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };
    

    return (
        <Container>
            <Typography variant="h4" gutterBottom>Sales Entry</Typography>
            <Grid container spacing={6}>
                <Grid item xs={12} md={2}>
                    <TextField
                        label="Date"
                        type="date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </Grid>
                <Grid item xs={12} md={2}>
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
                <Grid item xs={12} md={2}>
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
                <Grid item xs={12} md={2}>
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
                <Grid  item xs={12} md={2}>
                <Button variant="contained" color="primary" onClick={handleDialogOpen}>
                    Sale Details
                </Button>
                </Grid>
            </Grid>

            

            <Typography variant="h5" gutterBottom style={{ marginTop: '20px' }}>Customers</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Customer</TableCell>
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
                                <TableCell>{customer.name}</TableCell>
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

            <Grid container spacing={2} style={{ marginTop: '20px' }}>
                <Grid item>
                    <Button variant="contained" color="primary" onClick={handleSubmit}>
                        Submit
                    </Button>
                </Grid>
                <Grid item>
                    <Button variant="contained" color="secondary" onClick={handleClear}>
                        Clear
                    </Button>
                </Grid>
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

            {/* Sale Details Dialog */}
            <Dialog open={dialogOpen} onClose={handleDialogClose}>
                <DialogTitle>Sale Details</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="normal">
                        <TextField
                            label="Date"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={dialogData.date}
                            // onChange={(e) => handleDialogDataChange('date',e.target.value)}
                            InputProps={{ readOnly: true }}
                        />
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <Select
                            label="Route"
                            fullWidth
                            value={dialogData.route}
                          //  onChange={(e) => handleDialogDataChange('route',e.target.value)}
                          InputProps={{ readOnly: true }}
                            displayEmpty
                        >
                            <MenuItem value=""><em>Select Route</em></MenuItem>
                            {routes.map(route => (
                                <MenuItem key={route.id} value={route.id}>{route.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <Select
                            label="Vehicle"
                            fullWidth
                            value={dialogData.vehicle}
                            InputProps={{ readOnly: true }}
                           // onChange={(e) => handleDialogDataChange('vehicle',e.target.value)}
                            displayEmpty
                        >
                            <MenuItem value=""><em>Select Vehicle</em></MenuItem>
                            {vehicles.map(vehicle => (
                                <MenuItem key={vehicle.id} value={vehicle.id}>{vehicle.vehicleNo}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <Select
                            label="Driver"
                            fullWidth
                            value={dialogData.driver}
                            InputProps={{ readOnly: true }}
                            //onChange={(e) => handleDialogDataChange('driver',e.target.value)}
                            displayEmpty
                        >
                            <MenuItem value=""><em>Select Driver</em></MenuItem>
                            {drivers.map(driver => (
                                <MenuItem key={driver.id} value={driver.id}>{driver.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <TextField
                            label="Total Birds"
                            type="number"
                            fullWidth
                            value={dialogData.totalBirds}
                            onChange={(e) => handleDialogDataChange('totalBirds', e.target.value)}
                        />
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <TextField
                            label="Mortality"
                            type="number"
                            fullWidth
                            value={dialogData.mortality}
                            onChange={(e) => handleDialogDataChange('mortality', e.target.value)}
                        />
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <TextField
                            label="Return to Farm"
                            type="number"
                            fullWidth
                            value={dialogData.returnToFarm}
                            onChange={(e) => handleDialogDataChange('returnToFarm', e.target.value)}
                        />
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <TextField
                            label="Description"
			                type="text"
                            fullWidth
                            value={dialogData.description}
                            onChange={(e) => handleDialogDataChange('description', e.target.value)}
                        />
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDialogClose} color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handleDialogSubmit} color="primary">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default SalesEntry;
