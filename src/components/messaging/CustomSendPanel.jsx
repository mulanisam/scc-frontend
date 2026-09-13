import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  Send as SendIcon,
  Sms as SmsIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import { sendCustomMessage } from '../service/MessagingService';
import {
  fieldsForTemplate, renderTemplate, prettyMobile, TEMPLATE_PURPOSE,
} from './messagingFormat';
import { formatMobile, isValidMobile } from '../../utils/mobileRules';

/**
 * Sending one message to one number, by hand.
 *
 * The gap this fills: the automatic path messages a customer when their sale is
 * entered, and nothing else. A sale keyed in after the day's dispatch, a customer
 * ringing to ask their balance, a number corrected this morning - all of those need
 * somebody to be able to send a single message now.
 *
 * It is deliberately not a free-text box. WhatsApp will not carry arbitrary text to a
 * customer outside a 24-hour reply window; only approved templates go out. So the form
 * is a template picker with its variables, and the preview shows the approved wording
 * with the typed values in place, which is exactly what the recipient will read.
 */
const CustomSendPanel = ({
  templates, loadingTemplates, onSent, onRefreshTemplates, defaultTemplateId,
}) => {
  const [channel, setChannel] = useState('WHATSAPP');
  const [mobileNo, setMobileNo] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [values, setValues] = useState([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  /*
   * Only approved templates are offered. An unapproved one is not a choice somebody
   * should be able to make and then be told off for - Meta rejects the send outright,
   * so the option should not be there.
   */
  const sendable = useMemo(
    () => (templates || []).filter((template) => template.approved),
    [templates]
  );

  const selected = useMemo(
    () => sendable.find((template) => String(template.messageId) === String(templateId)) || null,
    [sendable, templateId]
  );

  const fields = useMemo(() => fieldsForTemplate(selected), [selected]);

  /*
   * Default to whatever the application itself sends for the daily message.
   *
   * Not the template with the most variables, which was the first instinct and is
   * wrong: that is daily_sale_summary, the one that carries the per-kilo rate the owner
   * does not want customers to see. The default should be the wording already going out
   * automatically, so a message typed here matches the ones sent for it.
   */
  useEffect(() => {
    if (templateId || sendable.length === 0) return;
    const preferred = sendable.find(
      (template) => String(template.messageId) === String(defaultTemplateId)
    );
    setTemplateId(String((preferred || sendable[0]).messageId));
  }, [sendable, templateId, defaultTemplateId]);

  // Resize the value list when the template changes, keeping what was typed where the
  // positions still line up.
  useEffect(() => {
    setValues((current) => Array.from({ length: fields.length }, (unused, i) => current[i] || ''));
  }, [fields.length]);

  const preview = useMemo(
    () => renderTemplate(selected?.bodyText, values),
    [selected, values]
  );

  const missing = values.some((value) => !String(value || '').trim());
  const numberOk = isValidMobile(mobileNo);
  const canSend = !sending && numberOk && selected && !missing;

  const setValue = (index, value) => {
    setValues((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const handleSend = async () => {
    setSending(true);
    setError('');
    setResult(null);
    try {
      const sent = await sendCustomMessage({
        mobileNo,
        recipientName,
        channel,
        templateId: selected ? String(selected.messageId) : undefined,
        values,
      });
      setResult(sent);
      if (onSent) onSent(sent);
    } catch (e) {
      setError(e.message || 'The message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  if (loadingTemplates) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }} spacing={2}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary">
          Reading the approved templates from Fast2SMS…
        </Typography>
      </Stack>
    );
  }

  if (sendable.length === 0) {
    return (
      <Alert severity="warning" action={
        <Button size="small" onClick={onRefreshTemplates}>Re-check</Button>
      }>
        <AlertTitle>No approved template to send</AlertTitle>
        A business-initiated WhatsApp message can only use a template Meta has approved.
        Nothing on this account is approved yet, so there is nothing to send. Re-check
        after an approval comes through.
      </Alert>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={7}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="overline" color="text.secondary">Channel</Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={channel}
              onChange={(event, next) => next && setChannel(next)}
              sx={{ display: 'block', mt: 0.5 }}
            >
              <ToggleButton value="WHATSAPP">
                <WhatsAppIcon fontSize="small" sx={{ mr: 0.75 }} /> WhatsApp
              </ToggleButton>
              <ToggleButton value="SMS">
                <SmsIcon fontSize="small" sx={{ mr: 0.75 }} /> SMS
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Mobile number"
              value={mobileNo}
              onChange={(event) => setMobileNo(formatMobile(event.target.value))}
              error={Boolean(mobileNo) && !numberOk}
              helperText={mobileNo && !numberOk ? 'Ten digits, starting 6 to 9.' : ' '}
              InputProps={{
                startAdornment: <InputAdornment position="start">+91</InputAdornment>,
              }}
              fullWidth
            />
            <TextField
              label="Name (optional)"
              value={recipientName}
              onChange={(event) => setRecipientName(event.target.value)}
              helperText="Recorded against the message, for the audit trail."
              fullWidth
            />
          </Stack>

          <TextField
            select
            label="Template"
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
            helperText={selected
              ? TEMPLATE_PURPOSE[selected.templateName]
                || `${selected.varCount || 0} variables · ${selected.category || 'UTILITY'}`
              : 'Pick the approved wording to send.'}
            fullWidth
          >
            {sendable.map((template) => (
              <MenuItem key={template.messageId} value={String(template.messageId)}>
                <Stack>
                  <Typography variant="body2">
                    {template.templateName}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {template.varCount || 0} vars
                    </Typography>
                  </Typography>
                  {TEMPLATE_PURPOSE[template.templateName] && (
                    <Typography variant="caption" color="text.secondary">
                      {TEMPLATE_PURPOSE[template.templateName]}
                    </Typography>
                  )}
                </Stack>
              </MenuItem>
            ))}
          </TextField>

          <Divider />

          <Typography variant="subtitle2">
            Template values
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              in the order the approved template uses them
            </Typography>
          </Typography>

          <Grid container spacing={2}>
            {fields.map((field, index) => (
              <Grid item xs={12} sm={6} key={field.label + index}>
                <TextField
                  label={`${index + 1}. ${field.label}`}
                  value={values[index] || ''}
                  onChange={(event) => setValue(index, event.target.value)}
                  helperText={field.hint || ' '}
                  size="small"
                  fullWidth
                />
              </Grid>
            ))}
          </Grid>

          <Box>
            <Button
              variant="contained"
              startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
              disabled={!canSend}
              onClick={handleSend}
            >
              {sending ? 'Sending…' : `Send ${channel === 'SMS' ? 'SMS' : 'WhatsApp'}`}
            </Button>
            {missing && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                Fill every value — a blank leaves a {'{{n}}'} in the customer's message.
              </Typography>
            )}
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          {result && (
            <Alert severity={result.status === 'FAILED' ? 'error' : 'success'}>
              <AlertTitle>
                {result.status === 'FAILED'
                  ? 'The provider rejected it'
                  : `Accepted for ${prettyMobile(result.recipientMobile)}`}
              </AlertTitle>
              {result.status === 'FAILED'
                ? result.error
                : 'Accepted by Fast2SMS. Delivery is confirmed separately — the row will '
                  + 'move to Delivered once the provider reports back.'}
            </Alert>
          )}
        </Stack>
      </Grid>

      <Grid item xs={12} md={5}>
        <Paper variant="outlined" sx={{ p: 2, position: 'sticky', top: 16 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <WhatsAppIcon fontSize="small" color="success" />
            <Typography variant="subtitle2">What the customer will read</Typography>
          </Stack>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'success.50',
              border: '1px solid',
              borderColor: 'success.100',
              whiteSpace: 'pre-wrap',
              fontSize: 14,
              lineHeight: 1.6,
              minHeight: 160,
            }}
          >
            {preview || 'Pick a template to see the wording.'}
          </Box>
          {selected?.hasButtons && (
            <Chip size="small" label="Includes a call button" sx={{ mt: 1.5 }} />
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            This is the approved template body with your values in place, not a
            paraphrase — it is what goes out.
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default CustomSendPanel;
