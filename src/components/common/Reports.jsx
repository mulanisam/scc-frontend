import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Assessment as ReportIcon,
  PictureAsPdf as PdfIcon,
  Download as ExcelIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  TrendingUp as RisingIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';

import {
  fetchSalesDetail,
  fetchSalesSummary,
  REPORT_PERIODS,
  REPORT_DIMENSIONS
} from '../service/ReportsService';
import { getData } from '../service/MasterDataService';
import { exportReportToPdf, exportReportToExcel } from './reportExport';

const today = () => new Date().toISOString().slice(0, 10);

/** Date-range shortcuts, since most questions are about a standard window. */
const RANGE_PRESETS = [
  {
    label: 'Today',
    range: () => ({ startDate: today(), endDate: today() })
  },
  {
    label: 'This week',
    range: () => {
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return { startDate: monday.toISOString().slice(0, 10), endDate: today() };
    }
  },
  {
    label: 'This month',
    range: () => {
      const now = new Date();
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
        endDate: today()
      };
    }
  },
  {
    label: 'This year',
    range: () => ({ startDate: `${new Date().getFullYear()}-01-01`, endDate: today() })
  },
  {
    label: 'Last 12 months',
    range: () => {
      const from = new Date();
      from.setFullYear(from.getFullYear() - 1);
      return { startDate: from.toISOString().slice(0, 10), endDate: today() };
    }
  }
];

const money = (value) =>
  `₹${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const weight = (value) => `${(Number(value) || 0).toFixed(3)}`;
const count = (value) => (Number(value) || 0).toLocaleString('en-IN');

/** Balance thresholds mirror the colouring used on the sales entry grid. */
const balanceColour = (value) => {
  const balance = Number(value) || 0;
  if (balance > 50000) return 'error.main';
  if (balance > 20000) return 'warning.dark';
  if (balance < 0) return 'success.main';
  return 'text.primary';
};

const numericCellSx = {
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap'
};

const SUMMARY_COLUMNS = [
  { key: 'periodLabel', label: 'Period' },
  { key: 'dimensionName', label: 'Name' },
  { key: 'transactionCount', label: 'Sales', numeric: true },
  { key: 'birds', label: 'Birds', numeric: true },
  { key: 'weight', label: 'Weight (kg)', numeric: true },
  { key: 'amount', label: 'Amount', numeric: true },
  { key: 'payment', label: 'Received', numeric: true },
  { key: 'pending', label: 'Pending', numeric: true },
  { key: 'averageRate', label: 'Avg rate', numeric: true },
  { key: 'closingBalance', label: 'Closing balance', numeric: true }
];

const DETAIL_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'route', label: 'Route' },
  { key: 'city', label: 'City' },
  { key: 'customer', label: 'Customer' },
  { key: 'shopName', label: 'Shop' },
  { key: 'driver', label: 'Driver' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'birds', label: 'Birds', numeric: true },
  { key: 'weight', label: 'Weight (kg)', numeric: true },
  { key: 'rate', label: 'Rate', numeric: true },
  { key: 'amount', label: 'Amount', numeric: true },
  { key: 'payment', label: 'Received', numeric: true },
  { key: 'pending', label: 'Pending', numeric: true },
  { key: 'balanceAfter', label: 'Balance after', numeric: true },
  { key: 'description', label: 'Note' }
];

const ReportPage = () => {
  const [mode, setMode] = useState('summary');
  const [filters, setFilters] = useState({
    startDate: RANGE_PRESETS[2].range().startDate,
    endDate: today(),
    period: 'WEEK',
    groupBy: 'CUSTOMER',
    excludeObsolete: true
  });
  const [dimensionFilter, setDimensionFilter] = useState({ key: null, value: null, label: '' });
  const [masterOptions, setMasterOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drillFrom, setDrillFrom] = useState(null);

  const dimension = useMemo(
    () => REPORT_DIMENSIONS.find((d) => d.value === filters.groupBy) ?? REPORT_DIMENSIONS[0],
    [filters.groupBy]
  );

  // Options for narrowing to one route, customer, driver and so on.
  useEffect(() => {
    if (!dimension.master) {
      setMasterOptions([]);
      setDimensionFilter({ key: null, value: null, label: '' });
      return undefined;
    }

    let active = true;
    setLoadingOptions(true);
    getData(dimension.master)
      .then((response) => {
        if (!active) return;
        const rows = Array.isArray(response.data) ? response.data : [];
        setMasterOptions(
          rows.map((row) => ({
            id: row.id,
            label: row.name || row.vehicleNo || row.shopName || `#${row.id}`
          }))
        );
      })
      .catch(() => {
        if (active) setMasterOptions([]);
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });

    return () => {
      active = false;
    };
  }, [dimension]);

  const buildRequest = useCallback((overrides = {}) => {
    const request = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      period: filters.period,
      groupBy: filters.groupBy,
      excludeObsolete: filters.excludeObsolete,
      ...overrides
    };
    if (dimensionFilter.key && dimensionFilter.value) {
      request[dimensionFilter.key] = dimensionFilter.value;
    }
    return request;
  }, [filters, dimensionFilter]);

  const run = useCallback(async (nextMode, overrides = {}) => {
    setLoading(true);
    setError('');
    try {
      const request = buildRequest(overrides);
      const data = nextMode === 'detail'
        ? await fetchSalesDetail(request)
        : await fetchSalesSummary(request);
      setReport(data);
      setMode(nextMode);
    } catch (err) {
      // The API returns the reason (for example an end date before the start),
      // so show it rather than a generic failure.
      setError(err.message || 'Could not generate the report.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [buildRequest]);

  const handleGenerate = () => {
    setDrillFrom(null);
    run(mode);
  };

  /** Click a summary row to see the transactions behind it. */
  const drillInto = (row) => {
    if (!dimension.filterKey || !row.dimensionId) return;
    setDrillFrom({ mode, label: `${row.dimensionName} — ${row.periodLabel}` });
    run('detail', {
      [dimension.filterKey]: row.dimensionId,
      startDate: row.periodStart,
      endDate: row.periodEnd
    });
  };

  const backFromDrill = () => {
    const previous = drillFrom;
    setDrillFrom(null);
    run(previous?.mode ?? 'summary');
  };

  const clear = () => {
    setReport(null);
    setError('');
    setDrillFrom(null);
    setDimensionFilter({ key: null, value: null, label: '' });
    setFilters({
      startDate: RANGE_PRESETS[2].range().startDate,
      endDate: today(),
      period: 'WEEK',
      groupBy: 'CUSTOMER',
      excludeObsolete: true
    });
  };

  const columns = mode === 'detail' ? DETAIL_COLUMNS : SUMMARY_COLUMNS;
  const totals = report?.totals;

  // Memoised because the display rows below derive from it: a fresh []
  // on every render would rebuild every formatted row each time.
  const rows = useMemo(
    () => (mode === 'detail' ? report?.detail : report?.summary) ?? [],
    [mode, report]
  );

  /** Totals shaped like a row, so the table, PDF and Excel share one definition. */
  const totalsRow = useMemo(() => {
    if (!totals) return null;
    const base = {
      transactionCount: count(totals.transactionCount),
      birds: count(totals.birds),
      weight: weight(totals.weight),
      amount: money(totals.amount),
      payment: money(totals.payment),
      pending: money(totals.pending),
      averageRate: money(totals.averageRate)
    };
    return mode === 'detail'
      ? { ...base, date: 'TOTAL', customer: `${count(totals.rowCount)} transactions` }
      : { ...base, periodLabel: 'TOTAL', dimensionName: `${count(totals.rowCount)} rows` };
  }, [totals, mode]);

  /** Rows formatted for display and for export, so both agree. */
  const displayRows = useMemo(() => rows.map((row) => ({
    ...row,
    weight: weight(row.weight),
    amount: money(row.amount),
    payment: money(row.payment),
    pending: money(row.pending),
    rate: row.rate !== undefined ? money(row.rate) : undefined,
    averageRate: row.averageRate !== undefined ? money(row.averageRate) : undefined,
    balanceAfter: row.balanceAfter !== undefined ? money(row.balanceAfter) : undefined,
    closingBalance: row.closingBalance !== undefined ? money(row.closingBalance) : undefined,
    birds: count(row.birds),
    transactionCount: row.transactionCount !== undefined ? count(row.transactionCount) : undefined
  })), [rows]);

  const exportTitle = `${report?.title ?? 'Sales report'}${drillFrom ? ` — ${drillFrom.label}` : ''}`;
  const exportSubtitle = [
    `${report?.startDate} to ${report?.endDate}`,
    mode === 'summary' && report?.periodLabel ? `Period: ${report.periodLabel}` : null,
    ...(report?.appliedFilters ?? [])
  ].filter(Boolean).join('   |   ');

  const exportArgs = () => ({
    columns,
    rows: displayRows,
    totalsRow,
    title: exportTitle,
    subtitle: exportSubtitle
  });

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <ReportIcon color="primary" sx={{ fontSize: 30 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Sales reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Transaction detail and period totals by customer, route, driver, vehicle or city.
          </Typography>
        </Box>
      </Box>

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {RANGE_PRESETS.map((preset) => (
            <Chip
              key={preset.label}
              label={preset.label}
              size="small"
              onClick={() => setFilters((prev) => ({ ...prev, ...preset.range() }))}
              variant="outlined"
            />
          ))}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            label="From"
            type="date"
            size="small"
            value={filters.startDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={filters.endDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />

          <TextField
            select
            label="Break down by"
            size="small"
            value={filters.groupBy}
            onChange={(e) => setFilters((prev) => ({ ...prev, groupBy: e.target.value }))}
            sx={{ minWidth: 160 }}
          >
            {REPORT_DIMENSIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Totals per"
            size="small"
            value={filters.period}
            onChange={(e) => setFilters((prev) => ({ ...prev, period: e.target.value }))}
            sx={{ minWidth: 150 }}
            helperText={mode === 'detail' ? 'Applies to summary view' : ' '}
          >
            {REPORT_PERIODS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>

          {dimension.master && (
            <Autocomplete
              size="small"
              options={masterOptions}
              loading={loadingOptions}
              value={masterOptions.find((o) => o.id === dimensionFilter.value) ?? null}
              onChange={(event, option) => setDimensionFilter({
                key: dimension.filterKey,
                value: option?.id ?? null,
                label: option?.label ?? ''
              })}
              sx={{ minWidth: 240 }}
              renderInput={(params) => (
                <TextField {...params} label={`Only one ${dimension.label.toLowerCase()} (optional)`} />
              )}
            />
          )}

          <FormControlLabel
            sx={{ mt: 0.5 }}
            control={
              <Switch
                size="small"
                checked={filters.excludeObsolete}
                onChange={(e) => setFilters((prev) => ({ ...prev, excludeObsolete: e.target.checked }))}
              />
            }
            label={<Typography variant="body2">Active customers only</Typography>}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={mode}
            onChange={(event, next) => next && setMode(next)}
          >
            <ToggleButton value="summary">Period totals</ToggleButton>
            <ToggleButton value="detail">Transactions</ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? 'Generating…' : 'Generate'}
          </Button>

          <Button startIcon={<ClearIcon />} onClick={clear} disabled={loading}>
            Reset
          </Button>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title={rows.length ? 'Download as PDF' : 'Generate a report first'}>
            <span>
              <Button
                startIcon={<PdfIcon />}
                onClick={() => exportReportToPdf(exportArgs())}
                disabled={!rows.length}
              >
                PDF
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={rows.length ? 'Download as Excel' : 'Generate a report first'}>
            <span>
              <Button
                startIcon={<ExcelIcon />}
                onClick={() => exportReportToExcel(exportArgs())}
                disabled={!rows.length}
              >
                Excel
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {drillFrom && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={<Button size="small" startIcon={<BackIcon />} onClick={backFromDrill}>Back to totals</Button>}
        >
          Transactions behind <strong>{drillFrom.label}</strong>
        </Alert>
      )}

      {/* Headline figures */}
      {totals && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {[
            ['Sales', count(totals.transactionCount)],
            ['Birds', count(totals.birds)],
            ['Weight', `${weight(totals.weight)} kg`],
            ['Amount', money(totals.amount)],
            ['Received', money(totals.payment)],
            ['Pending', money(totals.pending)],
            ['Avg rate', `${money(totals.averageRate)}/kg`]
          ].map(([label, value]) => (
            <Paper
              key={label}
              variant="outlined"
              sx={{ px: 1.5, py: 1, minWidth: 118, display: 'flex', flexDirection: 'column' }}
            >
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {value}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}

      {/* Results */}
      {report && rows.length === 0 && !loading && (
        <Alert severity="info">
          No sales found between {report.startDate} and {report.endDate}
          {report.appliedFilters?.length ? ` for ${report.appliedFilters.join(', ')}` : ''}.
        </Alert>
      )}

      {rows.length > 0 && (
        <Paper variant="outlined">
          <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 600 }}>{report.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {report.startDate} to {report.endDate}
            </Typography>
            {report.appliedFilters?.map((filter) => (
              <Chip key={filter} label={filter} size="small" variant="outlined" />
            ))}
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {count(rows.length)} rows
            </Typography>
          </Box>

          <TableContainer sx={{ maxHeight: '60vh', overflowX: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      sx={{
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        ...(column.numeric ? { textAlign: 'right' } : {})
                      }}
                    >
                      {column.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.map((row, index) => {
                  const raw = rows[index];
                  const clickable = mode === 'summary' && dimension.filterKey && raw.dimensionId;
                  return (
                    <TableRow
                      key={`${raw.periodStart ?? raw.saleId ?? index}-${raw.dimensionId ?? index}`}
                      hover
                      onClick={clickable ? () => drillInto(raw) : undefined}
                      sx={{ cursor: clickable ? 'pointer' : 'default' }}
                    >
                      {columns.map((column) => {
                        const isBalance = column.key === 'closingBalance' || column.key === 'balanceAfter';
                        const rawBalance = column.key === 'closingBalance'
                          ? raw.closingBalance
                          : raw.balanceAfter;
                        return (
                          <TableCell
                            key={column.key}
                            sx={{
                              ...(column.numeric ? numericCellSx : { whiteSpace: 'nowrap' }),
                              ...(isBalance
                                ? { color: balanceColour(rawBalance), fontWeight: 600 }
                                : {})
                            }}
                          >
                            {isBalance && Number(rawBalance) > 50000 && (
                              <RisingIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                            )}
                            {row[column.key] ?? ''}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}

                {totalsRow && (
                  <TableRow sx={{ position: 'sticky', bottom: 0, bgcolor: 'action.selected' }}>
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        sx={{
                          fontWeight: 700,
                          borderTop: '2px solid',
                          borderTopColor: 'divider',
                          ...(column.numeric ? numericCellSx : { whiteSpace: 'nowrap' })
                        }}
                      >
                        {totalsRow[column.key] ?? ''}
                      </TableCell>
                    ))}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {mode === 'summary' && dimension.filterKey && (
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Click any row to see the transactions behind it.
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Container>
  );
};

export default ReportPage;
