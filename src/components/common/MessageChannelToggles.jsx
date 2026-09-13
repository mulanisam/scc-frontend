import React from 'react';
import { Box, Switch, Typography } from '@mui/material';
import {
  Message as MessageIcon,
  WhatsApp as WhatsAppIcon
} from '@mui/icons-material';

/**
 * The per-entry SMS and WhatsApp switches.
 *
 * Extracted from the bulk sales screen so that sales, payments and trading all offer the
 * same control in the same place. Three copies would have drifted, and the drift would
 * have been invisible: a screen whose toggle silently sent nothing looks identical to one
 * that works.
 *
 * Two independent switches, not a channel choice. Both can be on, and each message is
 * queued separately because each has its own approved template - so one being rejected by
 * the provider does not take the other with it.
 */
const ChannelToggle = ({ icon, label, on, onChange, colour, onText, offText, disabled }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      border: '1px solid',
      borderColor: on ? `${colour}.main` : 'grey.300',
      borderRadius: 2,
      px: 0.5,
      py: 0.5,
      bgcolor: 'background.paper',
      opacity: disabled ? 0.6 : 1,
      transition: 'all 0.3s ease',
      '&:hover': {
        borderColor: disabled ? 'grey.300' : `${colour}.main`,
        boxShadow: on ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.1)'
      }
    }}
  >
    {icon}
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, color: on ? `${colour}.main` : 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ color: on ? `${colour}.dark` : 'text.disabled', lineHeight: 1 }}>
        {on ? onText : offText}
      </Typography>
    </Box>
    <Switch
      checked={Boolean(on)}
      onChange={(event) => onChange(event.target.checked)}
      color={colour}
      size="medium"
      disabled={disabled}
    />
  </Box>
);

/**
 * Both switches together, worded for what is actually being sent.
 *
 * The wording differs per screen because the messages do. A sale sends the balance by SMS
 * and the day's detail by WhatsApp; a receipt acknowledges money in, and its two channels
 * say different things - the approved WhatsApp template states the amount received while
 * the approved DLT template for SMS states the balance, so they cannot be described as one
 * message.
 *
 * @param {'sale'|'payment'|'trading'} kind chooses the captions
 */
const MessageChannelToggles = ({
  sendSms,
  sendWhatsapp,
  onChange,
  kind = 'sale',
  disabled = false
}) => {
  const captions = {
    sale: { sms: 'Balance by SMS', whatsapp: "Day's detail" },
    payment: { sms: 'Balance by SMS', whatsapp: 'Receipt for the amount' },
    trading: { sms: 'Balance by SMS', whatsapp: "Load's detail" }
  }[kind];

  return (
    <>
      <ChannelToggle
        icon={<MessageIcon sx={{ fontSize: 24 }} color={sendSms ? 'primary' : 'disabled'} />}
        label="SMS"
        on={sendSms}
        onChange={(value) => onChange('sendSms', value)}
        colour="primary"
        onText={captions.sms}
        offText="Not sending"
        disabled={disabled}
      />

      <ChannelToggle
        icon={<WhatsAppIcon sx={{ fontSize: 24 }} color={sendWhatsapp ? 'success' : 'disabled'} />}
        label="WhatsApp"
        on={sendWhatsapp}
        onChange={(value) => onChange('sendWhatsapp', value)}
        colour="success"
        onText={captions.whatsapp}
        offText="Not sending"
        disabled={disabled}
      />
    </>
  );
};

export { ChannelToggle };
export default MessageChannelToggles;
