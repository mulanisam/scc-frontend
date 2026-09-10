import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  ContentCopy as DuplicateIcon,
  Groups as SharedIcon,
  PhoneDisabled as NoPhoneIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  WhatsApp as WhatsAppIcon
} from '@mui/icons-material';
import { fetchContactQuality, updateCustomerMobile } from '../service/ContactQualityService';
import { formatMobile, validateWhileTyping, isValidMobile } from '../../utils/mobileRules';

/**
 * Customer contact clean-up.
 *
 * The list that has to be emptied before ledger statements can be sent over
 * WhatsApp. A statement carries a balance, so it can only go to a number that is
 * valid and belongs to one customer - and right now 130 customers have no usable
 * number and 27 more share one with somebody else.
 *
 * Ordered by balance, because that is the order the work pays back in: the single
 * largest unreachable customer owes over two lakh and traded three days ago.
 *
 * The screen edits one field. It deliberately does not open the full customer form,
 * so a morning of phone-number entry cannot blank an address or a city by omission.
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

const STATUS_LABEL = {
  MISSING: 'No number',
  TOO_SHORT: 'Too short',
  TOO_LONG: 'Too long',
  BAD_PREFIX: 'Bad prefix',
  PLACEHOLDER: 'Placeholder',
  SHARED: 'Shared'
};

/** One editable row. Saves on its own, so a long list can be worked through. */
const NumberEditor = ({ row, onSaved, onError }) => {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const feedback = validateWhileTyping(value);
  const canSave = isValidMobile(value) && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await updateCustomerMobile(row.customerId, value);
      setSaved(true);
      onSaved(row.customerId, value);
    } catch (error) {
      // The server owns the rules that need a database to check - chiefly whether
      // the number already belongs to somebody else - so its message is shown.
      onError(`${row.customerName}: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <Chip
        size="small"
        color="success"
        icon={<CheckIcon sx={{ fontSize: 15 }} />}
        label={formatMobile(value)}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
      <TextField
        size="small"
        placeholder="10-digit mobile"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') save(); }}
        error={feedback.tone === 'error'}
        helperText={feedback.message || ' '}
        inputProps={{ inputMode: 'numeric', maxLength: 15, style: { fontVariantNumeric: 'tabular-nums' } }}
        sx={{ width: 168, '& .MuiFormHelperText-root': { mx: 0.5, fontSize: 11 } }}
        InputProps={{
          endAdornment: feedback.tone === 'success' ? (
            <InputAdornment position="end"><CheckIcon color="success" fontSize="small" /></InputAdornment>
          ) : null
        }}
      />
      <Tooltip title={canSave ? 'Save this number' : 'Enter a valid 10-digit number'}>
        <span>
          <IconButton size="small" color="primary" onClick={save} disabled={!canSave} sx={{ mt: 0.25 }}>
            {saving ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

/**
 * @param {Object} props
 * @param {boolean} [props.embedded] Rendered as a Master Data tab rather than its
 *   own page: drops the outer Container and the page title, because the host
 *   already supplies both, and keeps everything else identical.
 */
const ContactQuality = ({ embedded = false }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fixed, setFixed] = useState({});
  const [filter, setFilter] = useState('owing');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await fetchContactQuality());
    } catch (err) {
      setError(err.message || 'Could not load contact quality');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (customerId, mobileNo) => {
    setFixed((current) => ({ ...current, [customerId]: mobileNo }));
    setError('');
  };

  const unusable = useMemo(() => {
    const rows = data?.unusableNumbers ?? [];
    if (filter === 'owing') return rows.filter((row) => Number(row.balance) > 0);
    if (filter === 'trading') return rows.filter((row) => row.saleCount > 0);
    return rows;
  }, [data, filter]);

  const fixedCount = Object.keys(fixed).length;
  const progress = data?.unusable ? (fixedCount / data.unusable) * 100 : 0;

  // Embedded inside Master Data there is already a page container and heading, so
  // this renders as a plain Box; standalone it supplies its own.
  const Shell = embedded
    ? ({ children }) => <Box sx={{ pb: 2 }}>{children}</Box>
    : ({ children }) => <Container maxWidth="xl" sx={{ py: 2.5 }}>{children}</Container>;

  if (loading && !data) {
    return (
      <Shell>
        {!embedded && <Skeleton variant="text" width={320} height={44} />}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {Array.from({ length: 4 }).map((unused, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}><Skeleton variant="rounded" height={92} /></Grid>
          ))}
          <Grid item xs={12}><Skeleton variant="rounded" height={420} /></Grid>
        </Grid>
      </Shell>
    );
  }

  return (
    <Shell>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box>
          {!embedded && (
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Customer contact clean-up</Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            A ledger statement carries a balance, so it can only be sent to a number that belongs to one customer.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {fixedCount > 0 && (
            <Chip color="success" icon={<CheckIcon />} label={`${fixedCount} fixed this session`} />
          )}
          <Tooltip title="Reload">
            <IconButton onClick={load} disabled={loading} color="primary">
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {data && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[
              {
                label: 'Can be messaged',
                value: data.reachable,
                sub: `of ${data.totalCustomers} customers`,
                tone: 'success.main',
                icon: <WhatsAppIcon fontSize="small" />
              },
              {
                label: 'No usable number',
                value: data.unusable,
                sub: `${compact(data.unreachableBalance)} owed, unreachable`,
                tone: 'error.main',
                icon: <NoPhoneIcon fontSize="small" />
              },
              {
                label: 'On a shared number',
                value: data.onSharedNumbers,
                sub: `${data.sharedNumberCount} numbers · ${compact(data.sharedNumberBalance)}`,
                tone: 'warning.dark',
                icon: <SharedIcon fontSize="small" />
              },
              {
                label: 'Likely duplicate records',
                value: (data.sharedNumbers ?? []).filter((group) => group.likelyDuplicateCustomer).length,
                sub: 'same name on one number',
                tone: 'secondary.main',
                icon: <DuplicateIcon fontSize="small" />
              }
            ].map((tile) => (
              <Grid item xs={12} sm={6} md={3} key={tile.label}>
                <Paper elevation={1} sx={{ p: 1.75, height: '100%', borderLeft: 4, borderColor: tile.tone }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, color: tile.tone }}>
                    {tile.icon}
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                      {tile.label}
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {Number(tile.value).toLocaleString('en-IN')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{tile.sub}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {fixedCount > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {fixedCount} of {data.unusable} numbers supplied
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Reload to refresh the totals
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={Math.min(progress, 100)} sx={{ height: 6, borderRadius: 3 }} />
            </Box>
          )}

          {/* Likely duplicates first: these are worth more than a phone number. */}
          {(data.sharedNumbers ?? []).some((group) => group.likelyDuplicateCustomer) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle sx={{ fontSize: 14, fontWeight: 700 }}>
                Some of these look like one customer entered twice
              </AlertTitle>
              Where the same name appears twice on one number, the customer's balance is split across two
              records — so neither statement would be right, and giving one of them a different number
              would not fix it. Those need merging. Marked <strong>Likely duplicate</strong> below.
            </Alert>
          )}

          {/* Shared numbers, grouped - the decision is per number, not per customer */}
          <Card elevation={2} sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Numbers used by more than one customer
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sending a statement to any of these discloses every listed customer's balance to whoever holds the phone.
              </Typography>

              <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                {(data.sharedNumbers ?? []).map((group) => (
                  <Paper
                    key={group.mobileNo}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderColor: group.likelyDuplicateCustomer ? 'secondary.main' : 'divider',
                      borderLeftWidth: 4
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {formatMobile(group.mobileNo)}
                      </Typography>
                      <Chip size="small" label={`${group.customerCount} customers`} />
                      <Chip size="small" variant="outlined" color="error" label={`${money(group.totalBalance)} between them`} />
                      {group.likelyDuplicateCustomer && (
                        <Chip size="small" color="secondary" icon={<DuplicateIcon sx={{ fontSize: 14 }} />} label="Likely duplicate" />
                      )}
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      {group.suggestion}
                    </Typography>

                    <Divider sx={{ mb: 1 }} />

                    <Table size="small">
                      <TableBody>
                        {group.customers.map((row) => (
                          <TableRow key={row.customerId}>
                            <TableCell sx={{ borderBottom: 'none', py: 0.5, pl: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.customerName}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {[row.shopName, row.cityName].filter(Boolean).join(' · ') || 'No shop recorded'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ borderBottom: 'none', py: 0.5, whiteSpace: 'nowrap' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                {money(row.balance)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {row.saleCount} sales · last {shortDate(row.lastSaleDate)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ borderBottom: 'none', py: 0.5, pr: 0, width: 220 }}>
                              {fixed[row.customerId] ? (
                                <Chip size="small" color="success" icon={<CheckIcon sx={{ fontSize: 15 }} />} label={formatMobile(fixed[row.customerId])} />
                              ) : (
                                <NumberEditor row={row} onSaved={handleSaved} onError={setError} />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>

          {/* Missing and invalid numbers */}
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Missing and invalid numbers
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Highest balance first. Type the number and press Enter.
                  </Typography>
                </Box>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={filter}
                  onChange={(event, value) => value && setFilter(value)}
                >
                  <ToggleButton value="owing">Owe money</ToggleButton>
                  <ToggleButton value="trading">Have traded</ToggleButton>
                  <ToggleButton value="all">All</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {unusable.length === 0 ? (
                <Alert severity="success" variant="outlined">
                  Nothing in this list. Every customer in this filter has a usable number.
                </Alert>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Shop / city</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Recorded</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Problem</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Balance</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Sales</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Last sale</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Correct number</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {unusable.map((row) => {
                        const done = Boolean(fixed[row.customerId]);
                        return (
                          <TableRow key={row.customerId} hover sx={{ opacity: done ? 0.55 : 1 }}>
                            <TableCell sx={{ fontWeight: 600 }}>{row.customerName}</TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>
                              {[row.shopName, row.cityName].filter(Boolean).join(' · ') || '—'}
                            </TableCell>
                            <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {row.mobileNo ? (
                                <Typography component="span" variant="body2" sx={{ color: 'error.main' }}>
                                  {row.mobileNo}
                                </Typography>
                              ) : (
                                <CloseIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                              )}
                            </TableCell>
                            <TableCell>
                              <Tooltip title={row.reason}>
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  color={row.status === 'MISSING' ? 'default' : 'error'}
                                  label={STATUS_LABEL[row.status] ?? row.status}
                                />
                              </Tooltip>
                            </TableCell>
                            <TableCell align="right" sx={{
                              fontWeight: 700,
                              fontVariantNumeric: 'tabular-nums',
                              color: Number(row.balance) > 0 ? 'error.main' : 'text.disabled'
                            }}>
                              {money(row.balance)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{row.saleCount}</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{shortDate(row.lastSaleDate)}</TableCell>
                            <TableCell sx={{ width: 220 }}>
                              {done ? (
                                <Chip size="small" color="success" icon={<CheckIcon sx={{ fontSize: 15 }} />} label={formatMobile(fixed[row.customerId])} />
                              ) : (
                                <NumberEditor row={row} onSaved={handleSaved} onError={setError} />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              )}

              <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Showing {unusable.length} of {data.unusable}. A number already recorded for another customer
                  is refused, so this screen cannot create a new shared number.
                </Typography>
                <Button size="small" startIcon={<RefreshIcon />} onClick={load}>Refresh totals</Button>
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Shell>
  );
};

export default ContactQuality;
