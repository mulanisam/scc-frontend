import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  getTradingParties,
  getPartyLedger,
  getPartyStatementPdf
} from '../service/TradingService';

/**
 * The wholesale ledger: who owes what, and what each load did to it.
 *
 * Its own screen rather than a filter on the customer ledger, because the two are read
 * differently - a route customer is looked up by name, a party by how much they owe. The
 * accounting underneath is shared: a party's balance and statement come from the same
 * customer_ledger every retail customer uses, which is where route 9's 44,03,490 and its
 * six months of history live. Two sets of balances would have meant two numbers for one
 * debt and no way to say which was right.
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

const TradingLedger = () => {
  const [parties, setParties] = useState([]);
  const [selected, setSelected] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });

  const loadParties = useCallback(async () => {
    setLoading(true);
    try {
      setParties(await getTradingParties(range));
      setError('');
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not load the parties.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { loadParties(); }, [loadParties]);

  const openParty = async (party) => {
    setSelected(party);
    setLoadingLedger(true);
    setLedger(null);
    try {
      setLedger(await getPartyLedger(party.partyId, range));
      setError('');
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not load that party\'s ledger.');
    } finally {
      setLoadingLedger(false);
    }
  };

  const download = async () => {
    if (!selected) return;
    setDownloading(true);
    try {
      const { blob, fileName } = await getPartyStatementPdf(selected.partyId, {
        startDate: range.from, endDate: range.to
      });
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
    } catch (e) {
      setError('The statement could not be produced.');
    } finally {
      setDownloading(false);
    }
  };

  const outstanding = useMemo(
    () => parties.reduce((sum, party) => sum + (Number(party.balance) || 0), 0),
    [parties]
  );

  // ---- one party's ledger ----------------------------------------------

  if (selected) {
    const statement = ledger?.statement;
    return (
      <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
          <IconButton size="small" onClick={() => { setSelected(null); setLedger(null); }}>
            <BackIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, minWidth: 200 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>{selected.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {[selected.owner, selected.city].filter(Boolean).join(' · ') || 'No details recorded'}
              {selected.mobileNo ? ` · ${selected.mobileNo}` : ''}
            </Typography>
          </Box>
          <Chip
            label={`Balance ${money(selected.balance)}`}
            color={Number(selected.balance) > 0 ? 'error' : 'default'}
            sx={{ fontWeight: 700 }}
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={downloading ? <CircularProgress size={14} /> : <DownloadIcon />}
            onClick={download}
            disabled={downloading || !selected.customerId}
          >
            Statement PDF
          </Button>
        </Stack>

        {!selected.customerId && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            This party has no ledger account, so nothing can be billed to them and there is
            no statement. Link the party to a customer first.
          </Alert>
        )}

        {loadingLedger && <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>}

        {statement && (
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Tile label="Opening" value={money(statement.openingBalance)} />
            <Tile label="Billed" value={money(statement.totals?.totalDebit)} tone="error" />
            <Tile label="Received" value={money(statement.totals?.totalCredit)} tone="success" />
            <Tile label="Closing" value={money(statement.totals?.closingBalance)} emphasis />
          </Grid>
        )}

        {ledger && (
          <Paper variant="outlined" sx={{ maxHeight: 'calc(100vh - 430px)', minHeight: 200, overflow: 'auto' }}>
            <Table size="small" stickyHeader sx={{ minWidth: 780 }}>
              <TableHead>
                <TableRow>
                  {['Date', 'Vehicle', 'Birds', 'Weight (kg)', 'Rate', 'Amount', 'Paid', 'Balance']
                    .map((heading, index) => (
                      <TableCell
                        key={heading}
                        align={index >= 2 ? 'right' : 'left'}
                        sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'background.paper' }}
                      >
                        {heading}
                      </TableCell>
                    ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {ledger.entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ py: 4, textAlign: 'center', border: 0 }}>
                      <Typography color="text.secondary">
                        No loads recorded for this party in the chosen period.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {ledger.entries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    hover
                    // A superseded entry is shown for trace, greyed rather than hidden -
                    // hiding it would make the ledger disagree with the statement.
                    sx={entry.obsolete ? { '& td': { color: 'text.disabled', fontStyle: 'italic' } } : undefined}
                  >
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{shortDate(entry.date)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{entry.vehicleNumber || '—'}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {entry.birds || '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {weight(entry.kilograms)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {Number(entry.rate) ? money(entry.rate) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'error.main' }}>
                      {Number(entry.amount) ? money(entry.amount) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'success.dark' }}>
                      {Number(entry.payment) ? money(entry.payment) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {money(entry.balanceAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>{error}</Alert>}
      </Box>
    );
  }

  // ---- the party list --------------------------------------------------

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
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
        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 260 }}>
          The dates bound the activity columns. A balance is always current — "what do they
          owe now" is not a question about a date range.
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Chip label={`Outstanding ${compact(outstanding)}`} color="error" sx={{ fontWeight: 700 }} />
        <Tooltip title="Reload">
          <IconButton size="small" onClick={loadParties} disabled={loading}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined" sx={{ maxHeight: 'calc(100vh - 360px)', minHeight: 220, overflow: 'auto' }}>
        <Table size="small" stickyHeader sx={{ minWidth: 860 }}>
          <TableHead>
            <TableRow>
              {['Party', 'Owner / city', 'Balance', 'Loads', 'Birds', 'Weight (kg)', 'Billed', 'Received', 'Last load']
                .map((heading, index) => (
                  <TableCell
                    key={heading}
                    align={index >= 2 && index <= 7 ? 'right' : 'left'}
                    sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'background.paper' }}
                  >
                    {heading}
                  </TableCell>
                ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && parties.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} sx={{ py: 4, textAlign: 'center', border: 0 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}
            {!loading && parties.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} sx={{ py: 4, textAlign: 'center', border: 0 }}>
                  <Typography color="text.secondary">No parties recorded.</Typography>
                </TableCell>
              </TableRow>
            )}
            {parties.map((party) => (
              <TableRow
                key={party.partyId}
                hover
                onClick={() => openParty(party)}
                sx={{ cursor: 'pointer', opacity: party.obsolete ? 0.55 : 1 }}
              >
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {party.name}
                  {!party.customerId && (
                    <Tooltip title="No ledger account, so nothing can be billed to them">
                      <Chip size="small" label="not billable" sx={{ ml: 1 }} />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  {[party.owner, party.city].filter(Boolean).join(' · ') || '—'}
                </TableCell>
                <TableCell align="right" sx={{
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: Number(party.balance) > 0 ? 'error.main' : 'text.disabled'
                }}>
                  {money(party.balance)}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{party.entryCount}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {party.birds ? party.birds.toLocaleString('en-IN') : '—'}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{weight(party.kilograms)}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {Number(party.amount) ? money(party.amount) : '—'}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'success.dark' }}>
                  {Number(party.received) ? money(party.received) : '—'}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{shortDate(party.lastEntry)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Ordered by what is owed — the point of the list is who to chase. Click a party for
        its loads and its statement.
      </Typography>
    </Box>
  );
};

const Tile = ({ label, value, tone, emphasis }) => (
  <Grid item xs={6} sm={3}>
    <Paper
      variant={emphasis ? 'elevation' : 'outlined'}
      elevation={emphasis ? 3 : 0}
      sx={{ p: 1.5, bgcolor: emphasis ? 'primary.main' : 'background.paper' }}
    >
      <Typography
        variant="caption"
        sx={{ textTransform: 'uppercase', letterSpacing: 0.4, color: emphasis ? 'primary.contrastText' : 'text.secondary' }}
      >
        {label}
      </Typography>
      <Typography
        variant="h6"
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

export default TradingLedger;
