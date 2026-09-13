import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  CalendarToday as DateIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import apiClient from '../service/api';
import LedgerService from '../service/LedgerService';
import {
  STATEMENT_COLUMNS,
  buildStatementModel,
  describePeriod,
  formatBalance,
  formatCount,
  formatMoney,
  formatRate,
  formatStatementDate,
  formatWeight
} from './ledgerStatement';

/**
 * Statement of account for one customer.
 *
 * The screen and the PDF are two renderings of one model (ledgerStatement.js), so
 * the columns, the opening balance and the totals cannot disagree between them -
 * previously the PDF built its own row text and summed its own totals.
 */

/** Preset ranges, since a statement is nearly always asked for by month. */
const iso = (date) => date.toISOString().slice(0, 10);
const PRESETS = [
  {
    label: 'This month',
    range: () => {
      const now = new Date();
      return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now)];
    }
  },
  {
    label: 'Last month',
    range: () => {
      const now = new Date();
      return [
        iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        iso(new Date(now.getFullYear(), now.getMonth(), 0))
      ];
    }
  },
  {
    label: 'This year',
    range: () => {
      const now = new Date();
      return [iso(new Date(now.getFullYear(), 0, 1)), iso(now)];
    }
  },
  { label: 'All time', range: () => ['', ''] }
];

const balanceColour = (amount) =>
  amount > 0 ? 'error.main' : amount < 0 ? 'success.main' : 'text.primary';

const CustomerLedgerView = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [statement, setStatement] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient.get('/user/customers')
      .then((response) => {
        if (!cancelled) setCustomers(response.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load customers');
      });
    return () => { cancelled = true; };
  }, []);

  const fetchStatement = useCallback(async (customerId, start, end) => {
    setLoading(true);
    setError('');
    try {
      const data = await LedgerService.getCustomerStatement(customerId, start, end);
      setStatement(data);
    } catch (err) {
      setStatement(null);
      setError(err.message || 'Failed to fetch the statement');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCustomerChange = (event, newValue) => {
    setSelectedCustomer(newValue);
    if (newValue) {
      fetchStatement(newValue.id, startDate, endDate);
    } else {
      setStatement(null);
    }
  };

  const applyPreset = (preset) => {
    const [start, end] = preset.range();
    setStartDate(start);
    setEndDate(end);
    if (selectedCustomer) {
      fetchStatement(selectedCustomer.id, start, end);
    }
  };

  // One model, rendered twice: the table below and the downloaded PDF.
  const model = useMemo(() => (statement ? buildStatementModel(statement) : null), [statement]);

  const visibleRows = useMemo(() => {
    if (!model) return [];
    return model.showOpeningRow ? [model.openingRow, ...model.rows] : model.rows;
  }, [model]);

  /**
   * Downloads the statement the server renders.
   *
   * It used to be drawn here with jsPDF. It moved to the server so the weekly WhatsApp
   * statement - which a scheduled job sends, with no browser to draw in - is the same
   * document as this one. Two layouts would have drifted, and a customer comparing the
   * PDF they downloaded against the one they were sent would have found it.
   */
  const handleDownload = async () => {
    if (!selectedCustomer) return;
    setDownloading(true);
    setError('');
    try {
      const { blob, fileName } = await LedgerService.getCustomerStatementPdf(
        selectedCustomer.id, startDate, endDate
      );

      // Anchor-and-revoke: the blob URL has to outlive the click, and leaving it
      // allocated holds the whole PDF in memory for the life of the page.
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Could not generate the PDF: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const totals = model?.totals;

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Who and when */}
      <Card elevation={2} sx={{ mb: 2 }}>
        <CardContent sx={{ pb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Autocomplete
                options={customers}
                getOptionLabel={(option) => [option.name, option.shopName].filter(Boolean).join(' - ')}
                value={selectedCustomer}
                onChange={handleCustomerChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Customer"
                    placeholder="Search by name or shop"
                    size="small"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start"><PersonIcon color="primary" /></InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      )
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                label="From"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><DateIcon color="primary" fontSize="small" /></InputAdornment>
                }}
              />
            </Grid>

            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                label="To"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><DateIcon color="primary" fontSize="small" /></InputAdornment>
                }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                onClick={() => selectedCustomer && fetchStatement(selectedCustomer.id, startDate, endDate)}
                disabled={!selectedCustomer || loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <FilterIcon />}
                sx={{ height: 40 }}
              >
                {loading ? 'Loading' : 'Show'}
              </Button>
            </Grid>

            <Grid item xs={12} md={2}>
              <Tooltip title="Download the statement of account as a PDF. The same document the weekly WhatsApp statement sends.">
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={downloading
                    ? <CircularProgress size={16} color="inherit" />
                    : <DownloadIcon />}
                  onClick={handleDownload}
                  disabled={!model || model.rows.length === 0 || downloading}
                  sx={{ height: 40 }}
                >
                  {downloading ? 'Preparing' : 'Statement PDF'}
                </Button>
              </Tooltip>
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            {PRESETS.map((preset) => (
              <Chip
                key={preset.label}
                label={preset.label}
                size="small"
                variant="outlined"
                onClick={() => applyPreset(preset)}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {model && (
        <>
          {/* Identity and period, laid out as on the printed statement */}
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <Typography variant="overline" color="text.secondary">Statement for</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {model.customer.name}
                  {model.customer.obsolete && (
                    <Chip label="Inactive" size="small" color="default" sx={{ ml: 1 }} />
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {[model.customer.shopName, model.customer.cityName].filter(Boolean).join(' - ')}
                </Typography>
                {model.customer.mobileNo && (
                  <Typography variant="body2" color="text.secondary">Mobile {model.customer.mobileNo}</Typography>
                )}
              </Grid>

              <Grid item xs={12} md={7}>
                <Stack spacing={0.5}>
                  {[
                    ['Account no.', `CUS-${model.customer.id}`],
                    ['Period', describePeriod(model.period)],
                    ['Transactions', `${totals.rowCount}`],
                    ...(model.lastPayment
                      ? [['Last payment', `${formatStatementDate(model.lastPayment.date)} - ₹${formatMoney(model.lastPayment.amount)}`]]
                      : []),
                    ...(model.customer.creditLimit !== null
                      ? [['Credit limit', `₹${formatMoney(model.customer.creditLimit)}`]]
                      : [])
                  ].map(([label, value]) => (
                    <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="body2" color="text.secondary">{label}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{value}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          {/* The position in four figures, same four as the PDF */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[
              { label: 'Opening balance', value: formatBalance(totals.openingBalance), colour: balanceColour(totals.openingBalance) },
              { label: 'Billed in period (Dr)', value: `₹${formatMoney(totals.totalDebit)}`, colour: 'error.main' },
              { label: 'Received in period (Cr)', value: `₹${formatMoney(totals.totalCredit)}`, colour: 'success.main' },
              { label: 'Closing balance', value: formatBalance(totals.closingBalance), colour: balanceColour(totals.closingBalance), emphasis: true }
            ].map((tile) => (
              <Grid item xs={12} sm={6} md={3} key={tile.label}>
                <Paper
                  elevation={tile.emphasis ? 4 : 1}
                  sx={{
                    p: 1.5,
                    borderLeft: 4,
                    borderColor: tile.emphasis ? 'primary.main' : 'divider',
                    height: '100%'
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {tile.label}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: tile.colour, fontVariantNumeric: 'tabular-nums' }}>
                    {tile.value}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Transactions */}
      <Card elevation={2}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
          ) : visibleRows.length > 0 ? (
            <TableContainer sx={{ maxHeight: 'calc(100vh - 460px)', minHeight: 280 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {STATEMENT_COLUMNS.map((column) => (
                      <TableCell
                        key={column.key}
                        align={column.numeric ? 'right' : 'left'}
                        sx={{ fontWeight: 700, bgcolor: 'primary.main', color: 'common.white', whiteSpace: 'nowrap' }}
                      >
                        {column.label.replace(' (Rs.)', ' (₹)')}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleRows.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{
                        bgcolor: row.kind === 'opening' ? 'action.hover' : undefined,
                        '& td': {
                          fontStyle: row.obsolete ? 'italic' : 'normal',
                          color: row.obsolete ? 'text.disabled' : undefined,
                          fontVariantNumeric: 'tabular-nums'
                        }
                      }}
                    >
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatStatementDate(row.date)}</TableCell>
                      <TableCell sx={{ fontWeight: row.kind === 'opening' ? 700 : 400 }}>
                        {row.particulars}
                        {row.backdated && <Chip label="back-dated" size="small" color="warning" sx={{ ml: 0.75, height: 18 }} />}
                        {row.obsolete && <Chip label="corrected" size="small" sx={{ ml: 0.75, height: 18 }} />}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>{row.voucher}</TableCell>
                      <TableCell align="right">{formatCount(row.birds)}</TableCell>
                      <TableCell align="right">{formatWeight(row.weight)}</TableCell>
                      <TableCell align="right">{formatRate(row.rate)}</TableCell>
                      <TableCell align="right" sx={{ color: row.debit > 0 ? 'error.main' : undefined }}>
                        {row.debit > 0 ? formatMoney(row.debit) : ''}
                      </TableCell>
                      <TableCell align="right" sx={{ color: row.credit > 0 ? 'success.main' : undefined }}>
                        {row.credit > 0 ? formatMoney(row.credit) : ''}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: balanceColour(row.balance), whiteSpace: 'nowrap' }}>
                        {formatBalance(row.balance)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Period totals in the columns they belong to */}
                  <TableRow sx={{ position: 'sticky', bottom: 0, bgcolor: 'grey.100' }}>
                    <TableCell />
                    <TableCell sx={{ fontWeight: 700 }}>Total for the period</TableCell>
                    <TableCell />
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCount(totals.birds)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatWeight(totals.weight)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatRate(totals.averageRate)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main' }}>{formatMoney(totals.totalDebit)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>{formatMoney(totals.totalCredit)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: balanceColour(totals.closingBalance) }}>
                      {formatBalance(totals.closingBalance)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ p: 5, textAlign: 'center' }}>
              {selectedCustomer ? (
                <>
                  <ReceiptIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="h6" color="text.secondary">No transactions in this period</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Widen the date range, or pick All time to see the full history.
                  </Typography>
                </>
              ) : (
                <>
                  <PersonIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="h6" color="text.secondary">Choose a customer</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Their statement of account appears here, ready to download.
                  </Typography>
                </>
              )}
            </Box>
          )}
        </CardContent>

        {model && model.rows.length > 0 && (
          <>
            <Divider />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="overline" color="text.secondary">What was traded</Typography>
                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                    {[
                      ['Sale transactions', formatCount(totals.saleCount) || '0'],
                      ['Birds supplied', formatCount(totals.birds) || '0'],
                      ['Weight supplied (kg)', formatWeight(totals.weight) || '0.000'],
                      ['Average realised rate (₹/kg)', formatRate(totals.averageRate) || '0.00'],
                      [
                        'Collected with sales',
                        `${formatCount(totals.salesWithCollectionCount) || '0'} of ${formatCount(totals.saleCount) || '0'} - ₹${formatMoney(totals.collectedWithSales)}`
                      ],
                      ['Separate payment receipts', formatCount(totals.paymentCount) || '0'],
                      ['Adjustments', formatCount(totals.adjustmentCount) || '0']
                    ].map(([label, value]) => (
                      <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">{label}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="overline" color="text.secondary">How the balance moved</Typography>
                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                    {[
                      ['Opening balance', formatBalance(totals.openingBalance)],
                      ['Add: sales and debits', `+ ${formatMoney(totals.totalDebit)}`],
                      ['Less: payments and credits', `- ${formatMoney(totals.totalCredit)}`]
                    ].map(([label, value]) => (
                      <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">{label}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
                      </Box>
                    ))}
                    <Divider sx={{ my: 0.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Closing balance</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: balanceColour(totals.closingBalance), fontVariantNumeric: 'tabular-nums' }}>
                        {formatBalance(totals.closingBalance)}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </>
        )}
      </Card>
    </Container>
  );
};

export default CustomerLedgerView;
