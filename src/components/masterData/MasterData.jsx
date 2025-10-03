// components/masterData/MasterData.jsx
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
  useMediaQuery
} from '@mui/material';
import { Edit, Delete, Search } from '@mui/icons-material';
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
  const [partyVehicles, setPartyVehicles] = useState([]);
  const [parties, setParties] = useState([]);
  const [expirationMessage, setExpirationMessage] = useState('');

  useEffect(() => {
    fetchData(dataType);
  }, [dataType]);

  useEffect(() => {
    if (data.length && sortConfig.key) {
      const sorted = [...data].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
      setData(sorted);
    }
  }, [sortConfig]);

  useEffect(() => {
    if (['customers', 'cities'].includes(dataType)) {
      getData('cities').then(res => setCities(res.data));
    }
    if (['customers', 'cities', 'routes'].includes(dataType)) {
      getData('routes').then(res => setRoutes(res.data));
    }
     
  }, [dataType]);

  useEffect(() => {
    if (dataType === 'vehicles') {
      const today = new Date();
      const messages = [];
      data.forEach(item => {
        const fields = ['passingDate','insuranceDate','fitnessDate','pucdate'];
        const msgs = [];
        fields.forEach(f => {
          if (item[f]) {
            const diff = Math.floor((new Date(item[f]) - today)/(1000*60*60*24));
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

  const fetchData = (type) => {
    getData(type)
      .then(res => {
        let md = res.data;
        if (type === 'routes') md = md.map(r => ({ ...r, cities: r.cities.map(c=>c.name).join(', ') }));
        if (type === 'customers') md = md.map(c => ({ ...c, city: c.city.name, route: c.city.route.name }));
        if (type === 'cities') md = md.map(({customers, ...c})=>({ ...c, route: c.route.name }));
        if (type === 'partyVehicles') md = md.map(pv => ({ ...pv, party: pv.party.name }));
        if (type === 'parties') {md = md.map(p => ({ ...p,partyVehicles: p.partyVehicles ? p.partyVehicles.map(pv => pv.vehicleNumber).join(', ') : ''}));
}
         
        setData(md);
      })
      .catch(() => showSnackbar(`Error fetching ${type}`, 'error'));
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

  const handleOpenForm = (type, row={}) => {
    setDataType(type);
    setFormData({ ...row, obsolete: row.obsolete||0 });
    setEditMode(!!row.id);
    setOpenForm(true);
  };
  const handleCloseForm = () => {
    setOpenForm(false);
    setFormData({});
    setEditMode(false);
  };
  const handleFormChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmitForm = () => {
    const payload = { ...formData, obsolete:false };
    const api = editMode ? updateData : createData;
    api(dataType, formData.id, payload)
      .then(() => {
        showSnackbar(`${capitalize(dataType)} ${editMode?'updated':'created'} successfully`, 'success');
        fetchData(dataType);
        handleCloseForm();
      })
      .catch(() => showSnackbar(`Error ${editMode?'updating':'creating'} ${dataType}`, 'error'));
  };
  const handleDelete = id => {
    deleteData(dataType, id)
      .then(() => {
        showSnackbar(`${capitalize(dataType)} deleted successfully`, 'success');
        fetchData(dataType);
      })
      .catch(() => showSnackbar(`Error deleting ${dataType}`, 'error'));
  };
  const handleSort = key => {
    let dir = 'ascending';
    if (sortConfig.key === key && sortConfig.direction==='ascending') dir='descending';
    setSortConfig({ key, direction:dir });
  };
  const handleSearch = e => setSearchTerm(e.target.value);
  const capitalize = s => s.charAt(0).toUpperCase()+s.slice(1);

  return (
    <Container maxWidth={false} sx={{ py:2, width:'95%', mx:'auto' }}>
      <Paper sx={{ p:2, mb:2 }}>
        <Typography variant="h4" gutterBottom>Master Data Management</Typography>
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              flex: 1,
              minWidth: 0
            }
          }}
        >
          {allTabs.map(type=>(
            <Tab key={type} label={capitalize(type)} />
          ))}
        </Tabs>
        <Box sx={{ mt:2, textAlign:'right' }}>
          <Button
            size="small"
            variant="contained"
            color="success"
            onClick={()=>handleOpenForm(dataType)}
            sx={{ width:'auto', textTransform:'none' }}
          >
            Add {capitalize(dataType.endsWith('s')?dataType.slice(0,-1):dataType)}
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p:2, mb:2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Search..."
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment:(
                  <InputAdornment position="start">
                    <Search/>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item>
            <Typography color="error" variant="body2">{expirationMessage}</Typography>
          </Grid>
        </Grid>

        <TableContainer component={Paper} sx={{ mt:2 }}>
          <Table size={isSmall?'small':'medium'}>
            <TableHead>
              <TableRow sx={{ height:48 }}>
                {(data[0]?Object.keys(data[0]):[]).map(key=>(
                  <TableCell key={key} onClick={()=>handleSort(key)} sx={{ py:0.75 }}>
                    <TableSortLabel
                      active={sortConfig.key===key}
                      direction={sortConfig.key===key?sortConfig.direction:'asc'}
                    />
                    {key.replace(/([a-z])([A-Z])/g,'$1 $2').toUpperCase()}
                  </TableCell>
                ))}
                <TableCell sx={{ py:0.75 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data
                .filter(row=>Object.values(row).some(v=>
                  String(v).toLowerCase().includes(searchTerm.toLowerCase())
                ))
                .map(row=>(
                  <TableRow key={row.id} sx={{ height:48 }}>
                    {Object.values(row).map((val,i)=>(
                      <TableCell key={i} sx={{ py:0.75 }}>{val}</TableCell>
                    ))}
                    <TableCell sx={{ py:0.75 }}>
                      <Box sx={{ display:'inline-flex', gap:0 }}>
                        <IconButton size="small" color="secondary" onClick={()=>handleOpenForm(dataType,row)}>
                          <Edit fontSize="inherit"/>
                        </IconButton>
                        <IconButton size="small" color="error" onClick={()=>handleDelete(row.id)}>
                          <Delete fontSize="inherit"/>
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={openForm} onClose={handleCloseForm} fullWidth maxWidth="md">
        <DialogTitle>
          {editMode ? `Edit ${capitalize(dataType)}` : `Add New ${capitalize(dataType)}`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please fill out the form below to {editMode?'update':'add'} the {dataType}.
          </DialogContentText>
          {(data[0]?Object.keys(data[0]):[]).map(key=>{
            if(['id','obsolete'].includes(key)) return null;
            if (dataType === 'parties' && !editMode) {
              if (key === 'isObsolete' || key.toLowerCase().includes('partyvehicle')) {
                return null; // skip these fields
              }
            }

            // When editing a party, show isObsolete as boolean select, remove partyVehicles input
            if (dataType === 'parties' && editMode) {
              if (key.toLowerCase().includes('partyvehicle')) {
                return null; // skip partyVehicles inputs on edit
              }
              if (key === 'isObsolete') {
                return (
                  <FormControl key={key} fullWidth margin="dense" size="small">
                    <InputLabel>Is Obsolete</InputLabel>
                    <Select
                      name="isObsolete"
                      value={formData.isObsolete === undefined ? '' : formData.isObsolete}
                      onChange={handleFormChange}
                      label="Is Obsolete"
                    >
                      <MenuItem value={true}>True</MenuItem>
                      <MenuItem value={false}>False</MenuItem>
                    </Select>
                  </FormControl>
                );
              }
            }
            // Remove isObsolete from add partyVehicle form
            if (dataType === 'partyVehicles' && !editMode && key === 'isObsolete') {
              return null;
            }

            // In edit mode for partyVehicles, show isObsolete as boolean select
            if (dataType === 'partyVehicles' && editMode && key === 'isObsolete') {
              return (
                <FormControl key={key} fullWidth margin="dense" size="small">
                  <InputLabel>Is Obsolete</InputLabel>
                  <Select
                    name="isObsolete"
                    value={formData.isObsolete === undefined ? '' : formData.isObsolete}
                    onChange={handleFormChange}
                    label="Is Obsolete"
                  >
                    <MenuItem value={true}>True</MenuItem>
                    <MenuItem value={false}>False</MenuItem>
                  </Select>
                </FormControl>
              );
            }

            // Show party dropdown (both add and edit)
            if (dataType === 'partyVehicles' && key === 'party') {
              return (
                <FormControl key={key} fullWidth margin="dense" size="small">
                  <InputLabel>Party</InputLabel>
                  <Select
                    name="party"
                    value={formData.party?.id || formData.party || ''}
                    onChange={handleFormChange}
                    label="Party"
                  >
                    {parties.map(p => (
                      <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );
            }
            if(dataType==='customers'&&key==='city'){
              return (
                <FormControl key={key} fullWidth margin="dense" size="small">
                  <InputLabel>City</InputLabel>
                  <Select
                    name="city"
                    value={formData.city||''}
                    onChange={handleFormChange}
                  >
                    {cities.map(c=>(
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );
            }
            if(['customers','cities'].includes(dataType)&&key==='route'){
              return (
                <FormControl key={key} fullWidth margin="dense" size="small">
                  <InputLabel>Route</InputLabel>
                  <Select
                    name="route"
                    value={formData.route||''}
                    onChange={handleFormChange}
                  >
                    {routes.map(r=>(
                      <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );
            }
            if(dataType==='vehicles'&&['passingDate','insuranceDate','fitnessDate','pucdate'].includes(key)){
              return (
                <TextField
                  key={key}
                  margin="dense"
                  name={key}
                  label={capitalize(key)}
                  type="date"
                  fullWidth
                  size="small"
                  value={formData[key]||''}
                  onChange={handleFormChange}
                  InputLabelProps={{ shrink:true }}
                />
              );
            }
            return (
              <TextField
                key={key}
                margin="dense"
                name={key}
                label={capitalize(key)}
                fullWidth
                size="small"
                value={formData[key]||''}
                onChange={handleFormChange}
              />
            );
          })}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm} size="small">Cancel</Button>
          <Button onClick={handleSubmitForm} size="small">
            {editMode?'Update':'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={()=>setSnackbarOpen(false)}
        anchorOrigin={{ vertical:'top', horizontal:'center' }}
      >
        <Alert severity={snackbarSeverity} onClose={()=>setSnackbarOpen(false)} size="small">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
