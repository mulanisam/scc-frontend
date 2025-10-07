import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Grid,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableSortLabel,
  useTheme,
  useMediaQuery,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Tooltip,
  Fab,
  Badge,
  CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Storage as StorageIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import UserService from '../service/UserService';
import {
  getData,
  createData,
  updateData,
  deleteData,
} from '../service/MasterDataService';

const baseDataTypes = [
  'customers',
  'routes', 
  'drivers',
  'cities',
  'vehicles',
  'suppliers',
];

const adminDataTypes = ['parties', 'partyVehicles'];

export default function MasterData() {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const allTabs = UserService.adminOnly()
    ? [...baseDataTypes, ...adminDataTypes]
    : baseDataTypes;

  const [tabIndex, setTabIndex] = useState(0);
  const [dataType, setDataType] = useState(allTabs[0]);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [searchTerm, setSearchTerm] = useState('');
  const [cities, setCities] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [parties, setParties] = useState([]);
  const [expirationMessage, setExpirationMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  // CSS to remove number input arrows
  const numberInputStyles = `
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    
    input[type="number"] {
      -moz-appearance: textfield;
    }
  `;

  useEffect(() => {
    fetchData(dataType);
  }, [dataType]);

  useEffect(() => {
    // Filter and sort data
    let filtered = data.filter(row => 
      Object.values(row).some(v =>
        String(v).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    setFilteredData(filtered);
  }, [data, searchTerm, sortConfig]);

  useEffect(() => {
    if (['customers', 'cities'].includes(dataType)) {
      getData('cities').then(res => setCities(res.data));
    }
    if (['customers', 'cities', 'routes'].includes(dataType)) {
      getData('routes').then(res => setRoutes(res.data));
    }
    if (dataType === 'partyVehicles') {
      getData('parties').then(res => setParties(res.data));
    }
  }, [dataType]);

  useEffect(() => {
    if (dataType === 'vehicles') {
      const today = new Date();
      const messages = [];
      data.forEach(item => {
        const fields = ['passingDate', 'insuranceDate', 'fitnessDate', 'pucdate'];
        const msgs = [];
        fields.forEach(f => {
          if (item[f]) {
            const diff = Math.floor((new Date(item[f]) - today) / (1000 * 60 * 60 * 24));
            if (diff <= 0) msgs.push(`${f} expired`);
            else if (diff <= 30) msgs.push(`${f} expiring in ${diff} days!`);
          }
        });
        if (msgs.length) messages.push(`${item.vehicleNo} ${msgs.join(', ')}`);
      });
      setExpirationMessage(messages.join(' | '));
    } else {
      setExpirationMessage('');
    }
  }, [data, dataType]);

  const fetchData = async (type) => {
    setLoading(true);
    try {
      const res = await getData(type);
      let md = res.data;
      if (type === 'routes') md = md.map(r => ({ ...r, cities: r.cities.map(c => c.name).join(', ') }));
      if (type === 'customers') md = md.map(c => ({ ...c, city: c.city.name, route: c.city.route.name }));
      if (type === 'cities') md = md.map(({ customers, ...c }) => ({ ...c, route: c.route.name }));
      if (type === 'partyVehicles') md = md.map(pv => ({ ...pv, party: pv.party.name }));
      if (type === 'parties') {
        md = md.map(p => ({ ...p, partyVehicles: p.partyVehicles ? p.partyVehicles.map(pv => pv.vehicleNumber).join(', ') : '' }));
      }
      setData(md);
    } catch (error) {
      showSnackbar(`Error fetching ${type}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (msg, sev) => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(sev);
    setSnackbarOpen(true);
  };

  const handleTabChange = (e, idx) => {
    setTabIndex(idx);
    setDataType(allTabs[idx]);
    setSearchTerm('');
    setSortConfig({ key: null, direction: 'ascending' });
  };

  const handleOpenForm = (type, row = {}) => {
    setDataType(type);
    setFormData({ ...row, obsolete: row.obsolete || 0 });
    setEditMode(!!row.id);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setFormData({});
    setEditMode(false);
  };

  const handleFormChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmitForm = async () => {
    setSubmitting(true);
    try {
      const payload = { ...formData, obsolete: false };
      const api = editMode ? updateData : createData;
      await api(dataType, formData.id, payload);
      showSnackbar(`${capitalize(dataType)} ${editMode ? 'updated' : 'created'} successfully`, 'success');
      fetchData(dataType);
      handleCloseForm();
    } catch (error) {
      showSnackbar(`Error ${editMode ? 'updating' : 'creating'} ${dataType}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = (id) => {
    setConfirmDelete({ open: true, id });
  };

  const handleDelete = async () => {
    try {
      await deleteData(dataType, confirmDelete.id);
      showSnackbar(`${capitalize(dataType)} deleted successfully`, 'success');
      fetchData(dataType);
      setConfirmDelete({ open: false, id: null });
    } catch (error) {
      showSnackbar(`Error deleting ${dataType}`, 'error');
    }
  };

  const handleSort = key => {
    let dir = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') dir = 'descending';
    setSortConfig({ key, direction: dir });
  };

  const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <style>{numberInputStyles}</style>

      {/* Fixed Header Section */}
      <Box sx={{ flexShrink: 0 }}>
        <Container maxWidth="xl" sx={{ py: 2 }}>
          {/* Header - Navbar Style */}
          <Paper elevation={2} sx={{ 
            mb: 2, 
            borderRadius: 2, 
            bgcolor: 'primary.main',
            color: 'white',
            p: 1.5
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <StorageIcon sx={{ fontSize: 28, color: 'white' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                  Master Data Management
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip 
                  label={`${capitalize(dataType)}`} 
                  sx={{ 
                    bgcolor: 'white', 
                    color: 'primary.main',
                    fontWeight: 600
                  }}
                />
                <Badge badgeContent={data.length} color="secondary">
                  <CheckCircleIcon sx={{ color: 'white' }} />
                </Badge>
              </Box>
            </Box>
          </Paper>

          {/* Navigation Tabs */}
          <Card elevation={3} sx={{ mb: 2, borderRadius: 2 }}>
            <CardContent sx={{ p: 0 }}>
              <Tabs 
                value={tabIndex} 
                onChange={handleTabChange} 
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 500,
                    minWidth: 'auto',
                    px: 2,
                    py: 1.5
                  },
                  '& .Mui-selected': {
                    fontWeight: 600,
                    color: 'primary.main'
                  }
                }}
              >
                {allTabs.map(type => (
                  <Tab key={type} label={capitalize(type)} />
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Search and Controls */}
          <Card elevation={3} sx={{ mb: 2, borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    placeholder={`Search ${dataType}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="primary" />
                        </InputAdornment>
                      ),
                      endAdornment: searchTerm && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={clearSearch}>
                            <ClearIcon />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenForm(dataType)}
                      size="small"
                      sx={{ textTransform: 'none' }}
                    >
                      Add New
                    </Button>
                    
                    <Tooltip title="Refresh Data">
                      <IconButton 
                        color="primary" 
                        onClick={() => fetchData(dataType)}
                        disabled={loading}
                      >
                        {loading ? <CircularProgress size={20} /> : <FilterIcon />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Grid>
                
                {expirationMessage && (
                  <Grid item xs={12}>
                    <Alert 
                      severity="warning" 
                      sx={{ borderRadius: 2 }}
                      icon={<WarningIcon />}
                    >
                      <Typography variant="body2">
                        <strong>Vehicle Expiration Alerts:</strong> {expirationMessage}
                      </Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Container>
      </Box>

      {/* Scrollable Data Table Section */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Container maxWidth="xl" sx={{ height: '100%', pb: 2 }}>
          <Card elevation={3} sx={{ height: '100%', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
            <CardHeader 
              title={`${capitalize(dataType)} Data`}
              action={
                <Chip 
                  label={`${filteredData.length} of ${data.length} records`}
                  color="primary"
                  size="small"
                />
              }
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                py: 1,
                flexShrink: 0,
                '& .MuiCardHeader-title': { fontWeight: 600, fontSize: '0.9rem', color: 'white' }
              }}
            />
            
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              {loading ? (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '200px' 
                }}>
                  <CircularProgress size={60} />
                  <Typography variant="h6" sx={{ ml: 2 }}>Loading...</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        {(data[0] ? Object.keys(data[0]) : []).map(key => (
                          <TableCell 
                            key={key} 
                            sx={{ 
                              fontWeight: 'bold',
                              bgcolor: '#f5f5f5',
                              color: 'primary.main',
                              py: 1,
                              fontSize: '0.85rem',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <TableSortLabel 
                              active={sortConfig.key === key}
                              direction={sortConfig.key === key ? sortConfig.direction : 'asc'}
                              onClick={() => handleSort(key)}
                            >
                              {key.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase()}
                            </TableSortLabel>
                          </TableCell>
                        ))}
                        <TableCell sx={{ 
                          fontWeight: 'bold',
                          bgcolor: '#f5f5f5',
                          color: 'primary.main',
                          py: 1,
                          fontSize: '0.85rem'
                        }}>
                          ACTIONS
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredData.map(row => (
                        <TableRow 
                          key={row.id} 
                          hover
                          sx={{ '& td': { py: 0.5, fontSize: '0.85rem' } }}
                        >
                          {Object.values(row).map((val, i) => (
                            <TableCell 
                              key={i}
                              sx={{ whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            >
                              {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : val}
                            </TableCell>
                          ))}
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="Edit">
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={() => handleOpenForm(dataType, row)}
                                  sx={{ p: 0.5 }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Delete">
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => handleDeleteConfirm(row.id)}
                                  sx={{ p: 0.5 }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredData.length === 0 && (
                        <TableRow>
                          <TableCell 
                            colSpan={(data[0] ? Object.keys(data[0]).length : 0) + 1} 
                            sx={{ textAlign: 'center', py: 4 }}
                          >
                            <Typography variant="body1" color="text.secondary">
                              {searchTerm ? 'No matching records found' : 'No data available'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Card>
        </Container>
      </Box>

      {/* Form Dialog */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 600 }}>
          {editMode ? `Edit ${capitalize(dataType)}` : `Add New ${capitalize(dataType)}`}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <DialogContentText sx={{ mb: 3 }}>
            Please fill out the form below to {editMode ? 'update' : 'add'} the {dataType}.
          </DialogContentText>
          
          <Grid container spacing={2}>
            {(data[0] ? Object.keys(data[0]) : []).map(key => {
              if (['id', 'obsolete'].includes(key)) return null;

              // Handle special field types
              if (dataType === 'vehicles' && ['passingDate', 'insuranceDate', 'fitnessDate', 'pucdate'].includes(key)) {
                return (
                  <Grid item xs={12} sm={6} key={key}>
                    <TextField
                      fullWidth
                      name={key}
                      label={key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase())}
                      type="date"
                      value={formData[key] || ''}
                      onChange={handleFormChange}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Grid>
                );
              }

              if (dataType === 'customers' && key === 'city') {
                return (
                  <Grid item xs={12} sm={6} key={key}>
                    <FormControl fullWidth size="small">
                      <InputLabel>City</InputLabel>
                      <Select
                        name={key}
                        value={formData[key] || ''}
                        onChange={handleFormChange}
                      >
                        {cities.map(c => (
                          <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                );
              }

              if (['customers', 'cities'].includes(dataType) && key === 'route') {
                return (
                  <Grid item xs={12} sm={6} key={key}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Route</InputLabel>
                      <Select
                        name={key}
                        value={formData[key] || ''}
                        onChange={handleFormChange}
                      >
                        {routes.map(r => (
                          <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                );
              }

              if (dataType === 'partyVehicles' && key === 'party') {
                return (
                  <Grid item xs={12} sm={6} key={key}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Party</InputLabel>
                      <Select
                        name={key}
                        value={formData[key] || ''}
                        onChange={handleFormChange}
                      >
                        {parties.map(p => (
                          <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                );
              }

              return (
                <Grid item xs={12} sm={6} key={key}>
                  <TextField
                    fullWidth
                    name={key}
                    label={key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase())}
                    value={formData[key] || ''}
                    onChange={handleFormChange}
                    type={typeof data[0]?.[key] === 'number' ? 'number' : 'text'}
                    size="small"
                  />
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={handleCloseForm} 
            color="secondary"
            startIcon={<CancelIcon />}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitForm} 
            variant="contained" 
            color="primary"
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : (editMode ? 'Update' : 'Add')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, id: null })}>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 600 }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this {dataType}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDelete({ open: false, id: null })} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
          elevation={6}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
