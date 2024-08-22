import React, { useState, useEffect } from 'react';
import {
    Container,
    Grid,
    Button,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Snackbar,
    Alert,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    TableSortLabel,
    InputAdornment,
    MenuItem,
    Select,
    FormControl,
    InputLabel
} from '@mui/material';
import { Edit, Delete, Search } from '@mui/icons-material';
import { getData, createData, updateData, deleteData } from '../service/MasterDataService';

const MasterData = () => {
    const [dataType, setDataType] = useState('');
    const [data, setData] = useState([]);
    const [openForm, setOpenForm] = useState(false);
    const [formData, setFormData] = useState({});
    const [editMode, setEditMode] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [searchTerm, setSearchTerm] = useState('');
    const [cities, setCities] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [selectedCity, setSelectedCity] = useState(formData.city || '');
    const [selectedRoute, setSelectedRoute] = useState(formData.route || '');
    const [expirationMessage, setExpirationMessage] = useState('');

    const dataTypes = ['customers', 'routes', 'drivers', 'cities', 'vehicles', 'suppliers'];

    useEffect(() => {
        // Fetch data when dataType changes
        if (dataType) {
            fetchData(dataType);
        }
    }, [dataType]);

    useEffect(() => {
        if (data.length > 0 && sortConfig.key !== null) {
            const sortedData = [...data].sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
            setData(sortedData);
        }
    }, [sortConfig]);

    useEffect(() => {
        // Fetch cities and routes for dropdowns
        if (dataType === 'customers' || dataType === 'cities') {
            getData('cities').then(response => setCities(response.data));
        }
        if (dataType === 'customers' || dataType === 'cities' || dataType === 'routes') {
            getData('routes').then(response => setRoutes(response.data));
        }
    }, [dataType]);

    useEffect(() => {
        // Update expiration message when data changes
        updateExpirationMessages(data);
    }, [data]);
    const updateExpirationMessages = (data) => {
        if (dataType === 'vehicles') {
            const currentDate = new Date();
            const expirationMessages = [];
    
            data.forEach((item) => {
                const vehicleNo = item.vehicleNo; // Assuming vehicleNo is the field name
                const dateFields = ['passingDate', 'insuranceDate', 'fitnessDate', 'pucdate']; // Adjust based on your date fields
                const messages = [];
    
                dateFields.forEach((field) => {
                    if (item[field]) {
                        const date = new Date(item[field]);
                        const diffDays = Math.floor((date - currentDate) / (1000 * 60 * 60 * 24));
    
                        if (diffDays <= 0) {
                            // Date is already expired
                            messages.push(`${field} expired`);
                        } else if (diffDays <= 30 && diffDays > 0) {
                            // Date is within 30 days
                            messages.push(`${field} expiring in ${diffDays} days!`);
                        }
                    }
                });
    
                if (messages.length > 0) {
                    expirationMessages.push(`${vehicleNo} ${messages.join(', ')}`);
                }
            });
    
            setExpirationMessage(expirationMessages.join(' | '));
        } else {
            setExpirationMessage('');
        }
    };
    
    
    const fetchData = (type) => {
        // Fetch data of selected dataType
        getData(type)
            .then(response => {
                let modifiedData = response.data;
                if (type === 'routes') {
                    modifiedData = modifyRoutes(response.data);
                }
                if (type === 'customers') {
                    modifiedData = modifyCustomers(response.data);
                }
                if (type === 'cities') {
                    modifiedData = modifyCities(response.data);
                }
                setData(modifiedData);
            })
            .catch(error => {
                handleSnackbarError(`Error fetching ${type} data`);
            });
    };

    const modifyRoutes = (routes) => {
        return routes.map(route => ({
            ...route,
            cities: route.cities.map(city => city.name).join(', ')
        }));
    };

    const modifyCustomers = (customers) => {
        return customers.map(customer => ({
            ...customer,
            city: customer.city.name,
            route: customer.city.route.name
        }));
    };

    const modifyCities = (cities) => {
        return cities.map(({ customers, ...city }) => ({
            ...city,
            route: city.route.name
        }));
    };

    const handleSnackbarError = (message) => {
        // Display Snackbar for error messages
        setSnackbarMessage(message);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
    };

    const handleOpenForm = (type, rowData = {}) => {
        // Open form for adding/editing data
        setDataType(type);
        setFormData({ ...rowData, obsolete: rowData.obsolete || 0 });
        setEditMode(!!rowData.id);
        setOpenForm(true);
    };

    const handleCloseForm = () => {
        // Close form
        setOpenForm(false);
        setFormData({});
        setEditMode(false);
    };

    const handleFormChange = (e) => {
        // Update form data on change
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmitForm = () => {
        const payload = {
            ...formData,
            obsolete: false  // Ensure 'obsolete' is always set to false
        };
        console.log("payload",payload);
        const apiCall = editMode ? updateData : createData;
        apiCall(dataType,formData.id,payload)
            .then(() => {
                handleSnackbarSuccess(`${dataType} ${editMode ? 'updated' : 'created'} successfully`);
                fetchData(dataType);
                handleCloseForm();
            })
            .catch(error => {
                handleSnackbarError(`Error ${editMode ? 'updating' : 'creating'} ${dataType}`);
            });
    };

    const handleDelete = (id) => {
        // Handle data deletion
        deleteData(dataType, id)
            .then(() => {
                handleSnackbarSuccess(`${dataType} deleted successfully`);
                fetchData(dataType);
            })
            .catch(error => {
                handleSnackbarError(`Error deleting ${dataType}`);
            });
    };

    const handleSnackbarSuccess = (message) => {
        // Display Snackbar for success messages
        setSnackbarMessage(message);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
    };

    const handleCloseSnackbar = () => {
        // Close Snackbar
        setSnackbarOpen(false);
    };

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const dynamicSortIcon = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'ascending' ? 'sorted ascending' : 'sorted descending';
        }
        return 'sortable';
    };

    return (
        <Container style={{ height: 'auto', overflow: 'auto' }}>
            <Typography variant="h4" gutterBottom>Master Data Management</Typography>
            <Grid container spacing={2}>
                {dataTypes.map(type => (
                    <Grid item key={type}>
                        <Button variant="contained" onClick={() => setDataType(type)}>{type.charAt(0).toUpperCase() + type.slice(1)}</Button>
                    </Grid>
                ))}
                {dataType && (
                    <Grid item>
                        <Button variant="contained" color="success" onClick={() => handleOpenForm(dataType)}>Add New {dataType.charAt(0).toUpperCase() + dataType.slice(1, -1)}</Button>
                    </Grid>
                )}
            </Grid>
            {dataType && (
                <>
                    <Typography variant="h5" gutterBottom style={{ marginTop: '20px' }}>{dataType.charAt(0).toUpperCase() + dataType.slice(1)}</Typography>
                    <Grid container spacing={2} alignItems="center">
                <Grid item>
                    <TextField
                        style={{ marginBottom: '10px' }}
                        variant="outlined"
                        placeholder="Search..."
                        onChange={handleSearch}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Grid>
                <Grid item>
                    <Typography variant="body1" color="error">
                        {expirationMessage}
                    </Typography>
                </Grid>
            </Grid>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    {Object.keys(data[0] || {}).map(key => (
                                        <TableCell key={key} onClick={() => handleSort(key)}>
                                            <TableSortLabel
                                                active={sortConfig.key === key}
                                                direction={sortConfig.key === key ? sortConfig.direction : 'asc'}
                                                className={dynamicSortIcon(key)}
                                            ></TableSortLabel>
                                            {key.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase()}
                                        </TableCell>
                                    ))}
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.filter((row) =>
                                    Object.values(row).some(
                                        (value) =>
                                            String(value).toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                ).map(row => (
                                    <TableRow key={row.id}>
                                        {Object.values(row).map((value, index) => (
                                            <TableCell key={index}>{value}</TableCell>
                                        ))}
                                        <TableCell>
                                        <Grid item xs={12} sm={2} style={{ display: 'flex', alignItems: 'center' }}>
                                            <IconButton  color="secondary" onClick={() => handleOpenForm(dataType, row)} style={{ marginRight: '8px', width: '40px', height: '40px' }}>
                                                <Edit />
                                            </IconButton>
                                            <IconButton color="error" onClick={() => handleDelete(row.id)} style={{ marginRight: '8px', width: '40px', height: '40px' }}>
                                                <Delete />
                                            </IconButton>
                                            </Grid>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}
           <Dialog open={openForm} onClose={handleCloseForm}>
    <DialogTitle>
        {editMode ? `Edit ${dataType.charAt(0).toUpperCase() + dataType.slice(1)}` : `Add New ${dataType.charAt(0).toUpperCase() + dataType.slice(1)}`}
    </DialogTitle>
    <DialogContent>
        <DialogContentText>
            Please fill out the form below to {editMode ? 'update' : 'add'} the {dataType}.
        </DialogContentText>
        {Object.keys(data[0] || {}).map(key => {
            if (key !== 'id' && key !== 'obsolete') {
                if (dataType === 'customers' && key === 'city') {
                    return (
                        <FormControl key={key} fullWidth margin="dense">
                            <InputLabel>{key.charAt(0).toUpperCase() + key.slice(1)}</InputLabel>
                            <Select
                                value={formData[key] || ''}
                                name={key}
                                onChange={handleFormChange}
                            >
                                {cities.map(city => (
                                    <MenuItem key={city.id} value={city.id}>{city.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    );
                }
                if ((dataType === 'customers' || dataType === 'cities') && key === 'route') {
                    return (
                        <FormControl key={key} fullWidth margin="dense">
                            <InputLabel>{key.charAt(0).toUpperCase() + key.slice(1)}</InputLabel>
                            <Select
                                value={formData[key] || ''}
                                name={key}
                                onChange={handleFormChange}
                            >
                                {routes.map(route => (
                                    <MenuItem key={route.id} value={route.id}>{route.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    );
                }
                if (dataType === 'vehicles' && (key === 'passingDate' || key === 'insuranceDate' || key === 'fitnessDate' || key === 'pucdate')) {
                    return (
                        <TextField
                            key={key}
                            margin="dense"
                            label={key.charAt(0).toUpperCase() + key.slice(1)}
                            name={key}
                            type="date"
                            fullWidth
                            value={formData[key] || ''}
                            onChange={handleFormChange}
                            InputLabelProps={{
                                shrink: true,
                            }}
                        />
                    );
                }
                return (
                    <TextField
                        key={key}
                        margin="dense"
                        label={key.charAt(0).toUpperCase() + key.slice(1)}
                        name={key}
                        fullWidth
                        value={formData[key] || ''}
                        onChange={handleFormChange}
                    />
                );
            }
            return null;
        })}
    </DialogContent>
    <DialogActions>
        <Button onClick={handleCloseForm} color="primary">Cancel</Button>
        <Button onClick={handleSubmitForm} color="primary">{editMode ? 'Update' : 'Add'}</Button>
    </DialogActions>
</Dialog>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
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

export default MasterData;
