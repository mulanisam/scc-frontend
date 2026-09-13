import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  AttachFile as AttachFileIcon,
  Business as SupplierIcon,
  CalendarToday as DateIcon,
  Clear as ClearIcon,
  Delete as DeleteIcon,
  LocalGasStation as DieselIcon,
  LocalShipping as VehicleIcon,
  Payment as PaymentIcon,
  Person as DriverIcon,
  Save as SaveIcon,
  WarningAmber as WarnIcon
} from '@mui/icons-material';
import {
  fetchSuppliers, fetchVehicles, fetchDrivers, submitPurchase, submitPayment, fetchSupplierAccount
} from '../service/PurchaseService';
import { calculateAmount, calculateTotalExpenses } from '../../utils/businessRules';
import {
  validatePurchase, orderFilesForUpload, buildPurchaseSummary
} from '../../utils/purchaseValidation';

/**
 * Purchase entry.
 *
 * Rebuilt to work the way the sales screens do, because it did not: it checked that four
 * fields were non-empty and sent everything else to a server that trusted whatever arrived.
 * What that allowed, in the data as it stands - a purchase of 960 birds for ₹0, two identical
 * purchases on one day, and a payable understated by ₹12,05,020.
 *
 * Four things are aligned with sales now:
 *
 * - <b>the amount is derived, per line</b>, from weight x rate on the ₹10 rounding rule, and a
 *   line that disagrees with its own figures is named rather than silently saved
 * - <b>running totals</b> sit under the lines - birds, weight, amount, average rate - so the
 *   load is checked against the DC notes before it is submitted, not afterwards
 * - <b>the date is a rule</b>: nothing future-dated, and backdating says what it will do to the
 *   supplier's balances
 * - <b>what the server says is what the screen shows</b>. Every failure used to read "Error
 *   creating Purchase Entry", which covered a supplier that did not exist, a bad date and a
 *   disk that could not be written to
 *
 * <p>And a scan now belongs to its own line. Every attach button called one handler that
 * appended to a flat list, and the server pairs files[i] with line i - so a DC scanned against
 * line 3 was filed as the evidence for line 1.
 */

const emptyLine = (srNo) => ({ srNo, dcNo: '', nos: '', kilograms: '', rate: '', amount: '' });

const blankForm = () => ({
  entryDate: new Date().toISOString().slice(0, 10),
  vehicle: '',
  driver: '',
  supplier: '',
  branch: '',
  farm: '',
  supervisorName: '',
  supervisorPhoneNo: '',
  driverExpense: '',
  diesel: '',
  hamali: ''
});

const money = (value) => `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;

const PurchaseEntryPage = () => {
  const [formData, setFormData] = useState(blankForm);
  const [lines, setLines] = useState([emptyLine(1)]);
  /** Keyed by line index, so a scan stays with the line it was chosen on. */
  const [filesByLine, setFilesByLine] = useState({});

  const [suppliers, setSuppliers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const say = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  useEffect(() => {
    Promise.all([fetchSuppliers(), fetchVehicles(), fetchDrivers()])
      .then(([suppliersData, vehiclesData, driversData]) => {
        setSuppliers(suppliersData);
        setVehicles(vehiclesData);
        setDrivers(driversData);
      })
      .catch((error) => say(serverMessage(error, 'The master data could not be loaded.'), 'error'));
  }, [say]);

  const handleField = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLineChange = (index, field, value) => {
    setLines((prev) => prev.map((line, position) => {
      if (position !== index) return line;
      const next = { ...line, [field]: value };
      // Derived on every keystroke, and from the same helper the server uses, so the figure on
      // screen is the figure that will be billed.
      if (field === 'kilograms' || field === 'rate') {
        next.amount = calculateAmount(next.kilograms, next.rate);
      }
      return next;
    }));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine(prev.length + 1)]);

  const removeLine = (index) => {
    if (lines.length === 1) return;
    setLines((prev) => prev
      .filter((line, position) => position !== index)
      .map((line, position) => ({ ...line, srNo: position + 1 })));

    // The scans shift with the lines. Without this, deleting line 2 leaves line 3's scan
    // attached to what is now line 2 - the same misfiling, by a different route.
    setFilesByLine((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, file]) => {
        const position = Number(key);
        if (position < index) next[position] = file;
        else if (position > index) next[position - 1] = file;
      });
      return next;
    });
  };

  const attachScan = (index, file) => {
    const MAX_MB = 5;
    if (file && file.size / (1024 * 1024) > MAX_MB) {
      say(`That file is larger than ${MAX_MB} MB. Scan it at a lower resolution.`, 'error');
      return;
    }
    setFilesByLine((prev) => ({ ...prev, [index]: file }));
  };

  const detachScan = (index) => setFilesByLine((prev) => {
    const next = { ...prev };
    delete next[index];
    return next;
  });

  const validation = useMemo(
    () => validatePurchase({ formData, lines }),
    [formData, lines]
  );

  const expenses = useMemo(() => calculateTotalExpenses({
    driverExpense: formData.driverExpense,
    diesel: formData.diesel,
    hamali: formData.hamali
  }), [formData.driverExpense, formData.diesel, formData.hamali]);

  const labelFor = (list, id, field) =>
    list.find((item) => String(item.id) === String(id))?.[field] ?? '';

  const summary = useMemo(() => buildPurchaseSummary({
    formData,
    lines,
    labels: {
      supplier: labelFor(suppliers, formData.supplier, 'name'),
      vehicle: labelFor(vehicles, formData.vehicle, 'vehicleNo'),
      driver: labelFor(drivers, formData.driver, 'name'),
      filesByLine
    }
  }), [formData, lines, suppliers, vehicles, drivers, filesByLine]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    const payload = {
      ...formData,
      // Each line carries the derived amount, not whatever sat in the box.
      dcDetails: lines.map((line) => ({
        dcNo: line.dcNo,
        nos: Number(line.nos) || 0,
        kilograms: line.kilograms,
        rate: line.rate,
        amount: calculateAmount(line.kilograms, line.rate)
      }))
    };

    const data = new FormData();
    data.append('purchaseEntry', JSON.stringify(payload));
    orderFilesForUpload(lines, filesByLine).forEach((file) => {
      // An empty slot still occupies a position, or the server pairs the wrong scan with the
      // wrong line. An empty Blob is the placeholder it ignores.
      data.append('files', file ?? new Blob([]), file ? file.name : 'none');
    });

    try {
      const result = await submitPurchase(data);
      say(result?.message
        ? `${result.message} — ${money(result.totalAmount)}`
        : 'Purchase recorded.');
      handleClear();
      setReviewOpen(false);
    } catch (error) {
      say(serverMessage(error, 'The purchase could not be saved.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setFormData(blankForm());
    setLines([emptyLine(1)]);
    setFilesByLine({});
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>
        {`input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
          input[type="number"] { -moz-appearance: textfield; }`}
      </style>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Container maxWidth="xl" sx={{ py: 2 }}>

          {/* ---- the trip ------------------------------------------------ */}
          <Card elevation={3} sx={{ mb: 2, borderRadius: 2 }}>
            <CardHeader
              title="Purchase — the trip"
              sx={{
                bgcolor: 'primary.main', color: 'white', py: 1,
                '& .MuiCardHeader-title': { fontWeight: 600, fontSize: '0.9rem', color: 'white' }
              }}
            />
            <Divider />
            <CardContent sx={{ py: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth size="small" required
                    label="Date" type="date" name="entryDate"
                    value={formData.entryDate} onChange={handleField}
                    InputLabelProps={{ shrink: true }}
                    error={validation.dateCheck.blocked}
                    helperText={validation.dateCheck.message || ' '}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start"><DateIcon color="primary" fontSize="small" /></InputAdornment>
                      )
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    select fullWidth size="small" required
                    label="Supplier" name="supplier"
                    value={formData.supplier} onChange={handleField}
                    helperText=" "
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start"><SupplierIcon color="primary" fontSize="small" /></InputAdornment>
                      )
                    }}
                  >
                    {suppliers.map((supplier) => (
                      <MenuItem key={supplier.id} value={supplier.id}>
                        {supplier.name}{supplier.branch ? ` — ${supplier.branch}` : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    select fullWidth size="small" required
                    label="Vehicle" name="vehicle"
                    value={formData.vehicle} onChange={handleField}
                    helperText=" "
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start"><VehicleIcon color="primary" fontSize="small" /></InputAdornment>
                      )
                    }}
                  >
                    {vehicles.map((vehicle) => (
                      <MenuItem key={vehicle.id} value={vehicle.id}>{vehicle.vehicleNo}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    select fullWidth size="small" required
                    label="Driver" name="driver"
                    value={formData.driver} onChange={handleField}
                    helperText=" "
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start"><DriverIcon color="primary" fontSize="small" /></InputAdornment>
                      )
                    }}
                  >
                    {drivers.map((driver) => (
                      <MenuItem key={driver.id} value={driver.id}>{driver.name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" label="Farm" name="farm"
                             value={formData.farm} onChange={handleField} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" label="Branch" name="branch"
                             value={formData.branch} onChange={handleField} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" label="Supervisor" name="supervisorName"
                             value={formData.supervisorName} onChange={handleField} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" label="Supervisor phone" name="supervisorPhoneNo"
                             value={formData.supervisorPhoneNo} onChange={handleField}
                             inputProps={{ inputMode: 'numeric', maxLength: 10 }} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* ---- the DC lines ------------------------------------------- */}
          <Card elevation={3} sx={{ mb: 2, borderRadius: 2 }}>
            <CardHeader
              title="DC notes"
              subheader="One line per delivery challan. The amount is calculated from weight × rate."
              action={
                <Button size="small" startIcon={<AddIcon />} onClick={addLine} sx={{ color: 'white' }}>
                  Add line
                </Button>
              }
              sx={{
                bgcolor: 'primary.main', color: 'white', py: 1,
                '& .MuiCardHeader-title': { fontWeight: 600, fontSize: '0.9rem', color: 'white' },
                '& .MuiCardHeader-subheader': { color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem' }
              }}
            />
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 40 }}>#</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>DC no</TableCell>
                    <TableCell sx={{ minWidth: 100 }} align="right">Birds</TableCell>
                    <TableCell sx={{ minWidth: 120 }} align="right">Weight (kg)</TableCell>
                    <TableCell sx={{ minWidth: 110 }} align="right">Rate</TableCell>
                    <TableCell sx={{ minWidth: 120 }} align="right">Amount</TableCell>
                    <TableCell align="center" sx={{ minWidth: 120 }}>Scan</TableCell>
                    <TableCell sx={{ width: 48 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((line, index) => {
                    const check = validation.lineChecks[index];
                    const scan = filesByLine[index];
                    return (
                      <TableRow key={index} hover>
                        <TableCell sx={{ color: 'text.secondary' }}>{line.srNo}</TableCell>
                        <TableCell>
                          <TextField
                            size="small" fullWidth value={line.dcNo}
                            onChange={(event) => handleLineChange(index, 'dcNo', event.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small" fullWidth type="number" value={line.nos}
                            onChange={(event) => handleLineChange(index, 'nos', event.target.value)}
                            inputProps={{ min: 0, style: { textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small" fullWidth type="number" value={line.kilograms}
                            onChange={(event) => handleLineChange(index, 'kilograms', event.target.value)}
                            inputProps={{ min: 0, step: '0.001', style: { textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small" fullWidth type="number" value={line.rate}
                            onChange={(event) => handleLineChange(index, 'rate', event.target.value)}
                            inputProps={{ min: 0, step: '0.01', style: { textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {money(check?.expectedAmount ?? 0)}
                          {/*
                            The per-bird weight beside the amount, when it looks wrong. This is
                            the check nothing did: 960 birds against 3,029 kg is fine, 10 birds
                            against 900 kg is a digit in the wrong place.
                          */}
                          {check?.weightLooksWrong && (
                            <Tooltip title={`${check.perBird} kg a bird — check the count and the weight`}>
                              <WarnIcon color="warning" fontSize="small" sx={{ ml: 0.5, verticalAlign: 'middle' }} />
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {scan ? (
                            <Chip
                              size="small"
                              label={scan.name.length > 14 ? `${scan.name.slice(0, 12)}…` : scan.name}
                              onDelete={() => detachScan(index)}
                              variant="outlined"
                            />
                          ) : (
                            <Tooltip title="Attach the scanned DC for this line">
                              <IconButton component="label" color="primary" size="small">
                                <AttachFileIcon fontSize="small" />
                                <input
                                  type="file" hidden accept=".jpg,.jpeg,.png,.pdf"
                                  onChange={(event) => attachScan(index, event.target.files[0])}
                                />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small" color="error"
                            disabled={lines.length === 1}
                            onClick={() => removeLine(index)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                {/*
                  Totals under the lines rather than in a coloured band of their own: this is
                  the figure that becomes the supplier's debt, and it is checked against the DC
                  notes in hand before submitting.
                */}
                <TableFooter>
                  <TableRow sx={{ '& td': { bgcolor: 'grey.100', fontWeight: 700, borderTop: '2px solid', borderColor: 'divider' } }}>
                    <TableCell colSpan={2}>
                      {validation.totals.lines} line{validation.totals.lines === 1 ? '' : 's'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {validation.totals.birds.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {validation.totals.kilograms.toLocaleString('en-IN', { minimumFractionDigits: 3 })}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
                      {validation.totals.averageRate === null ? '—' : `avg ${validation.totals.averageRate}`}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontSize: '1rem' }}>
                      {money(validation.totals.amount)}
                    </TableCell>
                    <TableCell colSpan={2} align="right" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                      {validation.totals.averageWeight !== null
                        && `${validation.totals.averageWeight} kg a bird`}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>
          </Card>

          {/* ---- trip expenses ----------------------------------------- */}
          <Card elevation={3} sx={{ mb: 2, borderRadius: 2 }}>
            <CardHeader
              title="Trip expenses"
              subheader="Recorded against the trip. Not part of what the supplier is owed."
              sx={{
                bgcolor: 'grey.800', color: 'white', py: 1,
                '& .MuiCardHeader-title': { fontWeight: 600, fontSize: '0.9rem', color: 'white' },
                '& .MuiCardHeader-subheader': { color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem' }
              }}
            />
            <CardContent sx={{ py: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4} md={3}>
                  <TextField
                    fullWidth size="small" type="number" label="Diesel" name="diesel"
                    value={formData.diesel} onChange={handleField}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start"><DieselIcon fontSize="small" /></InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={3}>
                  <TextField fullWidth size="small" type="number" label="Hamali" name="hamali"
                             value={formData.hamali} onChange={handleField} />
                </Grid>
                <Grid item xs={12} sm={4} md={3}>
                  <TextField fullWidth size="small" type="number" label="Driver expense" name="driverExpense"
                             value={formData.driverExpense} onChange={handleField} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
                    <Typography variant="caption" color="text.secondary">Trip cost</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {money(expenses)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* What stops the submission, and what merely looks odd. */}
          {validation.blocking.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle>Not ready to save</AlertTitle>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {validation.blocking.map((problem) => <li key={problem}>{problem}</li>)}
              </Box>
            </Alert>
          )}
          {validation.warnings.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {validation.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </Box>
            </Alert>
          )}
        </Container>
      </Box>

      <Box sx={{ flexShrink: 0, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="xl">
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ py: 2 }} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained" size="large" startIcon={<SaveIcon />}
              disabled={submitting || !validation.canSubmit}
              onClick={() => setReviewOpen(true)}
              sx={{ minWidth: 170 }}
            >
              Review &amp; Submit
            </Button>
            <Button
              variant="outlined" color="secondary" size="large" startIcon={<ClearIcon />}
              onClick={handleClear} disabled={submitting} sx={{ minWidth: 120 }}
            >
              Clear
            </Button>
            <Button
              variant="outlined" size="large" startIcon={<PaymentIcon />}
              onClick={() => setPaymentOpen(true)} sx={{ minWidth: 160 }}
            >
              Pay a supplier
            </Button>
          </Stack>
        </Container>
      </Box>

      <ReviewDialog
        open={reviewOpen}
        summary={summary}
        dateCheck={validation.dateCheck}
        warnings={validation.warnings}
        submitting={submitting}
        onConfirm={handleSubmit}
        onCancel={() => setReviewOpen(false)}
      />

      <SupplierPaymentDialog
        open={paymentOpen}
        suppliers={suppliers}
        onClose={() => setPaymentOpen(false)}
        onPaid={(message) => { say(message); setPaymentOpen(false); }}
        onError={(message) => say(message, 'error')}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity} elevation={6} sx={{ width: '100%' }}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

/** The server's own words, which are specific and worth reading. */
const serverMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  return data?.message || error?.message || fallback;
};

/**
 * Reads back what is about to be saved, in names rather than ids.
 *
 * The sales screens have had this since the bulk entry was rebuilt, and a purchase deserves it
 * more: it creates a debt, and the figures come off paper DC notes that are easy to mistype.
 */
const ReviewDialog = ({ open, summary, dateCheck, warnings, submitting, onConfirm, onCancel }) => (
  <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
    <DialogTitle sx={{ fontWeight: 600 }}>Confirm this purchase</DialogTitle>
    <DialogContent dividers>
      {dateCheck?.requiresConfirmation && (
        <Alert severity="warning" sx={{ mb: 2 }}>{dateCheck.message}</Alert>
      )}
      {warnings?.map((warning) => (
        <Alert severity="info" sx={{ mb: 2 }} key={warning}>{warning}</Alert>
      ))}

      <Stack spacing={1}>
        <Line label="Date" value={summary.date} />
        <Line label="Supplier" value={summary.supplier} />
        <Line label="Vehicle" value={summary.vehicle} />
        <Line label="Driver" value={summary.driver} />
        {summary.farm && <Line label="Farm" value={summary.farm} />}
        <Divider />
        <Line label="DC lines" value={summary.lines} />
        <Line label="Birds" value={summary.birds.toLocaleString('en-IN')} />
        <Line label="Weight" value={`${summary.kilograms} kg`} />
        <Line label="Average rate" value={summary.averageRate === null ? '—' : `₹${summary.averageRate}`} />
        <Divider />
        <Line label="Amount owed to the supplier" value={money(summary.amount)} strong />
        <Line label="Trip expenses" value={money(summary.expenses)} />
        <Line label="Scans attached" value={summary.scans} />
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} disabled={submitting}>Back</Button>
      <Button
        variant="contained" onClick={onConfirm} disabled={submitting}
        startIcon={submitting ? <CircularProgress size={16} /> : <SaveIcon />}
      >
        {submitting ? 'Saving' : 'Save purchase'}
      </Button>
    </DialogActions>
  </Dialog>
);

const Line = ({ label, value, strong = false }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography
      variant={strong ? 'subtitle1' : 'body2'}
      sx={{ fontWeight: strong ? 700 : 500, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}
    >
      {value || '—'}
    </Typography>
  </Stack>
);

/**
 * Paying a supplier.
 *
 * Rebuilt around choosing the purchase, which is what the old form could not do. It asked for
 * a supplier and a date and looked the purchase up from the pair - and when two purchases
 * shared a date, as Komarla Agrovet's two do, the lookup expected one row, found two, and the
 * payment failed every time under "Failed to process request".
 *
 * The unpaid purchases are listed with what remains on each, so the payment names one by id.
 */
const SupplierPaymentDialog = ({ open, suppliers, onClose, onPaid, onError }) => {
  const [supplierId, setSupplierId] = useState('');
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    purchaseId: '', dateOfTransaction: new Date().toISOString().slice(0, 10),
    paidAmount: '', trans_id: '', comment: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setSupplierId('');
      setAccount(null);
      setForm({
        purchaseId: '', dateOfTransaction: new Date().toISOString().slice(0, 10),
        paidAmount: '', trans_id: '', comment: ''
      });
    }
  }, [open]);

  useEffect(() => {
    if (!supplierId) { setAccount(null); return undefined; }
    let cancelled = false;
    setLoading(true);
    // The account carries the per-purchase detail this form needs: which purchases are unpaid
    // and how much is left on each.
    fetchSupplierAccount(supplierId)
      .then((data) => { if (!cancelled) setAccount(data); })
      .catch((error) => {
        if (!cancelled) onError(serverMessage(error, 'That supplier’s purchases could not be loaded.'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [supplierId, onError]);

  const unpaid = useMemo(
    () => (account?.purchases ?? []).filter((purchase) => Number(purchase.outstanding) > 0),
    [account]
  );

  const chosen = unpaid.find((purchase) => String(purchase.id) === String(form.purchaseId));

  const submit = async () => {
    setSaving(true);
    try {
      const result = await submitPayment({
        supplier: Number(supplierId),
        purchaseId: Number(form.purchaseId),
        dateOfTransaction: form.dateOfTransaction,
        paidAmount: Number(form.paidAmount),
        trans_id: form.trans_id,
        comment: form.comment
      });
      onPaid(`Paid ${money(result?.paidAmount ?? form.paidAmount)}. `
        + `${money(result?.stillOutstanding ?? 0)} still outstanding on that purchase.`);
    } catch (error) {
      onError(serverMessage(error, 'The payment could not be recorded.'));
    } finally {
      setSaving(false);
    }
  };

  const canPay = supplierId && form.purchaseId && Number(form.paidAmount) > 0 && !saving;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Pay a supplier</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              select fullWidth size="small" label="Supplier"
              value={supplierId} onChange={(event) => {
                setSupplierId(event.target.value);
                setForm((prev) => ({ ...prev, purchaseId: '', paidAmount: '' }));
              }}
            >
              {suppliers.map((supplier) => (
                <MenuItem key={supplier.id} value={supplier.id}>{supplier.name}</MenuItem>
              ))}
            </TextField>
          </Grid>

          {loading && <Grid item xs={12}><CircularProgress size={20} /></Grid>}

          {account && (
            <Grid item xs={12}>
              <Alert severity={Number(account.totals.outstanding) > 0 ? 'warning' : 'success'}>
                {Number(account.totals.outstanding) > 0
                  ? `${money(account.totals.outstanding)} outstanding across ${unpaid.length} purchase${unpaid.length === 1 ? '' : 's'}.`
                  : 'Nothing is outstanding for this supplier.'}
              </Alert>
            </Grid>
          )}

          {unpaid.length > 0 && (
            <Grid item xs={12}>
              <TextField
                select fullWidth size="small" label="Which purchase"
                value={form.purchaseId}
                onChange={(event) => {
                  const purchase = unpaid.find((row) => String(row.id) === event.target.value);
                  setForm((prev) => ({
                    ...prev,
                    purchaseId: event.target.value,
                    // Defaulted to settling it in full, which is the common case.
                    paidAmount: purchase ? String(Math.round(Number(purchase.outstanding))) : ''
                  }));
                }}
                helperText="Chosen by purchase, not by date — two purchases can share a date"
              >
                {unpaid.map((purchase) => (
                  <MenuItem key={purchase.id} value={String(purchase.id)}>
                    {purchase.date} · {purchase.farm || 'no farm'} · {money(purchase.outstanding)} left
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}

          {chosen && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth size="small" type="date" label="Paid on"
                  value={form.dateOfTransaction}
                  onChange={(event) => setForm((prev) => ({ ...prev, dateOfTransaction: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth size="small" type="number" label="Amount"
                  value={form.paidAmount}
                  onChange={(event) => setForm((prev) => ({ ...prev, paidAmount: event.target.value }))}
                  helperText={Number(form.paidAmount) > Number(chosen.outstanding)
                    ? `More than the ${money(chosen.outstanding)} outstanding`
                    : `${money(chosen.outstanding)} outstanding`}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth size="small" label="Reference" value={form.trans_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, trans_id: event.target.value }))}
                  helperText="Cheque number or UPI reference"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth size="small" label="Note" value={form.comment}
                  onChange={(event) => setForm((prev) => ({ ...prev, comment: event.target.value }))}
                />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained" onClick={submit} disabled={!canPay}
          startIcon={saving ? <CircularProgress size={16} /> : <PaymentIcon />}
        >
          Record payment
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { SupplierPaymentDialog, ReviewDialog };
export default PurchaseEntryPage;
