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
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Contacts as ContactsIcon,
  DoneAll as DeliveredIcon,
  ErrorOutline as FailedIcon,
  HowToReg as ConsentIcon,
  PictureAsPdf as StatementIcon,
  Send as SendIcon,
  Sms as SmsIcon,
  Description as TemplateIcon,
  SyncAlt as SyncIcon,
  Refresh as RefreshIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import ContactQuality from '../masterData/ContactQuality';
import MessageTable from './MessageTable';
import CustomSendPanel from './CustomSendPanel';
import StatementPanel from './StatementPanel';
import TemplatePanel from './TemplatePanel';
import WhatsappConsent from './WhatsappConsent';
import {
  getStats, getMessages, resendMessage, syncDeliveryStatus, dispatchNow, getTemplates,
} from '../service/MessagingService';
import { STATUS_FILTERS, statusLabel, compactMoney } from './messagingFormat';

/**
 * Messaging.
 *
 * One screen for everything that leaves the building: what went out, what arrived,
 * what failed and can be sent again, and a way to send one message by hand.
 *
 * The WhatsApp and SMS tabs are separate because the two channels fail separately.
 * WhatsApp needs an approved template and a customer who has opted in; SMS needs a DLT
 * template and nothing else. A single combined list would show a healthy delivery rate
 * while WhatsApp was reaching nobody at all - which, today, is the actual situation:
 * no customer has opted in, so every WhatsApp row skips.
 *
 * Contacts lives here rather than under Master Data because it is the same job. The
 * reason messages do not arrive is almost never the messaging - it is 118 customers
 * with no number and 12 with something that is not one.
 */

const TABS = ['WHATSAPP', 'CONSENT', 'SMS', 'STATEMENTS', 'SEND', 'TEMPLATES', 'CONTACTS'];

const MessagingDashboard = () => {
  const [tab, setTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [status, setStatus] = useState('ALL');
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState('');
  const [resendingId, setResendingId] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const channel = TABS[tab];
  const isLog = channel === 'WHATSAPP' || channel === 'SMS';

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      setStats(await getStats(days));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingStats(false);
    }
  }, [days]);

  const loadMessages = useCallback(async () => {
    if (!isLog) return;
    setLoadingMessages(true);
    try {
      const from = new Date();
      from.setDate(from.getDate() - days);
      setMessages(await getMessages({
        channel,
        status,
        from: from.toISOString().slice(0, 10),
        limit: 200,
      }));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMessages(false);
    }
  }, [channel, status, days, isLog]);

  const loadTemplates = useCallback(async (refresh = false) => {
    setLoadingTemplates(true);
    try {
      setTemplates(await getTemplates(refresh));
    } catch (e) {
      // Not fatal: the log still reads without the provider being reachable, and the
      // send tab says so itself.
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const run = async (label, action) => {
    setBusy(label);
    try {
      const result = await action();
      setToast(result);
      await Promise.all([loadStats(), loadMessages()]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const handleSync = () => run('sync', async () => {
    const { updated } = await syncDeliveryStatus();
    return updated === 0
      ? 'No new delivery reports. Fast2SMS keeps three days of WhatsApp history.'
      : `${updated} message${updated === 1 ? '' : 's'} updated from the provider.`;
  });

  const handleDispatch = () => run('dispatch', async () => {
    const { accepted, stillQueued } = await dispatchNow();
    return `${accepted} accepted by the provider, ${stillQueued} still queued.`;
  });

  const handleResend = async (message) => {
    setResendingId(message.id);
    try {
      const retry = await resendMessage(message.id);
      setToast(retry.status === 'FAILED'
        ? `Resend failed again: ${retry.error}`
        : `Resent to ${retry.recipientName || retry.recipientMobile}.`);
      await Promise.all([loadStats(), loadMessages()]);
    } catch (e) {
      setError(e.message);
    } finally {
      setResendingId(null);
    }
  };

  const channelStats = useMemo(
    () => stats?.channels?.find((row) => row.channel === channel) || null,
    [stats, channel]
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 1 }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Messaging</Typography>
          <Typography variant="body2" color="text.secondary">
            What was sent, what arrived, and what needs sending again.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <TextField
            select
            size="small"
            label="Period"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value={1}>Today</MenuItem>
            <MenuItem value={7}>Last 7 days</MenuItem>
            <MenuItem value={30}>Last 30 days</MenuItem>
            <MenuItem value={90}>Last 90 days</MenuItem>
          </TextField>
          <Tooltip title="Ask Fast2SMS what became of the messages it accepted">
            <Button
              size="small"
              variant="outlined"
              startIcon={busy === 'sync' ? <CircularProgress size={14} /> : <SyncIcon />}
              disabled={Boolean(busy)}
              onClick={handleSync}
            >
              Delivery reports
            </Button>
          </Tooltip>
          <Tooltip title="Send what is queued now, instead of waiting for the two-minute run">
            <Button
              size="small"
              variant="outlined"
              startIcon={busy === 'dispatch' ? <CircularProgress size={14} /> : <SendIcon />}
              disabled={Boolean(busy)}
              onClick={handleDispatch}
            >
              Dispatch queue
            </Button>
          </Tooltip>
          <Tooltip title="Reload">
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => { loadStats(); loadMessages(); }}
            >
              Refresh
            </Button>
          </Tooltip>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <ConfigBanner config={stats?.config} reachability={stats?.reachability} />

      <StatTiles
        stats={stats}
        channel={isLog ? channel : 'ALL'}
        loading={loadingStats}
      />

      <Paper variant="outlined" sx={{ mt: 3 }}>
        <Tabs
          value={tab}
          onChange={(event, next) => setTab(next)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}
        >
          <Tab icon={<WhatsAppIcon fontSize="small" />} iconPosition="start" label="WhatsApp" />
          <Tab icon={<ConsentIcon fontSize="small" />} iconPosition="start" label="Consent" />
          <Tab icon={<SmsIcon fontSize="small" />} iconPosition="start" label="SMS" />
          <Tab icon={<StatementIcon fontSize="small" />} iconPosition="start" label="Statements" />
          <Tab icon={<SendIcon fontSize="small" />} iconPosition="start" label="Send a message" />
          <Tab icon={<TemplateIcon fontSize="small" />} iconPosition="start" label="Templates" />
          <Tab icon={<ContactsIcon fontSize="small" />} iconPosition="start" label="Contacts" />
        </Tabs>

        <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          {isLog && (
            <>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
                sx={{ mb: 2 }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                  Show
                </Typography>
                {STATUS_FILTERS.map((option) => (
                  <Chip
                    key={option}
                    size="small"
                    label={option === 'ALL' ? 'Everything' : statusLabel(option)}
                    color={option === status ? 'primary' : 'default'}
                    variant={option === status ? 'filled' : 'outlined'}
                    onClick={() => setStatus(option)}
                  />
                ))}
                {channelStats && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                    {channelStats.total} {channel === 'SMS' ? 'SMS' : 'WhatsApp'} messages in this period
                  </Typography>
                )}
              </Stack>

              {channel === 'WHATSAPP' && stats?.reachability?.whatsappOptedIn === 0 && (
                <Alert
                  severity="warning"
                  sx={{ mb: 2 }}
                  action={(
                    <Button color="warning" size="small" onClick={() => setTab(TABS.indexOf('CONSENT'))}>
                      Go to Consent
                    </Button>
                  )}
                >
                  <AlertTitle>No customer has opted in to WhatsApp</AlertTitle>
                  Every WhatsApp message is queued and then skipped. A statement carries a
                  balance, so consent is recorded per customer before one is sent —
                  nobody has been opted in yet, which is why this list is mostly skips.
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

          {channel === 'CONSENT' && <WhatsappConsent />}

          {channel === 'STATEMENTS' && (
            <StatementPanel
              config={stats?.config}
              reachability={stats?.reachability}
              templates={templates}
              onChanged={loadStats}
            />
          )}

          {channel === 'SEND' && (
            <CustomSendPanel
              templates={templates}
              loadingTemplates={loadingTemplates}
              onSent={() => { loadStats(); }}
              onRefreshTemplates={() => loadTemplates(true)}
              defaultTemplateId={stats?.config?.templates?.['Daily sale (WhatsApp)']}
            />
          )}

          {channel === 'TEMPLATES' && (
            <TemplatePanel
              templates={templates}
              loading={loadingTemplates}
              onRefresh={() => loadTemplates(true)}
              usage={stats?.config?.templates || {}}
            />
          )}

          {channel === 'CONTACTS' && <ContactQuality embedded />}
        </Box>
      </Paper>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={6000}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  );
};

/**
 * Says plainly when nothing can go out.
 *
 * messaging.enabled off means the queue fills and the dispatcher sends nothing. That is
 * the right default for a system being wired up, but a dashboard that showed a growing
 * queue without saying why would look like a fault.
 */
const ConfigBanner = ({ config, reachability }) => {
  if (!config) return null;

  if (!config.providerConfigured) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <AlertTitle>Fast2SMS is not configured</AlertTitle>
        No API key is set, so nothing can be sent. Set <code>FAST2SMS_API_KEY</code> in
        the backend <code>.env</code>.
      </Alert>
    );
  }

  if (!config.enabled) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        <AlertTitle>Dry run — messages are queued but not sent</AlertTitle>
        Messages are being recorded so the queue can be inspected before anything reaches
        a customer. Set <code>messaging.enabled=true</code> to start sending.
        {reachability && ` ${reachability.reachable} of ${reachability.activeCustomers} customers have a usable number.`}
      </Alert>
    );
  }

  return null;
};

/**
 * The figures above the table.
 *
 * Delivered and failed lead, because they are the two that mean something happened.
 * The delivery rate is deliberately blank rather than 0% until a report has arrived:
 * before the first one, 0% would read as an outage rather than as "not known yet".
 */
const StatTiles = ({ stats, channel, loading }) => {
  const block = useMemo(() => {
    if (!stats) return null;
    if (channel === 'ALL') return stats.total;
    return stats.channels?.find((row) => row.channel === channel) || null;
  }, [stats, channel]);

  if (loading && !stats) {
    return <LinearProgress sx={{ mt: 3 }} />;
  }
  if (!block) return null;

  const reach = stats.reachability;

  return (
    <Grid container spacing={2} sx={{ mt: 2 }}>
      <Tile
        icon={<DeliveredIcon fontSize="small" />}
        label="Delivered"
        value={block.delivered + block.read}
        tone="success"
        note={block.read > 0 ? `${block.read} read` : 'confirmed on the handset'}
      />
      <Tile
        icon={<FailedIcon fontSize="small" />}
        label="Failed"
        value={block.failed}
        tone={block.failed > 0 ? 'error' : 'default'}
        note={block.failed > 0 ? 'resend from the list below' : 'nothing to chase'}
      />
      <Tile
        label="Awaiting confirmation"
        value={block.sent}
        tone="warning"
        note="accepted by the provider"
      />
      <Tile
        label="Queued"
        value={block.queued}
        note="the dispatcher runs every 2 min"
      />
      <Tile
        label="Skipped"
        value={block.skipped}
        note="no number, or no consent"
      />
      <Tile
        label="Delivery rate"
        value={block.deliveryRate === null || block.deliveryRate === undefined
          ? '—'
          : `${block.deliveryRate}%`}
        note={block.deliveryRate === null || block.deliveryRate === undefined
          ? 'no reports yet'
          : 'of messages with a verdict'}
      />
      {reach && (
        <>
          <Tile
            label="Reachable customers"
            value={`${reach.reachable}/${reach.activeCustomers}`}
            tone={reach.unusableNumbers > 0 ? 'warning' : 'default'}
            note={`${reach.unusableNumbers} need a number`}
          />
          <Tile
            label="Unreachable balance"
            value={compactMoney(reach.unreachableBalance)}
            tone={Number(reach.unreachableBalance) > 0 ? 'warning' : 'default'}
            note="owed by customers nobody can message"
          />
        </>
      )}
    </Grid>
  );
};

const TONE_COLOR = {
  success: 'success.main',
  error: 'error.main',
  warning: 'warning.main',
  default: 'text.primary',
};

const Tile = ({ icon, label, value, note, tone = 'default' }) => (
  // Four across on a desktop, two on a phone: eight tiles in two even rows rather
  // than a row of eight that would crush the labels.
  <Grid item xs={6} sm={4} md={3}>
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'text.secondary' }}>
          {icon}
          <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {label}
          </Typography>
        </Stack>
        <Typography
          variant="h5"
          sx={{ fontWeight: 600, mt: 0.5, color: TONE_COLOR[tone], fontVariantNumeric: 'tabular-nums' }}
        >
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

export default MessagingDashboard;
