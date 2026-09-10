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
  REPORT_DIMENSIONS,
  fetchTripReconciliation,
  fetchBoughtVsSold
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

/**
 * Summary columns. The second dimension column only appears when the report
 * actually crosses two, so a single-dimension report is not padded with a column
 * of repeated placeholder text.
 */
const summaryColumns = (dimensionLabel, dimension2Label) => [
  { key: 'periodLabel', label: 'Period', groupKey: 1 },
  { key: 'dimensionName', label: dimensionLabel, groupKey: 2 },
  ...(dimension2Label ? [{ key: 'dimension2Name', label: dimension2Label }] : []),
  { key: 'transactionCount', label: 'Sales', numeric: true },
  { key: 'birds', label: 'Birds', numeric: true },
  { key: 'weight', label: 'Weight (kg)', numeric: true },
  { key: 'amount', label: 'Amount', numeric: true },
  { key: 'payment', label: 'Recovered', numeric: true },
  { key: 'pending', label: 'Pending', numeric: true },
  { key: 'averageRate', label: 'Avg rate', numeric: true },
  { key: 'closingBalance', label: 'Total balance', numeric: true }
];

/** Numeric summary fields that a subtotal adds up. */
const SUBTOTAL_FIELDS = ['transactionCount', 'birds', 'weight', 'amount', 'payment', 'pending'];

/**
 * Trip reconciliation: every figure for one vehicle load.
 *
 * "Weight loss" is shrinkage between the farm and the customer and needs the
 * loaded weight, which was only recently given a field — it shows as "—" for
 * historical trips, meaning unknown rather than zero. "Header vs lines" is a
 * separate thing: the trip's own total disagreeing with its sale lines, which is
 * a data fault rather than a real loss.
 */
const RECONCILIATION_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'route', label: 'Route' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'driver', label: 'Driver' },
  { key: 'birdsLoaded', label: 'Birds loaded', numeric: true },
  { key: 'birdsSold', label: 'Sold', numeric: true },
  { key: 'mortality', label: 'Mortality', numeric: true },
  { key: 'returnToFarm', label: 'To farm (stock)', numeric: true },
  { key: 'birdVariance', label: 'Bird variance', numeric: true },
  { key: 'weightLoaded', label: 'Wt loaded', numeric: true },
  { key: 'weightSold', label: 'Wt sold', numeric: true },
  { key: 'weightLoss', label: 'Weight loss', numeric: true },
  { key: 'headerWeightVariance', label: 'Header vs lines', numeric: true },
  { key: 'averageWeightPerBird', label: 'kg/bird', numeric: true },
  { key: 'amount', label: 'Amount', numeric: true },
  { key: 'paid', label: 'Paid', numeric: true },
  { key: 'pending', label: 'Pending', numeric: true },
  { key: 'averageRate', label: 'Avg rate', numeric: true },
  { key: 'closingBalance', label: 'Closing balance', numeric: true }
];

/**
 * Bought against sold. The per-kilogram rates are the reliable comparison here:
 * they are ratios, so they hold even when the two sides cover different volumes.
 * The absolute margin only means something where both sides are recorded.
 */
const COMPARISON_COLUMNS = [
  { key: 'periodLabel', label: 'Period' },
  { key: 'birdsBought', label: 'Birds bought', numeric: true },
  { key: 'birdsSold', label: 'Birds sold', numeric: true },
  { key: 'weightBought', label: 'Kg bought', numeric: true },
  { key: 'weightSold', label: 'Kg sold', numeric: true },
  { key: 'weightLoss', label: 'Weight loss', numeric: true },
  { key: 'buyRatePerKg', label: 'Buy /kg', numeric: true },
  { key: 'sellRatePerKg', label: 'Sell /kg', numeric: true },
  { key: 'marginPerKg', label: 'Margin /kg', numeric: true },
  { key: 'amountBought', label: 'Bought', numeric: true },
  { key: 'amountSold', label: 'Sold', numeric: true },
  { key: 'purchaseExpenses', label: 'Expenses', numeric: true },
  { key: 'netMargin', label: 'Net margin', numeric: true },
  { key: 'owedToSuppliers', label: 'Owed to suppliers', numeric: true },
  { key: 'pendingFromCustomers', label: 'Due from customers', numeric: true }
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
    groupBy2: 'NONE',
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

  const dimension2 = useMemo(
    () => REPORT_DIMENSIONS.find((d) => d.value === filters.groupBy2) ?? REPORT_DIMENSIONS[5],
    [filters.groupBy2]
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
      groupBy2: filters.groupBy2,
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
      let data;
      if (nextMode === 'detail') {
        data = await fetchSalesDetail(request);
      } else if (nextMode === 'reconciliation') {
        data = await fetchTripReconciliation(request);
      } else if (nextMode === 'comparison') {
        data = await fetchBoughtVsSold(request);
      } else {
        data = await fetchSalesSummary(request);
      }
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

  const columns = mode === 'detail'
    ? DETAIL_COLUMNS
    : mode === 'reconciliation'
      ? RECONCILIATION_COLUMNS
      : mode === 'comparison'
        ? COMPARISON_COLUMNS
      : summaryColumns(dimension.label, filters.groupBy2 === 'NONE' ? null : dimension2.label);
  const totals = report?.totals;

  // Memoised because the display rows below derive from it: a fresh []
  // on every render would rebuild every formatted row each time.
  const rows = useMemo(() => {
    if (mode === 'detail') return report?.detail ?? [];
    if (mode === 'reconciliation') return report?.trips ?? [];
    if (mode === 'comparison') return report?.periods ?? [];
    return report?.summary ?? [];
  }, [mode, report]);

  /** Totals shaped like a row, so the table, PDF and Excel share one definition. */
  const totalsRow = useMemo(() => {
    if (mode === 'comparison') {
      if (!report) return null;
      return {
        periodLabel: 'TOTAL',
        birdsBought: count(report.birdsBought),
        birdsSold: count(report.birdsSold),
        weightBought: weight(report.weightBought),
        weightSold: weight(report.weightSold),
        weightLoss: report.weightLoss == null ? '—' : weight(report.weightLoss),
        buyRatePerKg: money(report.buyRatePerKg),
        sellRatePerKg: money(report.sellRatePerKg),
        marginPerKg: money(report.marginPerKg),
        amountBought: money(report.amountBought),
        amountSold: money(report.amountSold),
        purchaseExpenses: money(report.purchaseExpenses),
        netMargin: money(report.netMargin),
        owedToSuppliers: money(report.owedToSuppliers),
        pendingFromCustomers: money(report.pendingFromCustomers)
      };
    }

    // Reconciliation carries its totals on the response itself rather than in a
    // totals object, because the figures are different ones.
    if (mode === 'reconciliation') {
      if (!report) return null;
      return {
        date: 'TOTAL',
        route: `${count(report.tripCount)} trips`,
        birdsLoaded: count(report.birdsLoaded),
        birdsSold: count(report.birdsSold),
        mortality: count(report.mortality),
        returnToFarm: count(report.returnToFarm),
        birdVariance: count(report.birdVariance),
        weightLoaded: report.weightLoaded == null ? '—' : weight(report.weightLoaded),
        weightSold: weight(report.weightSold),
        weightLoss: report.weightLoss == null ? '—' : weight(report.weightLoss),
        amount: money(report.amount),
        paid: money(report.paid),
        pending: money(report.pending),
        averageRate: money(report.averageRate)
      };
    }

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
  }, [totals, mode, report]);

  /** Rows formatted for display and for export, so both agree. */
  const displayRows = useMemo(() => rows.map((row) => ({
    ...row,
    // Reconciliation fields. weightLoaded and weightLoss stay as an em dash when
    // null: the loaded weight was never captured for historical trips, and
    // showing 0.000 would claim there was no shrinkage rather than that it is
    // unknown.
    weightLoaded: row.weightLoaded === undefined
      ? undefined : (row.weightLoaded === null ? '—' : weight(row.weightLoaded)),
    weightLoss: row.weightLoss === undefined
      ? undefined : (row.weightLoss === null ? '—' : weight(row.weightLoss)),
    weightSold: row.weightSold !== undefined ? weight(row.weightSold) : undefined,
    headerWeightVariance: row.headerWeightVariance !== undefined
      ? weight(row.headerWeightVariance) : undefined,
    averageWeightPerBird: row.averageWeightPerBird == null
      ? (row.averageWeightPerBird === undefined ? undefined : '—')
      : Number(row.averageWeightPerBird).toFixed(3),
    // Bought-vs-sold fields.
    birdsBought: row.birdsBought !== undefined ? count(row.birdsBought) : undefined,
    weightBought: row.weightBought !== undefined ? weight(row.weightBought) : undefined,
    amountBought: row.amountBought !== undefined ? money(row.amountBought) : undefined,
    amountSold: row.amountSold !== undefined ? money(row.amountSold) : undefined,
    buyRatePerKg: row.buyRatePerKg !== undefined ? money(row.buyRatePerKg) : undefined,
    sellRatePerKg: row.sellRatePerKg !== undefined ? money(row.sellRatePerKg) : undefined,
    marginPerKg: row.marginPerKg !== undefined ? money(row.marginPerKg) : undefined,
    netMargin: row.netMargin !== undefined ? money(row.netMargin) : undefined,
    purchaseExpenses: row.purchaseExpenses !== undefined ? money(row.purchaseExpenses) : undefined,
    owedToSuppliers: row.owedToSuppliers !== undefined ? money(row.owedToSuppliers) : undefined,
    pendingFromCustomers: row.pendingFromCustomers !== undefined
      ? money(row.pendingFromCustomers) : undefined,
    birdsLoaded: row.birdsLoaded !== undefined ? count(row.birdsLoaded) : undefined,
    birdsSold: row.birdsSold !== undefined ? count(row.birdsSold) : undefined,
    mortality: row.mortality !== undefined ? count(row.mortality) : undefined,
    returnToFarm: row.returnToFarm !== undefined ? count(row.returnToFarm) : undefined,
    birdVariance: row.birdVariance !== undefined ? count(row.birdVariance) : undefined,
    paid: row.paid !== undefined ? money(row.paid) : undefined,
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

  const reportTitle = report?.title ?? (mode === 'reconciliation'
    ? 'Trip reconciliation'
    : mode === 'comparison' ? 'Bought vs sold' : 'Sales report');
  /**
   * Render items for the summary table: data rows with repeated values blanked,
   * and a subtotal after each group.
   *
   * Repeating the period and the primary dimension on every row makes a weekly
   * per-customer report hard to read - the week is restated for all ten
   * customers. Each is shown once, on the first row it applies to, and the group
   * is closed with its own total.
   */
  const groupedItems = useMemo(() => {
    if (mode !== 'summary' || rows.length === 0) return null;

    const hasSecond = filters.groupBy2 !== 'NONE';
    // With two dimensions, subtotal per (period, primary). With one, per period.
    const groupOf = (row) => (hasSecond
      ? `${row.periodStart}|${row.dimensionId}`
      : `${row.periodStart}`);

    const items = [];
    let previousPeriod = null;
    let previousPrimary = null;
    let currentGroup = null;
    let accumulator = null;

    const flush = () => {
      if (accumulator) items.push({ type: 'subtotal', values: accumulator });
      accumulator = null;
    };

    rows.forEach((row, index) => {
      const group = groupOf(row);
      if (group !== currentGroup) {
        flush();
        currentGroup = group;
        accumulator = { label: hasSecond ? row.dimensionName : row.periodLabel };
        SUBTOTAL_FIELDS.forEach((field) => { accumulator[field] = 0; });
        accumulator.closingBalance = 0;
      }

      SUBTOTAL_FIELDS.forEach((field) => {
        accumulator[field] += Number(row[field]) || 0;
      });
      accumulator.closingBalance += Number(row.closingBalance) || 0;

      items.push({
        type: 'data',
        index,
        // Blank a value when it repeats the row above.
        hidePeriod: row.periodLabel === previousPeriod,
        hidePrimary: hasSecond
          && row.periodLabel === previousPeriod
          && row.dimensionName === previousPrimary
      });

      previousPeriod = row.periodLabel;
      previousPrimary = row.dimensionName;
    });

    flush();
    return items;
  }, [mode, rows, filters.groupBy2]);

  const exportTitle = `${reportTitle}${drillFrom ? ` — ${drillFrom.label}` : ''}`;
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
            label="Then by (optional)"
            size="small"
            value={filters.groupBy2}
            onChange={(e) => setFilters((prev) => ({ ...prev, groupBy2: e.target.value }))}
            sx={{ minWidth: 160 }}
            helperText="e.g. Route then Driver"
          >
            {REPORT_DIMENSIONS.filter((option) => option.value !== filters.groupBy).map((option) => (
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
            <ToggleButton value="reconciliation">Trip reconciliation</ToggleButton>
            <ToggleButton value="comparison">Bought vs sold</ToggleButton>
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

      {/* Bought vs sold: the rate comparison first, since it is the figure that
          holds regardless of how much of each side is recorded. */}
      {mode === 'comparison' && report && (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
            {[
              ['Buy rate', `${money(report.buyRatePerKg)}/kg`, 'reliable'],
              ['Sell rate', `${money(report.sellRatePerKg)}/kg`, 'reliable'],
              ['Margin', `${money(report.marginPerKg)}/kg`, 'reliable'],
              ['Birds bought', count(report.birdsBought)],
              ['Birds sold', count(report.birdsSold)],
              ['Kg bought', weight(report.weightBought)],
              ['Kg sold', weight(report.weightSold)],
              ['Owed to suppliers', money(report.owedToSuppliers)],
              ['Due from customers', money(report.pendingFromCustomers)]
            ].map(([label, value, reliable]) => (
              <Paper
                key={label}
                variant="outlined"
                sx={{
                  px: 1.5,
                  py: 1,
                  minWidth: 118,
                  ...(reliable ? { borderColor: 'primary.main', borderWidth: 2 } : {})
                }}
              >
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {value}
                </Typography>
              </Paper>
            ))}
          </Box>

          {report.coverageWarning && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>Margin totals cannot be trusted here.</strong> {report.coverageWarning}
              {' '}The per-kilogram rates above (outlined) are ratios, so they hold regardless.
            </Alert>
          )}
        </>
      )}

      {/* Reconciliation headline figures and data-quality flags */}
      {mode === 'reconciliation' && report && (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
            {[
              ['Trips', count(report.tripCount)],
              ['Birds loaded', count(report.birdsLoaded)],
              ['Sold', count(report.birdsSold)],
              ['Mortality', `${count(report.mortality)} (${report.mortalityPercent ?? 0}%)`],
              ['To farm (stock)', count(report.returnToFarm)],
              ['Weight sold', `${weight(report.weightSold)} kg`],
              ['Weight loss', report.weightLoss == null ? 'Not recorded' : `${weight(report.weightLoss)} kg`],
              ['Amount', money(report.amount)],
              ['Paid', money(report.paid)],
              ['Pending', money(report.pending)]
            ].map(([label, value]) => (
              <Paper key={label} variant="outlined" sx={{ px: 1.5, py: 1, minWidth: 118 }}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {value}
                </Typography>
              </Paper>
            ))}
          </Box>

          {report.tripsWithLoadedWeight === 0 && (
            <Alert severity="info" sx={{ mb: 1 }}>
              Weight loss cannot be calculated for these trips: the weight loaded at
              the farm was never recorded. Enter it on new trips and this column
              will fill in from then on.
            </Alert>
          )}

          {report.unbalancedTripCount > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>{count(report.unbalancedTripCount)} of {count(report.tripCount)} trips
              do not balance</strong> — birds loaded does not equal sold + mortality +
              returned. Historical trips often have no loaded count at all, so the
              variance reflects missing entry rather than missing birds. New entries
              are rejected unless they balance.
              {report.headerMismatchCount > 0
                && ` ${count(report.headerMismatchCount)} trip(s) also disagree with their own sale lines.`}
              {report.correctionCount > 0
                && ` ${count(report.correctionCount)} trip(s) are marked as corrections.`}
            </Alert>
          )}
        </>
      )}

      {/* Headline figures */}
      {mode !== 'reconciliation' && mode !== 'comparison' && totals && (
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
            <Typography sx={{ fontWeight: 600 }}>{reportTitle}</Typography>
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
                {/* Summary: grouped, with repeats blanked and a subtotal per group. */}
                {groupedItems && groupedItems.map((item, itemIndex) => {
                  if (item.type === 'subtotal') {
                    const values = item.values;
                    return (
                      <TableRow key={`sub-${itemIndex}`} sx={{ bgcolor: 'action.hover' }}>
                        {columns.map((column, columnIndex) => {
                          let content = '';
                          if (columnIndex === 0) content = `${values.label} — total`;
                          else if (column.key === 'transactionCount') content = count(values.transactionCount);
                          else if (column.key === 'birds') content = count(values.birds);
                          else if (column.key === 'weight') content = weight(values.weight);
                          else if (column.key === 'amount') content = money(values.amount);
                          else if (column.key === 'payment') content = money(values.payment);
                          else if (column.key === 'pending') content = money(values.pending);
                          else if (column.key === 'closingBalance') content = money(values.closingBalance);
                          return (
                            <TableCell
                              key={column.key}
                              sx={{
                                fontWeight: 700,
                                borderTop: '1px solid',
                                borderTopColor: 'divider',
                                ...(column.numeric ? numericCellSx : { whiteSpace: 'nowrap' })
                              }}
                            >
                              {content}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  }

                  const row = displayRows[item.index];
                  const raw = rows[item.index];
                  const clickable = dimension.filterKey && raw.dimensionId;
                  return (
                    <TableRow
                      key={`row-${item.index}`}
                      hover
                      onClick={clickable ? () => drillInto(raw) : undefined}
                      sx={{ cursor: clickable ? 'pointer' : 'default' }}
                    >
                      {columns.map((column) => {
                        const isBalance = column.key === 'closingBalance';
                        // A repeated period or primary name is left blank rather
                        // than restated on every row of the group.
                        const blank = (column.key === 'periodLabel' && item.hidePeriod)
                          || (column.key === 'dimensionName' && item.hidePrimary);
                        return (
                          <TableCell
                            key={column.key}
                            sx={{
                              ...(column.numeric ? numericCellSx : { whiteSpace: 'nowrap' }),
                              ...(isBalance
                                ? { color: balanceColour(raw.closingBalance), fontWeight: 600 }
                                : {})
                            }}
                          >
                            {blank ? '' : (
                              <>
                                {isBalance && Number(raw.closingBalance) > 50000 && (
                                  <RisingIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                )}
                                {row[column.key] ?? ''}
                              </>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}

                {/* Detail and reconciliation render flat. */}
                {!groupedItems && displayRows.map((row, index) => {
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
