import React, { useState, useEffect } from 'react';
import { Container, Typography, TextField, Grid, Button, MenuItem, IconButton,Snackbar,Alert, Dialog,DialogTitle, DialogContent, DialogContentText} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchSuppliers, fetchVehicles, fetchDrivers, submitPurchase, fetchPurchaseDetails,submitPayment} from '../service/PurchaseService';

const PurchaseEntryPage = () => {
  const [tableRows, setTableRows] = useState([{ srNo: 1, dcNo: '', nos: '', kilograms: '', rate: '', amount: '' }]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10)); 
  const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [formData, setFormData] = useState({
    entryDate: date,
    vehicle: '',
    driver: '',
    supplier: '',
    branch: '',
    farm: '',
    supervisorName: '',
    supervisorPhoneNo: '',
    driverExpense: '',
    diesel: '',
    hamali: '',
    notes: '',
    dcDetails: tableRows
  });
  const [suppliers, setSuppliers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [files, setFiles] = useState([]);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    dateOfPurchase: '',
    dateOfTransaction: '',
    trans_id: '',
    totalAmount: '',
    paidAmount: '',
    pendingPayment: '',
    comment: '',
    supplier: ''
  });
  const clearPaymentData = () => {
    setPaymentData({
      dateOfPurchase: '',
      dateOfTransaction: '',
      trans_id: '',
      totalAmount: '',
      paidAmount: '',
      pendingPayment: '',
      comment: '',
      supplier: ''
    });
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppliersData, vehiclesData, driversData] = await Promise.all([fetchSuppliers(), fetchVehicles(), fetchDrivers()]);
        setSuppliers(suppliersData);
        setVehicles(vehiclesData);
        setDrivers(driversData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setSnackbarMessage('Error fetching data:', error);
        setSnackbarSeverity('error');
      setSnackbarOpen(true);
      }
    };
    fetchData();
  }, []);

  const addRow = () => {
    const newRow = { srNo: tableRows.length + 1, dcNo: '', nos: '', kilograms: '', rate: '', amount: '' };
    setTableRows([...tableRows, newRow]);
  };

  const deleteRow = (index) => {
    if (tableRows.length === 1) return;
    const updatedRows = [...tableRows.slice(0, index), ...tableRows.slice(index + 1)];
    setTableRows(updatedRows.map((row, idx) => ({ ...row, srNo: idx + 1 })));
    setFormData({ ...formData, dcDetails: updatedRows });
  };

  const handleTableChange = (index, field, value) => {
    const updatedRows = [...tableRows];
    updatedRows[index][field] = value;
    if (field === 'rate' || field === 'kilograms') {
      const rate = parseFloat(updatedRows[index].rate) || 0;
      const kilograms = parseFloat(updatedRows[index].kilograms) || 0;
      updatedRows[index].amount = (rate * kilograms).toFixed(2);
    }
    setTableRows(updatedRows);
    setFormData({ ...formData, dcDetails: updatedRows });
  };

  const calculateTotalAmount = () => {
    const total = parseFloat(formData.driverExpense || 0) + parseFloat(formData.diesel || 0) + parseFloat(formData.hamali || 0);
    return isNaN(total) ? '' : total.toFixed(2);
  };
  const calculateTotal = (field) => {
    return tableRows.reduce((total, row) => total + (parseFloat(row[field]) || 0), 0).toFixed(2);
  };
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    const MAX_FILE_SIZE_MB = 5;
    const fileSizeInMB = selectedFile.size / (1024 * 1024);
    if (fileSizeInMB > MAX_FILE_SIZE_MB) {
      setSnackbarMessage(`File size exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB} MB.`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      event.target.value = null;
    } else {
      setFiles([...files, selectedFile]);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.entryDate || !formData.vehicle || !formData.supplier || !formData.driver) {
      setSnackbarMessage('Date, Vehicle No, and Supplier are mandatory fields.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    if (tableRows.some(row => !row.nos || !row.kilograms)) {
      setSnackbarMessage('Nos and Kilograms are mandatory in entry details.');
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
      return;
    }

    const purchaseEntry = {
      entryDate: formData.entryDate,
      vehicle: formData.vehicle,
      driver: formData.driver,
      supplier: formData.supplier,
      branch: formData.branch,
      farm: formData.farm,
      supervisorName: formData.supervisorName,
      supervisorPhoneNo: formData.supervisorPhoneNo,
      driverExpense: formData.driverExpense,
      diesel: formData.diesel,
      hamali: formData.hamali,
      notes: formData.notes,
      dcDetails: formData.dcDetails
    };

    const data = new FormData();
    data.append('purchaseEntry', JSON.stringify(purchaseEntry));
    files.forEach((file, index) => {
      data.append(`files`, file);
    });
    

    try {
      
       submitPurchase(data).then
       (response => {
                setSnackbarMessage('Purchase Entry created successfully');
                setSnackbarSeverity('success');
                setSnackbarOpen(true);
                window.location.reload();
              }).catch(error => {
                setSnackbarMessage('Error creating Purchase Entry');
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
          });
    } catch (error) {
                setSnackbarMessage('Error creating Purchase Entry');
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
    }
  };

  const handleClear = () => {
    setFormData({
      entryDate: date,
      vehicle: '',
      driver: '',
      supplier: '',
      branch: '',
      farm: '',
      supervisorName: '',
      supervisorPhoneNo: '',
      driverExpense: '',
      diesel: '',
      hamali: '',
      notes: '',
      dcDetails: []
    });
    setTableRows([{ srNo: 1, dcNo: '', nos: '', kilograms: '', rate: '', amount: '' }]);
    setFiles([]);
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
        return;
    }
    setSnackbarOpen(false);
};

const handleOpenPaymentDialog = () => {
  setPaymentDialogOpen(true);
};

const handleClosePaymentDialog = () => {
  clearPaymentData();
  setPaymentDialogOpen(false);
};

const handlePaymentChange = async (event) => {
  const { name, value } = event.target;
  const newPaymentData = { ...paymentData, [name]: value };

  if ((name === 'supplier' && newPaymentData.dateOfPurchase) || (name === 'dateOfPurchase' && newPaymentData.supplier)) {
    try {
      const purchaseDetails = await fetchPurchaseDetails(newPaymentData.supplier, newPaymentData.dateOfPurchase);
      newPaymentData.totalAmount = purchaseDetails.totalAmount || 0;
      newPaymentData.paidAmount = purchaseDetails.paidAmount || 0;
      newPaymentData.pendingPayment = (parseFloat(newPaymentData.totalAmount) - parseFloat(newPaymentData.paidAmount)).toFixed(2);
    } catch (error) {
      setSnackbarMessage('Error fetching purchase details.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  } else {
    if (name === 'totalAmount' || name === 'paidAmount') {
      const totalAmount = parseFloat(newPaymentData.totalAmount) || 0;
      const paidAmount = parseFloat(newPaymentData.paidAmount) || 0;
      newPaymentData.pendingPayment = (totalAmount - paidAmount).toFixed(2);
    }
  }

  setPaymentData(newPaymentData);
};


const handlePaymentSubmit = async (event) => {
  event.preventDefault();
  try {
      
    submitPayment(paymentData).then
    (response => {
             setSnackbarMessage('Payment Entry created successfully');
             setSnackbarSeverity('success');
             setSnackbarOpen(true);
             clearPaymentData();
           }).catch(error => {
             setSnackbarMessage('Error creating Payment Entry');
             setSnackbarSeverity('error');
             setSnackbarOpen(true);
       });
 } catch (error) {
             setSnackbarMessage('Error creating Payment Entry');
             setSnackbarSeverity('error');
             setSnackbarOpen(true);
 }
};

  return (
    <div style={{ height: 'calc(100vh - 64px)', overflow: 'auto' }}>
      <Container>
        
        <Typography variant="h4" gutterBottom>
          Purchase Entry
        </Typography>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Entry Date"
                type="date"
                fullWidth
                name="entryDate"
                value={formData.entryDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField select label="Vehicle No" fullWidth name="vehicle" value={formData.vehicle} onChange={handleChange} required>
                {vehicles.map((vehicle) => (
                  <MenuItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicleNo}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField select label="Driver" fullWidth name="driver" value={formData.driver} onChange={handleChange} required>
                {drivers.map((driver) => (
                  <MenuItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField select label="Supplier" fullWidth name="supplier" value={formData.supplier} onChange={handleChange} required>
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField label="Branch" fullWidth name="branch" value={formData.branch} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField label="Farm" fullWidth name="farm" value={formData.farm} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField label="Supervisor Name" fullWidth name="supervisorName" value={formData.supervisorName} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Supervisor Phone No"
                type="number"
                fullWidth
                name="supervisorPhoneNo"
                value={formData.supervisorPhoneNo}
                onChange={handleChange}
                inputProps={{ maxLength: 10, minLength: 10 }}
              />
            </Grid>
          </Grid>
          <Typography variant="h5" gutterBottom>
            Entry Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <table>
                <thead>
                  <tr>
                    <th>Sr No</th>
                    <th>DC No</th>
                    <th>Nos</th>
                    <th>Kilograms</th>
                    <th>Rate</th>
                    <th>Amount</th>
                    <th>DC File</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, index) => (
                    <tr key={index}>
                      <td>{row.srNo}</td>
                      <td>
                        <TextField
                          fullWidth
                          value={row.dcNo}
                          onChange={(e) => handleTableChange(index, 'dcNo', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <TextField
                          fullWidth
                          name='nos'
                          type="number"
                          value={row.nos}
                          onChange={(e) => handleTableChange(index, 'nos', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <TextField
                          fullWidth
                          name='kilograms'
                          type="number"
                          value={row.kilograms}
                          onChange={(e) => handleTableChange(index, 'kilograms', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <TextField
                          fullWidth
                          value={row.rate}
                          onChange={(e) => handleTableChange(index, 'rate', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <TextField
                          fullWidth
                          name='amount'
                          type="number"
                          value={row.amount}
                          onChange={(e) => handleTableChange(index, 'amount', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} />
                      </td>
                      <td>
                        {index === 0 ? (
                          <IconButton onClick={addRow}>
                            <AddIcon />
                          </IconButton>
                        ) : (
                          <IconButton onClick={() => deleteRow(index)}>
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <th colSpan={2}>Total</th>
                    <th>{calculateTotal('nos')}</th>
                    <th>{calculateTotal('kilograms')}</th>
                    <th></th>
                    <th>{calculateTotal('amount')}</th>
                    <th colSpan={2}></th>
                  </tr>
                </tbody>
              </table>
            </Grid>
          </Grid>
          <Typography variant="h5" gutterBottom>
            Expenses
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField label="Expense Paid to Driver" type="number" fullWidth name="driverExpense" value={formData.driverExpense} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Diesel Amount" type="number" fullWidth name="diesel" value={formData.diesel} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Hamali Amount" type="number" fullWidth name="hamali" value={formData.hamali} onChange={handleChange} />
            </Grid>
          </Grid>
          <Typography variant="h6" gutterBottom>
            Total Expenses: {calculateTotalAmount()}
          </Typography>
          <TextField label="Notes" multiline rows={4} fullWidth name="notes" value={formData.notes} onChange={handleChange} />
          <Grid container spacing={2} style={{ marginTop: '16px' }}>
            <Grid item>
              <Button variant="contained" color="primary" type="submit">Submit</Button>
            </Grid>
            <Grid item>
              <Button variant="contained" color="secondary" type="reset" onClick={handleClear}>Clear</Button>
            </Grid>
            <Grid item >
              <Button variant="contained" color="primary" onClick={handleOpenPaymentDialog}>
                Payment Details
              </Button>
            </Grid>
          </Grid>
        </form>
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
            <Dialog open={paymentDialogOpen} onClose={handleClosePaymentDialog}>
  <DialogTitle>Payment Details</DialogTitle>
  <DialogContent>
    <DialogContentText>
      Please fill in the payment details for the purchase.
    </DialogContentText>
    <form onSubmit={handlePaymentSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Supplier"
            select
            fullWidth
            name="supplier"
            value={paymentData.supplier}
            onChange={handlePaymentChange}
            required
          >
            {suppliers.map((supplier) => (
              <MenuItem key={supplier.id} value={supplier.id}>
                {supplier.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Date of Purchase"
            type="date"
            name="dateOfPurchase"
            value={paymentData.dateOfPurchase}
            onChange={handlePaymentChange}
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Date of Transaction"
            type="date"
            name="dateOfTransaction"
            value={paymentData.dateOfTransaction}
            onChange={handlePaymentChange}
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Transaction ID"
            name="trans_id"
            value={paymentData.trans_id}
            onChange={handlePaymentChange}
            required
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Total Amount"
            type="number"
            name="totalAmount"
            value={paymentData.totalAmount}
            onChange={handlePaymentChange}
            required
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Paid Amount"
            type="number"
            name="paidAmount"
            value={paymentData.paidAmount}
            onChange={handlePaymentChange}
            required
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Pending Payment"
            type="number"
            name="pendingPayment"
            value={paymentData.pendingPayment}
            onChange={handlePaymentChange}
            required
            fullWidth
            InputProps={{ readOnly: true }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Comment"
            name="comment"
            value={paymentData.comment}
            onChange={handlePaymentChange}     
            fullWidth
            multiline
            rows={3}
          />
        </Grid>
      </Grid>
      <Grid container spacing={2} style={{ marginTop: '20px' }}>
        <Grid item xs={4}>
          <Button variant="contained" color="primary" type="submit">
            Submit
          </Button>
        </Grid>
        <Grid item xs={4}>
            <Button variant="contained" color="warning" onClick={clearPaymentData}>
              Clear
            </Button>
          </Grid>
        <Grid item xs={4}>
          <Button variant="contained" color="error" onClick={handleClosePaymentDialog}>
            Close
          </Button>
        </Grid>
      </Grid>
    </form>
  </DialogContent>
</Dialog>
      </Container>
    </div>
  );
};

export default PurchaseEntryPage;

