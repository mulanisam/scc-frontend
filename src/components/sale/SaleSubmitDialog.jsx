import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

const money = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN')}`;
const count = (value) => (Number(value) || 0).toLocaleString('en-IN');

const Row = ({ label, value, bold = false, color }) => (
  <TableRow>
    <TableCell
      sx={{
        border: 0,
        py: 0.5,
        color: 'text.secondary',
        fontSize: '0.85rem',
        width: '45%'
      }}
    >
      {label}
    </TableCell>
    <TableCell
      sx={{
        border: 0,
        py: 0.5,
        fontSize: '0.9rem',
        fontWeight: bold ? 700 : 500,
        color: color || 'text.primary',
        fontVariantNumeric: 'tabular-nums'
      }}
    >
      {value}
    </TableCell>
  </TableRow>
);

/**
 * Final check before a sale entry is saved.
 *
 * Shows what is about to be written, and surfaces the two things the operator
 * cannot see from the grid: that a trip is already recorded for this date and
 * route, and that this entry predates the route's last sale — which makes the
 * server recalculate ledger balances from that date forward.
 *
 * Blocking problems (a future date, an unbalanced load) disable the save; the
 * warnings above only require acknowledgement.
 */
const SaleSubmitDialog = ({
  open,
  summary,
  dateCheck,
  duplicateCheck,
  submitting,
  onConfirm,
  onCancel
}) => {
  if (!summary) return null;

  const { birds, money: totals } = summary;
  const blocked = Boolean(dateCheck?.blocked) || !birds.balanced;

  return (
    <Dialog open={open} onClose={submitting ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
          Confirm sale entry
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Check these figures before saving. Nothing is written until you confirm.
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {dateCheck?.blocked && (
          <Alert severity="error" sx={{ mb: 2 }} icon={<WarningIcon />}>
            {dateCheck.message}
          </Alert>
        )}

        {!birds.balanced && (
          <Alert severity="error" sx={{ mb: 2 }} icon={<WarningIcon />}>
            Bird count does not balance — {birds.message}. Correct it before saving.
          </Alert>
        )}

        {duplicateCheck?.isDuplicate && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {duplicateCheck.message}
          </Alert>
        )}

        {dateCheck?.requiresConfirmation && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {dateCheck.message}
          </Alert>
        )}

        <Typography variant="overline" color="text.secondary">Trip</Typography>
        <Table size="small">
          <TableBody>
            <Row label="Date" value={summary.date} />
            <Row label="Route" value={summary.route} />
            <Row label="Vehicle" value={summary.vehicle} />
            <Row label="Driver" value={summary.driver} />
            <Row label="Customers" value={`${summary.customerCount} with entries`} />
            {summary.description && <Row label="Description" value={summary.description} />}
          </TableBody>
        </Table>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="overline" color="text.secondary">Birds</Typography>
          <Chip
            size="small"
            icon={birds.balanced ? <CheckIcon /> : <WarningIcon />}
            label={birds.balanced ? 'Balanced' : birds.message}
            color={birds.balanced ? 'success' : 'error'}
            variant="outlined"
          />
        </Box>
        <Table size="small">
          <TableBody>
            <Row label="Loaded at farm" value={count(birds.loaded)} />
            <Row label="Sold" value={count(birds.sold)} />
            <Row label="Mortality" value={count(birds.mortality)} />
            <Row label="Returned to farm" value={count(birds.returnToFarm)} />
          </TableBody>
        </Table>

        <Divider sx={{ my: 2 }} />

        <Typography variant="overline" color="text.secondary">Totals</Typography>
        <Table size="small">
          <TableBody>
            <Row label="Weight" value={`${(Number(totals.weight) || 0).toFixed(3)} kg`} />
            <Row label="Amount" value={money(totals.amount)} bold />
            <Row label="Payment received" value={money(totals.payment)} />
            <Row
              label="Pending"
              value={money(totals.pending)}
              bold
              color={Number(totals.pending) > 0 ? 'error.main' : 'success.main'}
            />
          </TableBody>
        </Table>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {summary.sendSms
            ? 'Customers will be sent a message after saving.'
            : 'No customer messages will be sent.'}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} disabled={submitting} startIcon={<CloseIcon />}>
          Go back
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={submitting || blocked}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
        >
          {submitting ? 'Saving…' : 'Confirm and save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaleSubmitDialog;
