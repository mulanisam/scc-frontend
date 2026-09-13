import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CheckCircle as ApprovedIcon,
  HourglassEmpty as PendingIcon,
  Block as RejectedIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { TEMPLATE_PURPOSE, placeholderCount } from './messagingFormat';

/**
 * The approved wording, as it stands on the Fast2SMS account.
 *
 * Here because template approval is the thing that decides whether WhatsApp works at
 * all, and it is decided by Meta, not by this application. When a message is held with
 * "template is not approved", this is the screen that says why - and it reads the
 * provider rather than repeating what the code assumes, which is the mistake that once
 * put our own wording in the outbox while customers received something different.
 *
 * @param {object} props.usage  message type -> template id, from the server config
 */
const TemplatePanel = ({ templates, loading, onRefresh, usage = {} }) => {
  if (loading) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary">
          Reading the templates from Fast2SMS…
        </Typography>
      </Stack>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <Alert
        severity="warning"
        action={<Button size="small" onClick={onRefresh}>Re-check</Button>}
      >
        <AlertTitle>No templates could be read from the provider</AlertTitle>
        Either the API key is wrong or Fast2SMS is unreachable. Nothing can be sent over
        WhatsApp until this list loads.
      </Alert>
    );
  }

  // Approved first: it is the list somebody scans to find something they can send.
  const ordered = [...templates].sort((a, b) => {
    if (a.approved !== b.approved) return a.approved ? -1 : 1;
    return (b.varCount || 0) - (a.varCount || 0);
  });

  const usedFor = (template) => Object.entries(usage)
    .filter(([, id]) => String(id) === String(template.messageId))
    .map(([type]) => type);

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          {ordered.filter((t) => t.approved).length} of {ordered.length} approved. A
          business-initiated WhatsApp message can only use an approved template.
        </Typography>
        <Button size="small" startIcon={<RefreshIcon />} onClick={onRefresh}>
          Re-check with provider
        </Button>
      </Stack>

      <Grid container spacing={2}>
        {ordered.map((template) => {
          const roles = usedFor(template);
          const declared = template.varCount || 0;
          const actual = placeholderCount(template.bodyText);
          const mismatch = declared !== actual;

          return (
            <Grid item xs={12} md={6} key={template.messageId}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 1 }}>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                      {template.templateName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {TEMPLATE_PURPOSE[template.templateName] || 'No description recorded.'}
                    </Typography>
                  </Box>
                  <StatusChip status={template.status} approved={template.approved} />
                </Stack>

                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                  <Chip size="small" variant="outlined" label={`id ${template.messageId}`} />
                  <Chip size="small" variant="outlined" label={`${declared} variables`} />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={template.category || 'UTILITY'}
                    color={template.utility ? 'default' : 'warning'}
                  />
                  {template.hasButtons && (
                    <Chip size="small" variant="outlined" label="Call button" />
                  )}
                  {roles.map((role) => (
                    <Tooltip key={role} title="This template is what the application sends automatically">
                      <Chip size="small" color="primary" label={`In use: ${role}`} />
                    </Tooltip>
                  ))}
                </Stack>

                {mismatch && (
                  <Alert severity="warning" sx={{ mb: 1.5, py: 0 }}>
                    The provider declares {declared} variables but the body contains{' '}
                    {actual}. Sending {declared} values would shift them into the wrong
                    slots.
                  </Alert>
                )}

                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: template.approved ? 'success.50' : 'grey.50',
                    border: '1px solid',
                    borderColor: template.approved ? 'success.100' : 'divider',
                    whiteSpace: 'pre-wrap',
                    fontSize: 13.5,
                    lineHeight: 1.6,
                  }}
                >
                  {template.bodyText || '(no body returned by the provider)'}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
};

const StatusChip = ({ status, approved }) => {
  if (approved) {
    return <Chip size="small" color="success" icon={<ApprovedIcon />} label="Approved" />;
  }
  const rejected = /reject|disable|fail/i.test(String(status || ''));
  return (
    <Chip
      size="small"
      color={rejected ? 'error' : 'warning'}
      icon={rejected ? <RejectedIcon /> : <PendingIcon />}
      label={status || 'Unknown'}
    />
  );
};

export default TemplatePanel;
