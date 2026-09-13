import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  PictureAsPdf as StatementIcon,
  PlayArrow as BuildIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import MessageTable from './MessageTable';
import {
  getStatementRuns, getMessages, buildStatements, sendQueuedStatements, resendMessage,
} from '../service/MessagingService';
import {
  statementSegments, runHeadline, runTone, weekLabel, statusLabel,
} from './messagingFormat';

/**
 * The weekly statement runs.
 *
 * Its own tab rather than a filter on the WhatsApp log, because a statement is a different
 * kind of thing and fails for different reasons. The daily message is one line of text and
 * either goes or does not; a statement is a rendered PDF, uploaded to the provider and
 * sent as a media template, so it can fail at three separate points - and it is the one
 * message that carries a customer's full account. Mixed into 200 daily rows, a week's
 * worth of statement failures is invisible.
 *
 * The unit here is the week, not the message. "Did last week's statements go out" is the
 * question this screen exists to answer, and it is answered by one line per run, with the
 * messages underneath for the week somebody is actually chasing.
 */

/** Which rows the list shows, and what each chip means. */
const VIEWS = {
  ALL: { label: 'Everything', status: 'ALL' },
  FAILED: { label: 'Failed', status: 'FAILED' },
  SENT: { label: 'Sent', status: 'SENT' },
  DELIVERED: { label: 'Delivered', status: 'DELIVERED' },
  PENDING: { label: 'Queued', status: 'PENDING' },
  SKIPPED: { label: 'Not sent', status: 'SKIPPED' },
};

const StatementPanel = ({ config, reachability, templates, onChanged }) => {
  const [runs, setRuns] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [week, setWeek] = useState(null);
  const [view, setView] = useState('ALL');
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [busy, setBusy] = useState('');
  const [resendingId, setResendingId] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const loadRuns = useCallback(async () => {
    setLoadingRuns(true);
    try {
      const rows = await getStatementRuns();
      setRuns(rows);
      // Newest week selected by default - the one being asked about is almost always the
      // last one. Kept if it still exists, so a refresh does not move the selection out
      // from under somebody reading a failure list.
      setWeek((current) => {
        if (current && rows.some((row) => row.weekEnding === current)) return current;
        return rows.length > 0 ? rows[0].weekEnding : null;
      });
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingRuns(false);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!week) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    try {
      // from and to are the same day: reference_date on a statement is the week it
      // covers, so one date is one run.
      setMessages(await getMessages({
        type: 'WEEKLY_STATEMENT',
        status: VIEWS[view].status,
        from: week,
        to: week,
        limit: 500,
      }));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMessages(false);
    }
  }, [week, view]);

  useEffect(() => { loadRuns(); }, [loadRuns]);
  useEffect(() => { loadMessages(); }, [loadMessages]);

  const selected = useMemo(
    () => runs.find((run) => run.weekEnding === week) || null,
    [runs, week]
  );

  const statementTemplate = useMemo(
    () => (templates || []).find((template) => template.templateName === 'weekly_statement') || null,
    [templates]
  );

  const refreshAll = async () => {
    await Promise.all([loadRuns(), loadMessages()]);
    if (onChanged) onChanged();
  };

  const handleBuild = async () => {
    setBusy('build');
    setNote('');
    try {
      const result = await buildStatements();
      setNote(result.queued === 0 && result.skipped === 0
        ? `Nothing to build for ${weekLabel(result.from, result.to)} — no customer traded that week.`
        : `${weekLabel(result.from, result.to)}: ${result.queued} queued, ${result.skipped} not sendable, `
          + `${result.nothingToReport} had no transactions.`);
      await refreshAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const handleSend = async () => {
    setBusy('send');
    setNote('');
    try {
      const { accepted } = await sendQueuedStatements();
      setNote(accepted === 0
        ? 'Nothing was sent. The reasons are above.'
        : `${accepted} statement${accepted === 1 ? '' : 's'} accepted by the provider.`);
      await refreshAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  /*
   * The resend is the generic one: it queues a new row and, for a statement, re-renders
   * the PDF, uploads it and sends it. The old failure stays on record, which is why the
   * list can grow by one after a resend rather than a row changing in place.
   */
  const handleResend = async (message) => {
    setResendingId(message.id);
    setNote('');
    try {
      const retry = await resendMessage(message.id);
      setNote(retryNote(retry));
      await refreshAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setResendingId(null);
    }
  };

  const failedCount = selected?.failed || 0;

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Weekly statements
          </Typography>
          <Typography variant="body2" color="text.secondary">
            A statement of account, as a PDF, for every customer who traded that week.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Tooltip title="Build last week's statements now instead of waiting for Monday">
            <Button
              size="small"
              variant="outlined"
              startIcon={busy === 'build' ? <CircularProgress size={14} /> : <BuildIcon />}
              disabled={Boolean(busy)}
              onClick={handleBuild}
            >
              Build last week
            </Button>
          </Tooltip>
          <Tooltip title="Send the statements that are queued">
            <Button
              size="small"
              variant="outlined"
              startIcon={busy === 'send' ? <CircularProgress size={14} /> : <SendIcon />}
              disabled={Boolean(busy)}
              onClick={handleSend}
            >
              Send queued
            </Button>
          </Tooltip>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {note && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setNote('')}>{note}</Alert>}

      <Blockers
        config={config}
        reachability={reachability}
        template={statementTemplate}
      />

      {loadingRuns && runs.length === 0 && <LinearProgress sx={{ my: 2 }} />}

      {!loadingRuns && runs.length === 0 && (
        <Alert severity="info" icon={<StatementIcon />} sx={{ mb: 2 }}>
          <AlertTitle>No statements have been built yet</AlertTitle>
          The run happens at 06:30 on Monday for the week that has just closed. Use
          <strong> Build last week </strong>
          to produce them now — with sending switched off they are queued and readable
          without anything reaching a customer.
        </Alert>
      )}

      {selected && <StatusBar run={selected} />}

      {runs.length > 0 && (
        <RunTable runs={runs} selected={week} onSelect={setWeek} />
      )}

      {selected && (
        <>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 3, mb: 1.5 }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
              {weekLabel(selected.weekStarting, selected.weekEnding)}
            </Typography>
            {Object.entries(VIEWS).map(([key, option]) => (
              <Chip
                key={key}
                size="small"
                label={key === 'FAILED' && failedCount > 0
                  ? `${option.label} (${failedCount})`
                  : option.label}
                color={key === view ? 'primary' : 'default'}
                variant={key === view ? 'filled' : 'outlined'}
                onClick={() => setView(key)}
              />
            ))}
          </Stack>

          {view === 'FAILED' && failedCount > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Resending re-renders the statement from the ledger as it stands now, so a
              figure corrected since the first attempt is corrected on the new PDF. The
              failed attempt stays on record.
            </Alert>
          )}

          <MessageTable
            messages={messages}
            loading={loadingMessages}
            onResend={handleResend}
            resendingId={resendingId}
          />
        </>
      )}
    </Box>
  );
};

/** What the row's resulting status actually means, in one sentence. */
export const retryNote = (retry) => {
  if (!retry) return 'Resent.';
  const who = retry.recipientName || retry.recipientMobile || 'the customer';
  switch (retry.status) {
    case 'FAILED':
      return `It failed again for ${who}: ${retry.error || 'no reason given'}`;
    case 'SKIPPED':
      return `Not sent to ${who}: ${retry.skipReason || 'no reason recorded'}`;
    case 'PENDING':
      return `Queued for ${who}, but not sent — see the reasons above.`;
    default:
      return `Sent again to ${who}. Awaiting a delivery report.`;
  }
};

/**
 * Why statements are not going out, when they are not.
 *
 * Three separate conditions, each with its own fix, and all three are true today. Stated
 * as a standing banner rather than a toast on the send button because none of them is
 * about the button being pressed - somebody pressing Send and getting "0 accepted" with no
 * explanation would reasonably conclude the feature is broken.
 */
const Blockers = ({ config, reachability, template }) => {
  const reasons = [];

  if (config && !config.providerConfigured) {
    reasons.push('No Fast2SMS API key is set, so nothing can be sent at all.');
  }
  if (config && config.providerConfigured && !config.enabled) {
    reasons.push('Sending is switched off (messaging.enabled), so statements are built and queued but not sent.');
  }
  if (template && !template.approved) {
    reasons.push(`The weekly_statement template is ${template.status || 'not approved'} with Meta. `
      + 'A media template must be approved before a PDF can be sent.');
  }
  if (!template) {
    reasons.push('The weekly_statement template was not found on the Fast2SMS account.');
  }
  if (reachability && reachability.whatsappOptedIn === 0) {
    reasons.push('No customer has opted in to WhatsApp. A statement lists every transaction '
      + 'and the balance, so it is only sent to a number a customer has confirmed.');
  }

  if (reasons.length === 0) return null;

  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      <AlertTitle>
        {reasons.length === 1
          ? 'One thing is stopping statements going out'
          : `${reasons.length} things are stopping statements going out`}
      </AlertTitle>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {reasons.map((reason) => <li key={reason}>{reason}</li>)}
      </Box>
    </Alert>
  );
};

/**
 * The status bar for one run.
 *
 * A single proportional bar rather than five tiles, because the useful fact is the shape:
 * a run that is almost all grey is a consent problem, almost all red is a provider
 * problem, and the two need different people. The counts sit under it for whoever has to
 * act on them.
 */
const StatusBar = ({ run }) => {
  const segments = statementSegments(run);
  const tone = runTone(run);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'baseline' }}
        spacing={0.5}
        sx={{ mb: 1.5 }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Week of {weekLabel(run.weekStarting, run.weekEnding)}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: tone === 'default' ? 'text.secondary' : `${tone}.main` }}
        >
          {runHeadline(run)}
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'flex',
          height: 14,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: 'grey.100',
        }}
        role="img"
        aria-label={runHeadline(run)}
      >
        {segments.map((segment) => (
          <Tooltip key={segment.key} title={`${segment.label}: ${segment.count}`}>
            <Box sx={{ width: `${segment.percent}%`, bgcolor: segment.color }} />
          </Tooltip>
        ))}
      </Box>

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
        {segments.map((segment) => (
          <Stack key={segment.key} direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: segment.color }} />
            <Typography variant="caption" color="text.secondary">
              {segment.label}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {segment.count}
            </Typography>
          </Stack>
        ))}
        {run.deliveryRate !== null && run.deliveryRate !== undefined && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {run.deliveryRate}% of judged statements delivered
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};

/** Every run, so a week the job silently stopped running shows as a gap in the list. */
const RunTable = ({ runs, selected, onSelect }) => (
  <TableContainer sx={{ overflowX: 'auto' }}>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Week</TableCell>
          <TableCell align="right">Statements</TableCell>
          <TableCell align="right">{statusLabel('DELIVERED')}</TableCell>
          <TableCell align="right">{statusLabel('SENT')}</TableCell>
          <TableCell align="right">{statusLabel('PENDING')}</TableCell>
          <TableCell align="right">{statusLabel('FAILED')}</TableCell>
          <TableCell align="right">Not sent</TableCell>
          <TableCell align="right">Delivered</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {runs.map((run) => {
          const isSelected = run.weekEnding === selected;
          return (
            <TableRow
              key={run.weekEnding || 'no-period'}
              hover
              selected={isSelected}
              onClick={() => onSelect(run.weekEnding)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell sx={{ fontWeight: isSelected ? 600 : 400, whiteSpace: 'nowrap' }}>
                {weekLabel(run.weekStarting, run.weekEnding)}
              </TableCell>
              <Numeric value={run.total} />
              <Numeric value={(run.delivered || 0) + (run.read || 0)} tone="success.main" />
              <Numeric value={run.sent} tone="warning.main" />
              <Numeric value={run.queued} />
              <Numeric value={run.failed} tone="error.main" />
              <Numeric value={(run.skipped || 0) + (run.cancelled || 0)} />
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {run.deliveryRate === null || run.deliveryRate === undefined
                  ? '—'
                  : `${run.deliveryRate}%`}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </TableContainer>
);

/** A zero is shown as a dash: on a row of counts, 0 and "none" read the same and the
 *  dash keeps the eye on the figures that are not zero. */
const Numeric = ({ value, tone }) => (
  <TableCell
    align="right"
    sx={{ fontVariantNumeric: 'tabular-nums', color: value > 0 && tone ? tone : undefined }}
  >
    {value > 0 ? value : '—'}
  </TableCell>
);

export default StatementPanel;
