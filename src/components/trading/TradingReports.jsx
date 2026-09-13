import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { getTradingReport } from '../service/TradingService';

/**
 * What the wholesale side did, by party and by day.
 *
 * Separate from the sales reports, which is the whole point of having moved route 9 out of
 * the routes: a route report is read per trip and per driver, trading per party, and for
 * six months these eleven parties sat inside the route figures distorting exactly those
 * numbers - 571 sales and 60 lakh of them.
 *
 * One figure here does not come from the entries: outstanding is the sum of the parties'
 * ledger balances, not billed minus received. Those differ, and the difference is real -
 * a party carries a balance from before whatever period is on screen, and 44,03,490 of
 * route 9's did.
 */

const money = (value) => `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;

const compact = (value) => {
  const amount = Math.abs(Number(value) || 0);
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return money(amount);
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const shortDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const weight = (value) => {
  const kg = Number(value) || 0;
  return kg === 0 ? '—' : kg.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
};

const number = (value) => (Number(value) ? Number(value).toLocaleString('en-IN') : '—');

/** Presets, because a wholesale report is nearly always asked for by month. */
const PRESETS = [
  {
    label: 'This month',
    range: () => {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: iso(first), to: iso(now) };
    }
  },
  {
    label: 'Last 30 days',
    range: () => {
      const now = new Date();
      const then = new Date();
      then.setDate(then.getDate() - 30);
      return { from: iso(then), to: iso(now) };
    }
  },
  {
    label: 'This year',
    range: () => {
      const now = new Date();
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(now) };
    }
  },
  { label: 'All time', range: () => ({ from: '', to: '' }) }
];

/** Local parts, not toISOString: east of Greenwich that shifts the date back a day. */
function iso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const TradingReports = () => {
  const [range, setRange] = useState({ from: '', to: '' });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await getTradingReport(range));
      setError('');
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not load the trading report.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const totals = report?.totals;

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} sx={{ mb: 2 }}>
        <TextField
          size="small" type="date" label="From" value={range.from}
          onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small" type="date" label="To" value={range.to}
          onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))}
          InputLabelProps={{ shrink: true }}
        />
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {PRESETS.map((preset) => (
            <Chip
              key={preset.label}
              size="small"
              label={preset.label}
              variant="outlined"
              onClick={() => setRange(preset.range())}
            />
          ))}
        </Stack>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Reload">
          <IconButton size="small" onClick={load} disabled={loading}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading && !report && <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>}

      {totals && (
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Tile label="Loads" value={number(totals.entries)} />
          <Tile label="Parties" value={number(totals.parties)} />
          <Tile label="Birds" value={number(totals.birds)} />
          <Tile label="Weight (kg)" value={weight(totals.kilograms)} />
          <Tile label="Billed" value={compact(totals.amount)} tone="error" />
          <Tile label="Received" value={compact(totals.received)} tone="success" />
          <Tile label="Avg rate" value={`₹${Number(totals.averageRate || 0).toFixed(2)}`} />
          <Tile label="Outstanding" value={compact(totals.outstanding)} emphasis />
        </Grid>
      )}

      {report && (
        <>
          <Tabs value={view} onChange={(event, next) => setView(next)} sx={{ mb: 1, minHeight: 40 }}>
            <Tab label={`By party (${report.parties.length})`} sx={{ minHeight: 40, textTransform: 'none' }} />
            <Tab label={`By day (${report.days.length})`} sx={{ minHeight: 40, textTransform: 'none' }} />
          </Tabs>

          <Paper variant="outlined" sx={{ maxHeight: 'calc(100vh - 470px)', minHeight: 200, overflow: 'auto' }}>
            {view === 0 ? (
              <Table size="small" stickyHeader sx={{ minWidth: 860 }}>
                <TableHead>
                  <TableRow>
                    {['Party', 'Loads', 'Birds', 'Weight (kg)', 'Billed', 'Received', 'Avg rate', 'Balance', 'Last load']
                      .map((heading, index) => (
                        <TableCell
                          key={heading}
                          align={index >= 1 && index <= 7 ? 'right' : 'left'}
                          sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'background.paper' }}
                        >
                          {heading}
                        </TableCell>
                      ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.parties.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} sx={{ py: 4, textAlign: 'center', border: 0 }}>
                        <Typography color="text.secondary">No trading in this period.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {report.parties.map((line) => (
                    <TableRow key={line.partyId} hover>
                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{line.name}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{line.entries}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{number(line.birds)}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{weight(line.kilograms)}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'error.main' }}>
                        {Number(line.amount) ? money(line.amount) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'success.dark' }}>
                        {Number(line.received) ? money(line.received) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {Number(line.averageRate) ? `₹${Number(line.averageRate).toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        color: Number(line.balance) > 0 ? 'error.main' : 'text.disabled'
                      }}>
                        {money(line.balance)}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{shortDate(line.lastEntry)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Table size="small" stickyHeader sx={{ minWidth: 700 }}>
                <TableHead>
                  <TableRow>
                    {['Date', 'Loads', 'Birds', 'Weight (kg)', 'Billed', 'Received', 'Avg rate']
                      .map((heading, index) => (
                        <TableCell
                          key={heading}
                          align={index >= 1 ? 'right' : 'left'}
                          sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'background.paper' }}
                        >
                          {heading}
                        </TableCell>
                      ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.days.map((day) => (
                    <TableRow key={day.date} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 500 }}>{shortDate(day.date)}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{day.entries}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{number(day.birds)}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{weight(day.kilograms)}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'error.main' }}>
                        {Number(day.amount) ? money(day.amount) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'success.dark' }}>
                        {Number(day.received) ? money(day.received) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {Number(day.averageRate) ? `₹${Number(day.averageRate).toFixed(2)}` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Outstanding is the parties' current ledger balances, not billed less received —
            a party carries a balance from before this period.
          </Typography>
        </>
      )}
    </Box>
  );
};

/**
 * One figure.
 *
 * Four across on a desktop, so eight tiles make two even rows. md={3} rather than the
 * lg={1.5} that would fit all eight on one line: MUI's Grid takes whole columns only, and
 * a fractional value silently produces no class at all.
 */
const Tile = ({ label, value, tone, emphasis }) => (
  <Grid item xs={6} sm={4} md={3}>
    <Paper
      variant={emphasis ? 'elevation' : 'outlined'}
      elevation={emphasis ? 3 : 0}
      sx={{ p: 1.25, height: '100%', bgcolor: emphasis ? 'primary.main' : 'background.paper' }}
    >
      <Typography
        variant="caption"
        sx={{
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          display: 'block',
          color: emphasis ? 'primary.contrastText' : 'text.secondary'
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: emphasis ? 'primary.contrastText' : (tone ? `${tone}.main` : 'text.primary')
        }}
      >
        {value}
      </Typography>
    </Paper>
  </Grid>
);

export default TradingReports;
