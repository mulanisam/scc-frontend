import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  Grid,
  IconButton,
  LinearProgress,
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
  ArrowBack as BackIcon,
  CheckCircleOutline as PaidIcon,
  Description as ScanIcon,
  ExpandLess as CollapseIcon,
  ExpandMore as ExpandIcon,
  Refresh as RefreshIcon,
  WarningAmber as WarnIcon
} from '@mui/icons-material';
import { fetchPayables, fetchSupplierAccount } from '../service/PurchaseService';

/**
 * What we owe suppliers, and what we bought to owe it.
 *
 * The purchase side had no reports at all. Nine purchases worth 17,44,540 sat in the database
 * and the only way to see any of them was to read the table - which is part of how the payable
 * came to be understated by 12,05,020, and how a purchase of 960 birds for nothing has gone
 * unquestioned since October.
 *
 * Built as the mirror of the trading ledger screen: a list ordered by what is owed, and a
 * per-supplier account behind it. The list answers "who needs paying"; the account answers
 * "how did it get to that, and what did we receive for it".
 */

const money = (value) => `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;

const weight = (value) => `${(Number(value) || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 3, maximumFractionDigits: 3
})} kg`;

const rate = (value) => (value === null || value === undefined
  ? '—'
  : `₹${Number(value).toFixed(2)}`);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Local parts, so a yyyy-MM-dd date cannot roll back a day west of Greenwich. */
const day = (value) => {
  if (!value) return '—';
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!parts) return String(value);
  return `${Number(parts[3])} ${MONTHS[Number(parts[2]) - 1]} ${parts[1]}`;
};

const SupplierPayables = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  const [openSupplier, setOpenSupplier] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchPayables(range));
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'The payables list could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => rows.reduce((sum, row) => ({
    suppliers: sum.suppliers + 1,
    purchases: sum.purchases + row.purchases,
    birds: sum.birds + row.birds,
    kilograms: sum.kilograms + Number(row.kilograms || 0),
    bought: sum.bought + Number(row.bought || 0),
    paid: sum.paid + Number(row.paid || 0),
    outstanding: sum.outstanding + Number(row.outstanding || 0)
  }), { suppliers: 0, purchases: 0, birds: 0, kilograms: 0, bought: 0, paid: 0, outstanding: 0 }),
  [rows]);

  if (openSupplier) {
    return (
      <SupplierAccountView
        supplierId={openSupplier}
        range={range}
        onBack={() => setOpenSupplier(null)}
      />
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'flex-end' }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Supplier payables</Typography>
          <Typography variant="body2" color="text.secondary">
            What we owe, and what we bought to owe it. Most owed first.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            label="From"
            type="date"
            size="small"
            value={range.from}
            onChange={(event) => setRange((prev) => ({ ...prev, from: event.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={range.to}
            onChange={(event) => setRange((prev) => ({ ...prev, to: event.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <Tooltip title="Reload">
            <IconButton onClick={load} size="small"><RefreshIcon /></IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/*
        The dates bound the activity columns only. Said plainly because a reader who assumed
        the outstanding column was also filtered would conclude the business owed far less
        than it does - which is the exact mistake the old stored payable made.
      */}
      {(range.from || range.to) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Bought, paid and the rate cover the chosen dates. <strong>Outstanding is always
          current</strong> — what is owed is not a question about a date range.
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Tile label="Outstanding" value={money(totals.outstanding)} tone="error"
              note={`across ${totals.suppliers} supplier${totals.suppliers === 1 ? '' : 's'}`} />
        <Tile label="Bought" value={money(totals.bought)}
              note={`${totals.purchases} purchase${totals.purchases === 1 ? '' : 's'}`} />
        <Tile label="Paid" value={money(totals.paid)}
              note={totals.paid === 0 ? 'nothing has gone back yet' : 'to suppliers'} />
        <Tile label="Birds" value={totals.birds.toLocaleString('en-IN')}
              note={weight(totals.kilograms)} />
      </Grid>

      {loading && rows.length === 0 && <LinearProgress />}

      {!loading && rows.length === 0 && (
        <Alert severity="info">No purchases in this period.</Alert>
      )}

      {rows.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Supplier</TableCell>
                <TableCell align="right">Purchases</TableCell>
                <TableCell align="right">Birds</TableCell>
                <TableCell align="right">Weight</TableCell>
                <TableCell align="right">Avg rate</TableCell>
                <TableCell align="right">Bought</TableCell>
                <TableCell align="right">Paid</TableCell>
                <TableCell align="right">Outstanding</TableCell>
                <TableCell>Last purchase</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.supplierId}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setOpenSupplier(row.supplierId)}
                >
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.name}</Typography>
                        {row.branch && (
                          <Typography variant="caption" color="text.secondary">{row.branch}</Typography>
                        )}
                      </Box>
                      {/*
                        The stored column is kept in step by the ledger service, so a
                        disagreement means something wrote it directly. Shown rather than
                        hidden - it is exactly the bug this screen replaced.
                      */}
                      {row.payableDisagrees && (
                        <Tooltip title="The stored pending amount disagrees with the ledger. The ledger is the figure shown.">
                          <WarnIcon color="warning" fontSize="small" />
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                  <Num value={row.purchases} />
                  <Num value={row.birds} />
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {weight(row.kilograms)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {rate(row.averageRate)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {money(row.bought)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {Number(row.paid) > 0 ? money(row.paid) : '—'}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 700,
                      color: Number(row.outstanding) > 0 ? 'error.main' : 'success.main'
                    }}
                  >
                    {Number(row.outstanding) > 0 ? money(row.outstanding) : 'settled'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{day(row.lastPurchase)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

/**
 * One supplier's account.
 *
 * The ledger and the purchases together, because a supplier query needs both: the ledger says
 * what is owed and how it got there, the purchases say what was received for it.
 */
const SupplierAccountView = ({ supplierId, range, onBack }) => {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openPurchase, setOpenPurchase] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSupplierAccount(supplierId, range)
      .then((data) => { if (!cancelled) { setAccount(data); setError(''); } })
      .catch((e) => {
        if (!cancelled) {
          setError(e.response?.data?.message || e.message || 'The account could not be loaded.');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [supplierId, range]);

  if (loading) return <LinearProgress />;
  if (error) return <Alert severity="error" action={<IconButton onClick={onBack}><BackIcon /></IconButton>}>{error}</Alert>;
  if (!account) return null;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Tooltip title="Back to payables">
          <IconButton onClick={onBack} size="small"><BackIcon /></IconButton>
        </Tooltip>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{account.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {account.branch || 'No branch recorded'}
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Tile label="Outstanding" value={money(account.totals.outstanding)} tone="error"
              note="what we owe now" />
        <Tile label="Bought" value={money(account.totals.bought)}
              note={`${account.totals.purchases} purchase${account.totals.purchases === 1 ? '' : 's'}`} />
        <Tile label="Average rate" value={rate(account.totals.averageRate)}
              note={weight(account.totals.kilograms)} />
        <Tile label="Trip expenses" value={money(account.totals.tripExpenses)}
              note="diesel, hamali, driver" />
      </Grid>

      <Typography variant="overline" color="text.secondary">Account</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Detail</TableCell>
              <TableCell align="right">Purchased</TableCell>
              <TableCell align="right">Paid</TableCell>
              <TableCell align="right">Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Number(account.openingBalance) !== 0 && (
              <TableRow>
                <TableCell colSpan={4} sx={{ fontStyle: 'italic' }}>
                  Owed before {day(account.from)}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {money(account.openingBalance)}
                </TableCell>
              </TableRow>
            )}
            {account.rows.map((row, index) => (
              <TableRow key={`${row.referenceType}-${row.referenceId}-${index}`} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{day(row.date)}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Chip
                      size="small"
                      label={row.type === 'PURCHASE' ? 'Purchase' : 'Payment'}
                      color={row.type === 'PURCHASE' ? 'default' : 'success'}
                      variant={row.type === 'PURCHASE' ? 'outlined' : 'filled'}
                    />
                    <Typography variant="body2">{row.description}</Typography>
                    {row.backdated && (
                      <Tooltip title="Entered after later rows, so the balances below it were recalculated.">
                        <Chip size="small" label="backdated" variant="outlined" color="warning" />
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {Number(row.purchased) > 0 ? money(row.purchased) : '—'}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'success.main' }}>
                  {Number(row.paid) > 0 ? money(row.paid) : '—'}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  {money(row.balance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="overline" color="text.secondary">Purchases</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 32 }} />
              <TableCell>Date</TableCell>
              <TableCell>Farm</TableCell>
              <TableCell>Vehicle</TableCell>
              <TableCell align="right">Birds</TableCell>
              <TableCell align="right">Weight</TableCell>
              <TableCell align="right">Rate</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">Outstanding</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {account.purchases.map((purchase) => {
              const open = openPurchase === purchase.id;
              const settled = Number(purchase.outstanding) <= 0;
              return (
                <React.Fragment key={purchase.id}>
                  <TableRow hover>
                    <TableCell padding="none">
                      <IconButton
                        size="small"
                        onClick={() => setOpenPurchase(open ? null : purchase.id)}
                        aria-label={open ? 'Hide DC lines' : 'Show DC lines'}
                      >
                        {open ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{day(purchase.date)}</TableCell>
                    <TableCell>{purchase.farm || '—'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{purchase.vehicleNo || '—'}</TableCell>
                    <Num value={purchase.birds} />
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {weight(purchase.kilograms)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {rate(purchase.rate)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {money(purchase.amount)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {settled ? (
                        <Tooltip title="Fully paid">
                          <PaidIcon color="success" fontSize="small" />
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                          {money(purchase.outstanding)}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={9} sx={{ py: 0, border: open ? undefined : 'none' }}>
                      <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ py: 2, pl: 4, pr: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            DC lines
                            {Number(purchase.tripExpenses) > 0
                              && ` · trip expenses ${money(purchase.tripExpenses)}`}
                            {purchase.driverName && ` · driver ${purchase.driverName}`}
                          </Typography>
                          <Table size="small" sx={{ mt: 1, maxWidth: 720 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>DC no</TableCell>
                                <TableCell align="right">Birds</TableCell>
                                <TableCell align="right">Weight</TableCell>
                                <TableCell align="right">Rate</TableCell>
                                <TableCell align="right">Amount</TableCell>
                                <TableCell align="center">Scan</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {purchase.lines.map((dcLine) => (
                                <TableRow key={dcLine.id}>
                                  <TableCell>{dcLine.dcNo || '—'}</TableCell>
                                  <Num value={dcLine.birds} />
                                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {weight(dcLine.kilograms)}
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {rate(dcLine.rate)}
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {money(dcLine.amount)}
                                  </TableCell>
                                  <TableCell align="center">
                                    {dcLine.hasScan
                                      ? <Tooltip title="A DC scan is attached"><ScanIcon fontSize="small" color="action" /></Tooltip>
                                      : <Typography variant="caption" color="text.disabled">none</Typography>}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

const TONE = { error: 'error.main', success: 'success.main', default: 'text.primary' };

const Tile = ({ label, value, note, tone = 'default' }) => (
  <Grid item xs={6} md={3}>
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {label}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: TONE[tone], fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </Typography>
        {note && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
            {note}
          </Typography>
        )}
      </CardContent>
    </Card>
  </Grid>
);

/** A zero reads as a dash, so the eye stays on the figures that are not zero. */
const Num = ({ value }) => (
  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
    {Number(value) > 0 ? Number(value).toLocaleString('en-IN') : '—'}
  </TableCell>
);

export { SupplierAccountView };
export default SupplierPayables;
