import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
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
  Typography,
} from '@mui/material';
import {
  CheckCircle as OptedInIcon,
  Block as OptedOutIcon,
  HelpOutline as NeverAskedIcon,
} from '@mui/icons-material';
import { getConsent, setWhatsappConsent } from '../service/MessagingService';
import { compactMoney, money, prettyMobile, stamp } from './messagingFormat';

/**
 * Who has agreed to be messaged on WhatsApp, and who has not.
 *
 * A statement carries a balance, so consent is recorded per customer rather than assumed -
 * this is where that consent is given or withdrawn, and the only place it can be. The
 * balance behind each bucket matters more than the headcount: 40 customers with nothing
 * owed opting in changes nothing; 5 who owe most of the book not opting in is the reason
 * the WhatsApp channel looks unused.
 */

const STATUS_META = {
  OPTED_IN: { label: 'Opted in', color: 'success', icon: <OptedInIcon fontSize="small" /> },
  OPTED_OUT: { label: 'Opted out', color: 'error', icon: <OptedOutIcon fontSize="small" /> },
  NEVER_ASKED: { label: 'Never asked', color: 'default', icon: <NeverAskedIcon fontSize="small" /> },
};

const FILTERS = ['ALL', 'NEVER_ASKED', 'OPTED_IN', 'OPTED_OUT'];
const FILTER_LABEL = { ALL: 'Everyone', NEVER_ASKED: 'Never asked', OPTED_IN: 'Opted in', OPTED_OUT: 'Opted out' };

const WhatsappConsent = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getConsent());
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    let list = data?.rows || [];
    if (filter !== 'ALL') list = list.filter((row) => row.status === filter);
    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((row) => row.customerName?.toLowerCase().includes(query)
        || row.shopName?.toLowerCase().includes(query)
        || row.mobileNo?.includes(query));
    }
    return list;
  }, [data, filter, search]);

  const toggle = async (row, optIn) => {
    setBusyId(row.customerId);
    try {
      await setWhatsappConsent(row.customerId, optIn);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !data) return <LinearProgress sx={{ mt: 2 }} />;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {data && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <SummaryTile label="Opted in" value={data.optedIn} note={`${compactMoney(data.optedInBalance)} reachable`} tone="success" />
          <SummaryTile label="Opted out" value={data.optedOut} tone="error" />
          <SummaryTile label="Never asked" value={data.neverAsked} note={`${compactMoney(data.notOptedInBalance)} not yet reachable`} tone="warning" />
          <SummaryTile label="Reachable total" value={data.reachable} note="have a usable number" />
        </Grid>
      )}

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        {FILTERS.map((option) => (
          <Chip
            key={option}
            size="small"
            label={FILTER_LABEL[option]}
            color={option === filter ? 'primary' : 'default'}
            variant={option === filter ? 'filled' : 'outlined'}
            onClick={() => setFilter(option)}
          />
        ))}
        <TextField
          size="small"
          placeholder="Search name, shop, number"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ ml: 'auto', minWidth: 220 }}
        />
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell>Number</TableCell>
              <TableCell align="right">Balance</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Since</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const meta = STATUS_META[row.status] || STATUS_META.NEVER_ASKED;
              const isBusy = busyId === row.customerId;
              return (
                <TableRow key={row.customerId} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.customerName}</Typography>
                    {row.shopName && (
                      <Typography variant="caption" color="text.secondary">
                        {row.shopName}{row.cityName ? `, ${row.cityName}` : ''}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{prettyMobile(row.mobileNo)}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{money(row.balance)}</TableCell>
                  <TableCell>
                    <Chip size="small" icon={meta.icon} label={meta.label} color={meta.color} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {row.status === 'OPTED_OUT' ? stamp(row.optedOutAt) : stamp(row.optedInAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {row.status === 'OPTED_IN' ? (
                      <Tooltip title="Withdraw consent">
                        <Button
                          size="small"
                          color="error"
                          disabled={isBusy}
                          startIcon={isBusy ? <CircularProgress size={14} /> : null}
                          onClick={() => toggle(row, false)}
                        >
                          Opt out
                        </Button>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Record that this customer has agreed to WhatsApp messages">
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={isBusy}
                          startIcon={isBusy ? <CircularProgress size={14} /> : null}
                          onClick={() => toggle(row, true)}
                        >
                          Opt in
                        </Button>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No customers match this filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

const TONE_COLOR = { success: 'success.main', error: 'error.main', warning: 'warning.main', default: 'text.primary' };

const SummaryTile = ({ label, value, note, tone = 'default' }) => (
  <Grid item xs={6} sm={3}>
    <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 600, mt: 0.5, color: TONE_COLOR[tone], fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
      {note && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
          {note}
        </Typography>
      )}
    </Paper>
  </Grid>
);

export default WhatsappConsent;
