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
  ArrowDownward,
  ArrowUpward,
  CalendarToday as DateIcon,
  Inventory2 as BirdsIcon,
  LocalShipping as TripIcon,
  MonetizationOn as MoneyIcon,
  PriceCheck as CollectedIcon,
  ReportProblem as AlertIcon,
  Refresh as RefreshIcon,
  Scale as ScaleIcon,
  Speed as RateIcon,
  Warning as PendingIcon
} from '@mui/icons-material';
import { fetchDashboardOverview } from '../service/DashboardService';
import {
  change,
  compactMoney,
  count,
  describeChange,
  describePending,
  money,
  percent,
  rate,
  shortDate,
  summariseTrend,
  weight
} from './dashboardFormat';

/**
 * Business overview.
 *
 * What this replaces: seven tiles of today's sale figures, a date picker the
 * server ignored, and three fetches to endpoints that had never existed. On any
 * morning before the first trip is entered it showed seven zeros, which is why it
 * told nobody anything.
 *
 * The shape now follows how the day is actually run: what happened on the chosen
 * day against the day before, a fortnight of trend, then route by route, then who
 * owes money, then the purchase side, then the things that need fixing.
 */

const numeric = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const today = () => new Date().toISOString().slice(0, 10);

/**
 * A route's share of the period, as a proportion bar in the table cell.
 *
 * Not a chart panel - it is what lets nine routes be ranked at a glance without
 * reading nine amounts.
 */
const ShareBar = ({ value }) => {
  const share = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 96 }}>
      <Box sx={{ flex: 1, height: 6, bgcolor: 'action.hover', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ width: `${share}%`, height: '100%', bgcolor: 'primary.main', borderRadius: 3 }} />
      </Box>
      <Typography variant="caption" sx={{ minWidth: 34, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {share.toFixed(1)}%
      </Typography>
    </Box>
  );
};

/** A headline figure with its change against the previous day. */
const KpiTile = ({ icon, label, value, sub, delta, tone = 'primary.main' }) => (
  <Paper elevation={1} sx={{ p: 1.75, height: '100%', borderLeft: 4, borderColor: tone }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
      <Box sx={{ color: tone, display: 'flex' }}>{icon}</Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>

    <Typography variant="h5" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
      {value}
    </Typography>

    <Box sx={{ mt: 0.5, minHeight: 22, display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {delta && delta.direction !== 'flat' && (
        <Chip
          size="small"
          icon={delta.direction === 'up' ? <ArrowUpward sx={{ fontSize: 13 }} /> : <ArrowDownward sx={{ fontSize: 13 }} />}
          label={delta.percent === null ? 'new' : `${delta.percent.toFixed(0)}%`}
          color={delta.good ? 'success' : 'error'}
          variant="outlined"
          sx={{ height: 20, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
        />
      )}
      <Typography variant="caption" color="text.secondary">{sub}</Typography>
    </Box>
  </Paper>
);

/** Label and value on one line, the pattern used in every summary panel. */
const Line = ({ label, value, tone, bold }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'baseline' }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography
      variant="body2"
      sx={{ fontWeight: bold ? 700 : 600, color: tone, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}
    >
      {value}
    </Typography>
  </Box>
);

const PanelHeading = ({ title, note, action }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{title}</Typography>
      {note && <Typography variant="caption" color="text.secondary">{note}</Typography>}
    </Box>
    {action}
  </Box>
);

const Dashboard = () => {
  const [asOfDate, setAsOfDate] = useState(today);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [routeWindow, setRouteWindow] = useState('month');

  const load = useCallback(async (date) => {
    setLoading(true);
    setError('');
    try {
      setOverview(await fetchDashboardOverview(date));
    } catch (err) {
      setError(err.message || 'Could not load the dashboard');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(asOfDate); }, [load, asOfDate]);

  const day = overview?.day;
  const previous = overview?.previousDay;
  const mtd = overview?.monthToDate;
  const ytd = overview?.yearToDate;

  const deltas = useMemo(() => {
    if (!day || !previous) return {};
    const build = (key, higherIsBetter = true) => {
      const result = change(day[key], previous[key]);
      return { ...result, good: result.direction === 'flat' ? true : (result.direction === 'up') === higherIsBetter };
    };
    return {
      amount: build('amount'),
      received: build('received'),
      pending: build('pending', false),
      birdsSold: build('birdsSold'),
      weightSold: build('weightSold'),
      averageRate: build('averageRate')
    };
  }, [day, previous]);

  const trend = useMemo(() => summariseTrend(overview?.dailyTrend), [overview]);
  const routes = routeWindow === 'day' ? (overview?.routesOnDay ?? []) : (overview?.routesMonthToDate ?? []);
  const pendingTile = day ? describePending(day.pending, day.amount, day.received) : null;

  /**
   * The selected day's tally, read from the day's own row in the trend rather than
   * recomputed: the trip record's sold figure is what the trip was closed with,
   * and that is what has to balance against loaded, mortality and returns.
   * Null when the day has no trip at all, which is not a mismatch.
   */
  const dayTally = useMemo(() => {
    const point = overview?.dailyTrend?.find((entry) => entry.date === overview.asOfDate);
    if (!point || (point.birdsLoaded === 0 && point.tripCount === 0)) return null;
    return point.birdTally;
  }, [overview]);

  if (loading && !overview) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Skeleton variant="text" width={280} height={44} />
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {Array.from({ length: 6 }).map((unused, index) => (
            <Grid item xs={12} sm={6} md={2} key={index}>
              <Skeleton variant="rounded" height={104} />
            </Grid>
          ))}
          <Grid item xs={12}><Skeleton variant="rounded" height={280} /></Grid>
          <Grid item xs={12} md={8}><Skeleton variant="rounded" height={340} /></Grid>
          <Grid item xs={12} md={4}><Skeleton variant="rounded" height={340} /></Grid>
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2.5 }}>
      {/* Heading and date */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Business overview</Typography>
          <Typography variant="body2" color="text.secondary">
            {overview ? `${shortDate(overview.asOfDate)} · generated ${new Date(overview.generatedAt).toLocaleTimeString('en-IN')}` : ''}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" variant="outlined" onClick={() => setAsOfDate(today())} disabled={asOfDate === today()}>
            Today
          </Button>
          {overview?.latestTradingDate && overview.latestTradingDate !== asOfDate && (
            <Button size="small" variant="outlined" onClick={() => setAsOfDate(overview.latestTradingDate)}>
              Last trading day
            </Button>
          )}
          <TextField
            label="As of"
            type="date"
            size="small"
            value={asOfDate}
            onChange={(event) => setAsOfDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            InputProps={{ startAdornment: <DateIcon color="primary" fontSize="small" sx={{ mr: 1 }} /> }}
            sx={{ width: 190 }}
          />
          <Tooltip title="Reload">
            <IconButton onClick={() => load(asOfDate)} disabled={loading} color="primary">
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {overview && !overview.tradedOnAsOfDate && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No sales are recorded for {shortDate(overview.asOfDate)}.
          {overview.latestTradingDate
            ? ` The last day with trading was ${shortDate(overview.latestTradingDate)}.`
            : ' There are no sales in the system at all.'}
          {' '}Month- and year-to-date figures below still include everything up to this date.
        </Alert>
      )}

      {overview && (
        <>
          {/* Day headline */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2}>
              <KpiTile
                icon={<MoneyIcon fontSize="small" />}
                label="Billed"
                value={money(day.amount)}
                sub={describeChange(deltas.amount ?? { direction: 'flat' }, 'prev day')}
                delta={deltas.amount}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <KpiTile
                icon={<CollectedIcon fontSize="small" />}
                label="Collected"
                value={money(day.received)}
                sub={`${percent(day.recoveryPercent)} of billed`}
                delta={deltas.received}
                tone="success.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <KpiTile
                icon={<PendingIcon fontSize="small" />}
                label={Number(day.pending) < 0 ? 'Over-collected' : 'Uncollected'}
                value={pendingTile.headline}
                sub={pendingTile.note}
                tone={pendingTile.tone === 'error' ? 'error.main' : pendingTile.tone === 'success' ? 'success.main' : 'text.disabled'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <KpiTile
                icon={<BirdsIcon fontSize="small" />}
                label="Birds sold"
                value={count(day.birdsSold)}
                sub={`${count(day.tripCount)} trips · ${count(day.customerCount)} customers`}
                delta={deltas.birdsSold}
                tone="info.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <KpiTile
                icon={<ScaleIcon fontSize="small" />}
                label="Weight sold"
                value={`${weight(day.weightSold)} kg`}
                sub={day.birdsSold > 0 ? `${(day.weightSold / day.birdsSold).toFixed(2)} kg per bird` : 'No birds sold'}
                delta={deltas.weightSold}
                tone="secondary.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <KpiTile
                icon={<RateIcon fontSize="small" />}
                label="Rate realised"
                value={`${rate(day.averageRate)}/kg`}
                sub={`Mortality ${count(day.mortality)} · to farm ${count(day.returnToFarm)}`}
                delta={deltas.averageRate}
                tone="warning.dark"
              />
            </Grid>
          </Grid>

          {/* The invariant, for the selected day */}
          <Paper elevation={1} sx={{ mt: 2, p: 1.75 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 4 }, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                  Bird movement · {shortDate(overview.asOfDate)}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Loaded must equal sold plus mortality plus returns
                </Typography>
              </Box>

              {[
                { label: 'Loaded', value: count(day.birdsLoaded), tone: 'text.primary' },
                { label: 'Sold', value: count(day.birdsSold), tone: 'primary.main' },
                { label: 'Mortality', value: count(day.mortality), tone: 'error.main' },
                { label: 'Returned to farm', value: count(day.returnToFarm), tone: 'warning.dark' }
              ].map((item, index) => (
                <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 4 } }}>
                  {index > 0 && (
                    <Typography variant="h6" color="text.disabled" sx={{ fontWeight: 300 }}>
                      {index === 1 ? '=' : '+'}
                    </Typography>
                  )}
                  <Box sx={{ textAlign: 'center', minWidth: 68 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: item.tone, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                      {item.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                  </Box>
                </Box>
              ))}

              <Box sx={{ ml: 'auto', textAlign: 'right' }}>
                {dayTally === null ? (
                  <Typography variant="body2" color="text.secondary">No trip recorded for this day</Typography>
                ) : dayTally === 0 ? (
                  <Chip color="success" label="Tallies exactly" />
                ) : (
                  <>
                    <Chip
                      color="error"
                      label={`${dayTally > 0 ? '+' : ''}${count(dayTally)} birds unaccounted for`}
                    />
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      {dayTally > 0 ? 'Loaded more than the trip accounts for' : 'Accounted for more than were loaded'}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          </Paper>

          {/* Day by day, with the bird tally */}
          <Card elevation={2} sx={{ mt: 2 }}>
            <CardContent>
              <PanelHeading
                title="Day by day, last 14 days"
                note={`${count(trend.tradingDays)} trading days of ${count(trend.calendarDays)} · ${compactMoney(trend.total)} billed · ${compactMoney(trend.collected)} collected · average ${money(trend.averagePerTradingDay)} per trading day`}
                action={trend.tally && (
                  <Chip
                    size="small"
                    color={trend.tally.daysNotTallying === 0 ? 'success' : 'error'}
                    variant={trend.tally.daysNotTallying === 0 ? 'filled' : 'outlined'}
                    label={
                      trend.tally.daysNotTallying === 0
                        ? 'Every day tallies'
                        : `${trend.tally.daysNotTallying} of ${trend.tally.daysWithTrips} days do not tally`
                    }
                  />
                )}
              />

              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>Trips</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>Loaded</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>Sold</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>Mortality</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>To farm</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>Tally</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>Weight (kg)</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>Rate/kg</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>Billed</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>Collected</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {overview.dailyTrend.map((point) => {
                      const isSelected = point.date === overview.asOfDate;
                      const hasTrips = point.birdsLoaded > 0 || point.tripCount > 0;
                      return (
                        <TableRow
                          key={point.date}
                          hover
                          sx={{
                            bgcolor: isSelected ? 'action.selected' : undefined,
                            opacity: point.traded ? 1 : 0.55
                          }}
                        >
                          <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: isSelected ? 700 : 500 }}>
                            {point.label}
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                              {point.weekday}
                            </Typography>
                          </TableCell>

                          {point.traded ? (
                            <>
                              <TableCell sx={numeric}>{count(point.tripCount)}</TableCell>
                              <TableCell sx={numeric}>{count(point.birdsLoaded)}</TableCell>
                              <TableCell sx={{ ...numeric, fontWeight: 600 }}>{count(point.birdsSold)}</TableCell>
                              <TableCell sx={{ ...numeric, color: point.mortality > 0 ? 'error.main' : 'text.disabled' }}>
                                {point.mortality > 0 ? count(point.mortality) : '—'}
                              </TableCell>
                              <TableCell sx={{ ...numeric, color: point.returnToFarm > 0 ? 'warning.dark' : 'text.disabled' }}>
                                {point.returnToFarm > 0 ? count(point.returnToFarm) : '—'}
                              </TableCell>
                              <TableCell sx={numeric}>
                                {!hasTrips ? (
                                  <Typography variant="caption" color="text.disabled">no trip</Typography>
                                ) : point.tallies ? (
                                  <Chip
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                    label="tallies"
                                    sx={{ height: 19, '& .MuiChip-label': { px: 0.7, fontSize: 10.5 } }}
                                  />
                                ) : (
                                  <Tooltip title={`Loaded minus sold, mortality and returns leaves ${point.birdTally} bird(s) unaccounted for`}>
                                    <Chip
                                      size="small"
                                      color="error"
                                      label={point.birdTally > 0 ? `+${point.birdTally}` : `${point.birdTally}`}
                                      sx={{ height: 19, '& .MuiChip-label': { px: 0.7, fontSize: 10.5, fontWeight: 700 } }}
                                    />
                                  </Tooltip>
                                )}
                              </TableCell>
                              <TableCell sx={numeric}>{weight(point.weight)}</TableCell>
                              <TableCell sx={numeric}>
                                {point.weight > 0 ? rate(point.amount / point.weight) : '—'}
                              </TableCell>
                              <TableCell sx={{ ...numeric, fontWeight: 600 }}>{money(point.amount)}</TableCell>
                              <TableCell sx={{ ...numeric, color: 'success.main' }}>{money(point.received)}</TableCell>
                            </>
                          ) : (
                            <TableCell colSpan={10} sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                              No trading recorded
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}

                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>14-day total</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>{count(trend.tally.tripCount)}</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>{count(trend.tally.birdsLoaded)}</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>{count(trend.tally.birdsSold)}</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700, color: 'error.main' }}>{count(trend.tally.mortality)}</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700, color: 'warning.dark' }}>{count(trend.tally.returnToFarm)}</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700, color: trend.tally.total === 0 ? 'success.main' : 'error.main' }}>
                        {trend.tally.total === 0 ? '0' : (trend.tally.total > 0 ? `+${trend.tally.total}` : trend.tally.total)}
                      </TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>{weight(trend.tally.weight)}</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>
                        {trend.tally.weight > 0 ? rate(trend.total / trend.tally.weight) : '—'}
                      </TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>{money(trend.total)}</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700, color: 'success.main' }}>{money(trend.collected)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Tally is birds loaded minus birds sold, mortality and returns to farm, taken from the trip
                record. It must come to zero; anything else is birds the day cannot account for.
              </Typography>
            </CardContent>
          </Card>

          {/* Period summary: day, month, year, sales and purchases side by side */}
          <Card elevation={2} sx={{ mt: 2 }}>
            <CardContent>
              <PanelHeading
                title="Sales and purchases in full"
                note="Every figure recorded for the selected day, the month so far and the year so far"
              />
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Figure</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>Selected day</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>Month to date</TableCell>
                      <TableCell sx={{ ...numeric, fontWeight: 700 }}>Year to date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      ['Trips', (w) => count(w.tripCount)],
                      ['Sale transactions', (w) => count(w.saleCount)],
                      ['Customers served', (w) => count(w.customerCount)],
                      ['Birds loaded', (w) => count(w.birdsLoaded)],
                      ['Birds sold', (w) => count(w.birdsSold)],
                      ['Mortality', (w) => count(w.mortality)],
                      ['Returned to farm (stock)', (w) => count(w.returnToFarm)],
                      ['Weight sold (kg)', (w) => weight(w.weightSold)],
                      ['Rate realised (per kg)', (w) => rate(w.averageRate)],
                      ['Billed', (w) => money(w.amount)],
                      ['Collected', (w) => money(w.received)],
                      ['Collected as share of billed', (w) => percent(w.recoveryPercent)],
                      ['Billed not collected', (w) => money(w.pending)]
                    ].map(([label, read]) => (
                      <TableRow key={label} hover>
                        <TableCell>{label}</TableCell>
                        <TableCell sx={numeric}>{read(day)}</TableCell>
                        <TableCell sx={numeric}>{read(mtd)}</TableCell>
                        <TableCell sx={numeric}>{read(ytd)}</TableCell>
                      </TableRow>
                    ))}

                    <TableRow>
                      <TableCell colSpan={4} sx={{ bgcolor: 'action.hover', fontWeight: 700, py: 0.75 }}>
                        Purchases
                      </TableCell>
                    </TableRow>
                    {[
                      ['Purchases recorded', (p) => count(p.purchaseCount)],
                      ['Birds bought', (p) => count(p.birdsBought)],
                      ['Weight bought (kg)', (p) => weight(p.weightBought)],
                      ['Cost per kg', (p) => rate(p.averageRate)],
                      ['Purchase value', (p) => money(p.amount)],
                      ['Paid to suppliers', (p) => money(p.paid)],
                      ['Owed to suppliers', (p) => money(p.owed)],
                      ['Trip expenses (diesel, driver, hamali)', (p) => money(p.expenses)]
                    ].map(([label, read]) => (
                      <TableRow key={label} hover>
                        <TableCell>{label}</TableCell>
                        <TableCell sx={{ ...numeric, color: 'text.disabled' }}>—</TableCell>
                        <TableCell sx={numeric}>{read(overview.purchaseMonthToDate)}</TableCell>
                        <TableCell sx={numeric}>{read(overview.purchaseYearToDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Purchases are recorded per delivery rather than per day, so a single day rarely has one.
                Birds loaded, mortality and returns come from the trip record; everything else from the sale rows.
              </Typography>
            </CardContent>
          </Card>

          {/* Route-wise and receivables */}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} lg={8}>
              <Card elevation={2} sx={{ height: '100%' }}>
                <CardContent>
                  <PanelHeading
                    title="Route by route"
                    note={routeWindow === 'day'
                      ? `Trading on ${shortDate(overview.asOfDate)}`
                      : `Month to date, ${routes.length} routes trading`}
                    action={
                      <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={routeWindow}
                        onChange={(event, value) => value && setRouteWindow(value)}
                      >
                        <ToggleButton value="day">Selected day</ToggleButton>
                        <ToggleButton value="month">Month to date</ToggleButton>
                      </ToggleButtonGroup>
                    }
                  />

                  {routes.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <TripIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                      <Typography variant="body2" color="text.secondary">
                        No route traded on this date.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Route</TableCell>
                            <TableCell sx={{ ...numeric, fontWeight: 700 }}>Trips</TableCell>
                            <TableCell sx={{ ...numeric, fontWeight: 700 }}>Customers</TableCell>
                            <TableCell sx={{ ...numeric, fontWeight: 700 }}>Birds</TableCell>
                            <TableCell sx={{ ...numeric, fontWeight: 700 }}>Weight (kg)</TableCell>
                            <TableCell sx={{ ...numeric, fontWeight: 700 }}>Rate/kg</TableCell>
                            <TableCell sx={{ ...numeric, fontWeight: 700 }}>Billed</TableCell>
                            <TableCell sx={{ fontWeight: 700, minWidth: 110 }}>Share</TableCell>
                            <TableCell sx={{ ...numeric, fontWeight: 700 }}>Collected</TableCell>
                            <TableCell sx={{ ...numeric, fontWeight: 700 }}>Outstanding</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {routes.map((route) => (
                            <TableRow key={route.routeId} hover>
                              <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{route.routeName}</TableCell>
                              <TableCell sx={numeric}>{count(route.tripCount)}</TableCell>
                              <TableCell sx={numeric}>{count(route.customerCount)}</TableCell>
                              <TableCell sx={numeric}>{count(route.birds)}</TableCell>
                              <TableCell sx={numeric}>{weight(route.weight)}</TableCell>
                              <TableCell sx={numeric}>{rate(route.averageRate)}</TableCell>
                              <TableCell sx={{ ...numeric, fontWeight: 600 }}>{money(route.amount)}</TableCell>
                              <TableCell><ShareBar value={route.sharePercent} /></TableCell>
                              <TableCell sx={{ ...numeric, color: 'success.main' }}>{money(route.received)}</TableCell>
                              <TableCell sx={{ ...numeric, color: 'error.main', fontWeight: 600 }}>
                                {compactMoney(route.outstanding)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  )}

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Outstanding is the ledger balance of the customers who traded on that route, so a customer
                    served by two routes counts in both. It shows exposure by route, not a split of the total.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Card elevation={2} sx={{ height: '100%' }}>
                <CardContent>
                  <PanelHeading title="Money owed to you" note="Across every customer, as it stands now" />

                  <Box sx={{ p: 1.5, mb: 1.5, borderRadius: 1, bgcolor: 'error.main', color: 'common.white' }}>
                    <Typography variant="caption" sx={{ opacity: 0.85, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Total outstanding
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {compactMoney(overview.receivables.totalOutstanding)}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      {count(overview.receivables.customersWithBalance)} customers owe · {money(overview.receivables.totalOutstanding)}
                    </Typography>
                  </Box>

                  <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                    <Line
                      label={`Over ₹50,000 (${count(overview.receivables.countOver50k)} customers)`}
                      value={compactMoney(overview.receivables.amountOver50k)}
                      tone="error.main"
                    />
                    <Line
                      label={`Over ₹20,000 (${count(overview.receivables.countOver20k)} customers)`}
                      value={compactMoney(overview.receivables.amountOver20k)}
                      tone="warning.dark"
                    />
                    <Line
                      label={`No payment in 30+ days (${count(overview.receivables.countStale30Days)})`}
                      value={compactMoney(overview.receivables.amountStale30Days)}
                      tone="error.main"
                    />
                    <Line
                      label={`Over credit limit (${count(overview.receivables.countOverCreditLimit)})`}
                      value={compactMoney(overview.receivables.amountOverCreditLimit)}
                    />
                    <Line
                      label={`Customers in credit (${count(overview.receivables.customersInCredit)})`}
                      value="advance held"
                    />
                  </Stack>

                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    LARGEST BALANCES
                  </Typography>

                  <Stack spacing={0.75} sx={{ mt: 1 }}>
                    {overview.receivables.topDebtors.map((debtor) => (
                      <Box
                        key={debtor.customerId}
                        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.25 }} noWrap>
                            {debtor.customerName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {[debtor.shopName, debtor.cityName].filter(Boolean).join(' · ') || 'No shop recorded'}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {compactMoney(debtor.balance)}
                          </Typography>
                          <Chip
                            size="small"
                            variant="outlined"
                            color={
                              debtor.daysSinceLastPayment === null || debtor.daysSinceLastPayment === undefined
                                ? 'error'
                                : debtor.daysSinceLastPayment >= 30 ? 'warning' : 'success'
                            }
                            label={
                              debtor.daysSinceLastPayment === null || debtor.daysSinceLastPayment === undefined
                                ? 'never paid'
                                : `paid ${debtor.daysSinceLastPayment}d ago`
                            }
                            sx={{ height: 18, '& .MuiChip-label': { px: 0.6, fontSize: 10.5 } }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Purchase side */}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} lg={7}>
              <Card elevation={2} sx={{ height: '100%' }}>
                <CardContent>
                  <PanelHeading
                    title="Purchases this year, by supplier"
                    note={`${count(overview.purchaseYearToDate.purchaseCount)} deliveries · ${money(overview.purchaseYearToDate.amount)} bought · ${money(overview.purchaseYearToDate.owed)} still owed`}
                  />
                  {overview.suppliersYearToDate.length === 0 ? (
                    <Alert severity="warning" variant="outlined">
                      No purchases are recorded for this year. Without them, cost per kilo and margin
                      cannot be calculated anywhere in the system.
                    </Alert>
                  ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Supplier</TableCell>
                            <TableCell sx={{ ...numeric, fontWeight: 700 }}>Deliveries</TableCell>
                            <TableCell sx={{ ...numeric, fontWeight: 700 }}>Birds</TableCell>
                            <TableCell sx={{ ...numeric, fontWeight: 700 }}>Weight (kg)</TableCell>
                            <TableCell sx={{ ...numeric, fontWeight: 700 }}>Cost/kg</TableCell>
                            <TableCell sx={{ ...numeric, fontWeight: 700 }}>Value</TableCell>
                            <TableCell sx={{ ...numeric, fontWeight: 700 }}>Paid</TableCell>
                            <TableCell sx={{ ...numeric, fontWeight: 700 }}>Owed</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Last</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {overview.suppliersYearToDate.map((supplier) => (
                            <TableRow key={supplier.supplierId} hover>
                              <TableCell sx={{ fontWeight: 600 }}>{supplier.supplierName}</TableCell>
                              <TableCell sx={numeric}>{count(supplier.purchaseCount)}</TableCell>
                              <TableCell sx={numeric}>{count(supplier.birds)}</TableCell>
                              <TableCell sx={numeric}>{weight(supplier.weight)}</TableCell>
                              <TableCell sx={numeric}>{rate(supplier.averageRate)}</TableCell>
                              <TableCell sx={{ ...numeric, fontWeight: 600 }}>{money(supplier.amount)}</TableCell>
                              <TableCell sx={{ ...numeric, color: 'success.main' }}>{money(supplier.paid)}</TableCell>
                              <TableCell sx={{ ...numeric, color: 'error.main', fontWeight: 600 }}>
                                {money(supplier.owed)}
                              </TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{shortDate(supplier.lastPurchaseDate)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={5}>
              <Card elevation={2} sx={{ height: '100%' }}>
                <CardContent>
                  <PanelHeading title="Bought against sold" note="This year, per kilogram" />

                  {overview.marginYearToDate.comparable ? (
                    <>
                      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                        <Grid item xs={4}>
                          <Paper variant="outlined" sx={{ p: 1.25, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" display="block">Bought at</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              {rate(overview.marginYearToDate.buyRatePerKg)}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={4}>
                          <Paper variant="outlined" sx={{ p: 1.25, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" display="block">Sold at</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              {rate(overview.marginYearToDate.sellRatePerKg)}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={4}>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 1.25,
                              textAlign: 'center',
                              borderColor: Number(overview.marginYearToDate.marginPerKg) >= 0 ? 'success.main' : 'error.main'
                            }}
                          >
                            <Typography variant="caption" color="text.secondary" display="block">Margin</Typography>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                color: Number(overview.marginYearToDate.marginPerKg) >= 0 ? 'success.main' : 'error.main'
                              }}
                            >
                              {rate(overview.marginYearToDate.marginPerKg)}
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                      {overview.marginYearToDate.note && (
                        <Alert severity="warning" variant="outlined" sx={{ mb: 1 }}>
                          {overview.marginYearToDate.note}
                        </Alert>
                      )}
                      <Line label="Weight bought but not sold" value={`${weight(overview.marginYearToDate.weightLoss)} kg`} />
                    </>
                  ) : (
                    <Alert severity="warning" variant="outlined">
                      <AlertTitle sx={{ fontSize: 14 }}>Cannot be measured yet</AlertTitle>
                      {overview.marginYearToDate.note}
                    </Alert>
                  )}

                  <Divider sx={{ my: 1.5 }} />
                  <Stack spacing={0.75}>
                    <Line label="Weight sold this year" value={`${weight(ytd.weightSold)} kg`} />
                    <Line label="Weight bought this year" value={`${weight(overview.purchaseYearToDate.weightBought)} kg`} />
                    <Line label="Birds sold" value={count(ytd.birdsSold)} />
                    <Line label="Birds bought" value={count(overview.purchaseYearToDate.birdsBought)} />
                    <Line label="Mortality" value={`${count(ytd.mortality)} birds`} tone="error.main" />
                    <Line label="Returned to farm" value={`${count(ytd.returnToFarm)} birds`} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Exceptions */}
          <Card elevation={2} sx={{ mt: 2, mb: 2 }}>
            <CardContent>
              <PanelHeading
                title="Needs attention"
                note="Conditions in the recorded data that distort the figures above"
              />
              {overview.exceptions.notes.length === 0 ? (
                <Alert severity="success" variant="outlined">
                  Nothing outstanding: bird counts tally, no future-dated sales, every purchase part-paid.
                </Alert>
              ) : (
                <Grid container spacing={1.5}>
                  {overview.exceptions.notes.map((note) => (
                    <Grid item xs={12} md={6} key={note}>
                      <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                        <AlertIcon color="warning" fontSize="small" sx={{ mt: 0.25 }} />
                        <Typography variant="body2">{note}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Container>
  );
};

export default Dashboard;
