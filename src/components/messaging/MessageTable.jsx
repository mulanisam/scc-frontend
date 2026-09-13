import React, { useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
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
  ExpandLess as CollapseIcon,
  ExpandMore as ExpandIcon,
  Replay as ResendIcon,
} from '@mui/icons-material';
import {
  prettyMobile, stamp, dayOnly, statusColor, statusLabel, typeLabel, STATUS_META,
} from './messagingFormat';

/**
 * The message log.
 *
 * One row per message with its outcome, and the provider's own words behind an
 * expander rather than in the row - "did this customer get yesterday's message" is
 * answered by the status column, and only a failure needs the detail underneath.
 */
const MessageTable = ({ messages, loading, onResend, resendingId }) => {
  const [expanded, setExpanded] = useState(null);

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        No messages match this filter.
      </Alert>
    );
  }

  return (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 32 }} />
            <TableCell>Recipient</TableCell>
            <TableCell>Number</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>For</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Sent</TableCell>
            <TableCell>Delivered</TableCell>
            <TableCell align="center">Tries</TableCell>
            <TableCell align="right">Resend</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {messages.map((message) => {
            const open = expanded === message.id;
            const failed = message.status === 'FAILED';
            return (
              <React.Fragment key={message.id}>
                <TableRow
                  hover
                  sx={failed ? { '& td': { bgcolor: 'error.50' } } : undefined}
                >
                  <TableCell padding="none">
                    <IconButton
                      size="small"
                      onClick={() => setExpanded(open ? null : message.id)}
                      aria-label={open ? 'Hide message detail' : 'Show message detail'}
                    >
                      {open ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{message.recipientName || '—'}</TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {prettyMobile(message.recipientMobile)}
                  </TableCell>
                  <TableCell>{typeLabel(message.messageType)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{dayOnly(message.referenceDate)}</TableCell>
                  <TableCell>
                    <Tooltip title={STATUS_META[message.status]?.help || ''}>
                      <Chip
                        size="small"
                        label={statusLabel(message.status)}
                        color={statusColor(message.status)}
                        variant={message.status === 'SENT' ? 'outlined' : 'filled'}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{stamp(message.sentAt)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{stamp(message.deliveredAt)}</TableCell>
                  <TableCell align="center">{message.attempts}</TableCell>
                  <TableCell align="right">
                    {message.resendable && onResend ? (
                      <Tooltip title="Send again as a new message. The failure stays on record.">
                        <span>
                          <IconButton
                            size="small"
                            color={failed ? 'error' : 'default'}
                            disabled={resendingId === message.id}
                            onClick={() => onResend(message)}
                          >
                            {resendingId === message.id
                              ? <CircularProgress size={16} />
                              : <ResendIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : null}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell colSpan={10} sx={{ py: 0, border: open ? undefined : 'none' }}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                      <Box sx={{ py: 2, pl: 4, pr: 2 }}>
                        <Typography variant="overline" color="text.secondary">
                          Message as sent
                        </Typography>
                        <Box
                          sx={{
                            mt: 0.5,
                            mb: 2,
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: 'grey.50',
                            border: '1px solid',
                            borderColor: 'divider',
                            whiteSpace: 'pre-wrap',
                            fontSize: 13.5,
                            lineHeight: 1.6,
                            maxWidth: 560,
                          }}
                        >
                          {message.bodyPreview || '(no preview recorded)'}
                        </Box>

                        <Stack spacing={0.75}>
                          {message.error && (
                            <Detail label="Provider error" value={message.error} error />
                          )}
                          {message.skipReason && (
                            <Detail label="Why it was skipped" value={message.skipReason} />
                          )}
                          {message.providerStatus && (
                            <Detail label="Provider status" value={message.providerStatus} />
                          )}
                          {message.readAt && (
                            <Detail label="Read at" value={stamp(message.readAt)} />
                          )}
                          <Detail label="Template" value={message.templateId || '—'} />
                          <Detail label="Variables" value={message.variables || '—'} />
                          <Detail label="Provider request id" value={message.providerMessageId || '—'} />
                        </Stack>
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
  );
};

const Detail = ({ label, value, error = false }) => (
  <Stack direction="row" spacing={1} alignItems="baseline">
    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 150 }}>
      {label}
    </Typography>
    <Typography
      variant="body2"
      color={error ? 'error.main' : 'text.primary'}
      sx={{ wordBreak: 'break-word' }}
    >
      {value}
    </Typography>
  </Stack>
);

export default MessageTable;
