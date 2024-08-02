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
    InputAdornment
} from '@mui/material';
import { Edit, Delete, Search } from '@mui/icons-material';
import { getData, createData , updateData, deleteData} from '../service/MasterDataService';

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

    const dataTypes = ['customers', 'routes', 'drivers', 'cities', 'vehicles','suppliers'];

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

    const fetchData = (type) => {
        // Fetch data of selected dataType
        getData(type)
            .then(response => {
                let modifiedData = response.data;
                if(type==='routes'){
                modifiedData = modifyRoutes(response.data);
                }
                if(type==='customers'){
                    modifiedData = modifyCustomers(response.data);
                    }
                    if(type==='cities'){
                        modifiedData = modifyCities(response.data);
                        }
                setData(modifiedData);
            })
            .catch(error => {
                handleSnackbarError(`Error fetching ${type} data`);
            });
    };
    const modifyRoutes = (routes) => {
        return routes.map(route => {
            return {
                ...route,
                cities: route.cities.map(city => city.name).join(', ')
            };
        });
    };
    const modifyCustomers = (customers) => {
        return customers.map(customer => {
            return {
                ...customer,
                city: customer.city.name,
                route: customer.city.route.name
            };
        });
    };
    const modifyCities = (cities) => {
        return cities.map(({customers, ...city}) => {
            return {
                ...city,
                route:city.route.name
            };
        });
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
        setFormData(rowData);
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
        // Handle form submission (create/update data)
        const apiCall = editMode ? updateData : createData;
        apiCall(dataType, formData.id, formData)
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
        <Container style={{ height: '100vh', overflow: 'auto' }}>
            <Typography variant="h4" gutterBottom>Master Data Management</Typography>
            <Grid container spacing={2}>
                {dataTypes.map(type => (
                    <Grid item key={type}>
                        <Button variant="contained" onClick={() => setDataType(type)}>{type.charAt(0).toUpperCase() + type.slice(1)}</Button>
                    </Grid>
                ))}
                {dataType && (
                    <Grid item>
                        <Button variant="contained" color='success' onClick={() => handleOpenForm(dataType)}>Add New {dataType.charAt(0).toUpperCase() + dataType.slice(1,dataType.length-1)}</Button>
                    </Grid>
                )}
            </Grid>
            {dataType && (
                <>
                    <Typography variant="h5" gutterBottom style={{ marginTop: '20px' }}>{dataType.charAt(0).toUpperCase() + dataType.slice(1)}</Typography>
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
                                            <TableSortLabel
                                                active={sortConfig.key === key}
                                                direction={sortConfig.key === key ? sortConfig.direction : 'asc'}
                                                className={dynamicSortIcon(key)}
                                            ></TableSortLabel>
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
                                            <IconButton onClick={() => handleOpenForm(dataType, row)}>
                                                <Edit />
                                            </IconButton>
                                            <IconButton onClick={() => handleDelete(row.id)}>
                                                <Delete />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}
            <Dialog open={openForm} onClose={handleCloseForm}>
                <DialogTitle>{editMode ? `Edit ${dataType.charAt(0).toUpperCase() + dataType.slice(1)}` : `Add New ${dataType.charAt(0).toUpperCase() + dataType.slice(1)}`}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please fill out the form below to {editMode ? 'update' : 'add'} the {dataType}.
                    </DialogContentText>
                    {Object.keys(data[0] || {}).map(key => (
                        key !== 'id' && (
                            <TextField
                                key={key}
                                margin="dense"
                                label={key.charAt(0).toUpperCase() + key.slice(1)}
                                name={key}
                                fullWidth
                                value={formData[key] || ''}
                                onChange={handleFormChange}
                            />
                        )
                    ))}
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
