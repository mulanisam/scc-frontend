import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tab,
  Tabs,
  TextField,
  TablePagination,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Clear as ClearIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ErrorOutline as ExpiredIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  WarningAmber as DueIcon
} from '@mui/icons-material';
import UserService from '../service/UserService';
import { getData, createData, updateData, deleteData } from '../service/MasterDataService';
import {
  ADMIN_TABS,
  FORMATTERS,
  SCHEMA,
  TAB_ORDER,
  VEHICLE_DATE_FIELDS,
  expiryState,
  missingRequired,
  toForm,
  toPayload,
  toRow
} from './masterDataSchema';

/**
 * Master data: the eight reference tables the rest of the system points at.
 *
 * Rewritten around masterDataSchema.js, which states what each table holds. The screen
 * before it derived both its columns and its form fields from whatever keys the API
 * returned, and that had three visible costs: the customer table rendered fourteen
 * columns - `whatsappOptOutAt` among them - pushing the five a person reads off the
 * right edge; the form offered those same fourteen as text boxes; and the horizontal
 * scrollbar sat below the fold, because the scrolling container was allowed to grow to
 * its content instead of being held to the viewport. All three are fixed here.
 */

/** Room taken by the app bar, page header and toolbar above the table. */
const CHROME_HEIGHT = 270;

/**
 * How many rows are mounted at once.
 *
 * 488 customers rendered together is what made this screen slow to open. The search and the
 * sort still run over every row - only the rendering is paged - so nothing becomes harder to
 * find, and 100 is deep enough that the common case is one page.
 */
const PAGE_SIZES = [100, 250, 500];

/**
 * One cell's content, formatted.
 *
 * Module scope rather than a closure inside the component, so it is not rebuilt on every
 * keystroke in the search box and so the memoised row below can actually skip work.
 */
const cellContent = (row, column) => {
  const raw = row[column.key];
  const formatted = column.format ? FORMATTERS[column.format](raw) : raw;
  const text = formatted === '' || formatted == null ? '—' : String(formatted);

  if (!column.expiry) return text;

  const state = expiryState(raw);
  if (!state) return text;
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {state === 'expired'
        ? <ExpiredIcon fontSize="small" color="error" />
        : <DueIcon fontSize="small" color="warning" />}
      <Typography
        variant="body2"
        color={state === 'expired' ? 'error.main' : 'warning.dark'}
        sx={{ fontWeight: 600 }}
      >
        {text}
      </Typography>
    </Stack>
  );
};

const ACTIONS_CELL_SX = {
  position: 'sticky',
  right: 0,
  bgcolor: 'background.paper',
  borderLeft: '1px solid',
  borderLeftColor: 'divider',
  whiteSpace: 'nowrap'
};

const ROW_SX = { '&:hover .row-actions': { opacity: 1 } };
const ACTIONS_BOX_SX = { opacity: { xs: 1, md: 0.45 }, transition: 'opacity .15s' };

/**
 * One row of the table.
 *
 * Split out and memoised because this screen got slow enough to complain about, and the
 * reason was in here rather than in the API - which answers in about 290 ms for all 488
 * customers.
 *
 * Two things were costing almost all of it:
 *
 * <b>A MUI Tooltip around every cell.</b> Eight columns plus two action buttons is ten
 * Tooltips a row, so the customer table mounted close to five thousand of them - each one a
 * component with its own listeners and Popper machinery, all to show text the browser will
 * show for free. They are the native `title` attribute now. The behaviour is the same: hover
 * a truncated address and the whole thing appears.
 *
 * <b>A fresh `sx` object per cell, per render.</b> Emotion hashes and serialises each one, so
 * a table of 3,900 cells did that 3,900 times on every keystroke in the search box. The style
 * for a column is now computed once, in the parent, and passed down.
 */
const DataRow = React.memo(function DataRow({
  row, columns, cellSx, singular, nameKey, onEdit, onDelete
}) {
  return (
    <TableRow hover sx={ROW_SX}>
      {columns.map((column) => {
        const content = cellContent(row, column);
        return (
          <TableCell
            key={column.key}
            align={column.align || 'left'}
            sx={cellSx[column.key]}
            // The browser's own tooltip, so a cut-off address is still readable in full.
            // A Tooltip component here is what made the table slow to open.
            title={column.wrap || column.expiry ? undefined : String(row[column.key] ?? '')}
          >
            {content}
          </TableCell>
        );
      })}
      <TableCell align="right" sx={ACTIONS_CELL_SX}>
        <Box className="row-actions" sx={ACTIONS_BOX_SX}>
          <IconButton
            size="small"
            color="primary"
            title={`Edit ${singular}`}
            aria-label={`Edit ${singular}`}
            onClick={() => onEdit(row)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            title={`Delete ${singular}`}
            aria-label={`Delete ${singular}`}
            onClick={() => onDelete(row, nameKey, singular)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </TableCell>
    </TableRow>
  );
});

export default function MasterData() {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('lg'));
  const medium = useMediaQuery(theme.breakpoints.up('md'));

  const tabs = useMemo(
    () => (UserService.adminOnly() ? [...TAB_ORDER, ...ADMIN_TABS] : [...TAB_ORDER]),
    []
  );

  const [type, setType] = useState(tabs[0]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: null, direction: 'asc' });
  const [toast, setToast] = useState(null);

  // Option lists for the form's dropdowns, loaded once and reused across tabs.
  const [lookups, setLookups] = useState({ routes: [], cities: [], parties: [] });

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const schema = SCHEMA[type];
  const searchRef = useRef(null);

  // ---- loading ---------------------------------------------------------

  const load = useCallback(async (which) => {
    setLoading(true);
    try {
      const response = await getData(which);
      setRows((response.data ?? []).map((raw) => toRow(which, raw)));
    } catch (error) {
      setToast({ severity: 'error', message: `Could not load ${SCHEMA[which].label.toLowerCase()}.` });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(type); }, [type, load]);

  /*
   * The dropdown lists, fetched once rather than per tab.
   *
   * They are needed by the form, not the table, and a form can be opened on any tab -
   * so tying the fetch to the active tab meant the Cities form could open with an empty
   * Route dropdown if the tab had been reached directly.
   */
  useEffect(() => {
    let cancelled = false;
    Promise.all([getData('routes'), getData('cities')])
      .then(([routes, cities]) => {
        if (cancelled) return;
        setLookups((current) => ({
          ...current,
          routes: routes.data ?? [],
          cities: (cities.data ?? []).map((city) => ({
            id: city.id,
            name: city.name,
            routeId: city.route?.id ?? null
          }))
        }));
      })
      .catch(() => { /* The form reports an empty list itself. */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!UserService.adminOnly()) return;
    getData('parties')
      .then((response) => setLookups((current) => ({ ...current, parties: response.data ?? [] })))
      .catch(() => { /* Admin-only tab; the form says so. */ });
  }, []);

  // ---- filtering and sorting -------------------------------------------

  const columns = useMemo(() => {
    const limit = wide ? 3 : medium ? 2 : 1;
    return schema.columns.filter((column) => (column.priority ?? 1) <= limit);
  }, [schema, wide, medium]);

  /**
   * One style object per column, built once.
   *
   * These used to be written inline on each cell, which meant a new object - and a fresh
   * emotion serialisation - for all 3,900 cells on every render of the table.
   */
  const cellSx = useMemo(() => {
    const map = {};
    columns.forEach((column) => {
      map[column.key] = {
        fontWeight: column.bold ? 600 : 400,
        fontVariantNumeric: column.numeric ? 'tabular-nums' : 'normal',
        width: column.width,
        maxWidth: column.width,
        ...(column.wrap
          ? { whiteSpace: 'normal', wordBreak: 'break-word' }
          : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })
      };
    });
    return map;
  }, [columns]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();

    // Searched over the columns on screen, not every key on the object. Matching a
    // hidden field looks like a bug: the row appears with nothing in it that matches.
    let result = needle
      ? rows.filter((row) => schema.columns.some((column) =>
          String(row[column.key] ?? '').toLowerCase().includes(needle)))
      : [...rows];

    if (sort.key) {
      const column = schema.columns.find((c) => c.key === sort.key);
      const factor = sort.direction === 'asc' ? 1 : -1;
      result.sort((a, b) => {
        const left = a[sort.key];
        const right = b[sort.key];
        // Numbers compared as numbers: sorting balances as text puts 9,000 above 50,000.
        if (column?.numeric && column.format !== 'mobile') {
          return ((Number(left) || 0) - (Number(right) || 0)) * factor;
        }
        return String(left ?? '').localeCompare(String(right ?? ''), 'en-IN', { numeric: true }) * factor;
      });
    }
    return result;
  }, [rows, search, sort, schema]);

  /**
   * The rows actually mounted.
   *
   * Searching and sorting still run over everything above; only the rendering is paged. That
   * order matters - paging first would search one page and look like the data had gone.
   */
  const paged = useMemo(
    () => visible.slice(page * pageSize, page * pageSize + pageSize),
    [visible, page, pageSize]
  );

  // Back to the first page whenever the list underneath changes, or a search that matches
  // twelve rows leaves the table blank because page 3 no longer exists.
  useEffect(() => { setPage(0); }, [search, type, sort.key, sort.direction]);

  /** Vehicles whose papers have lapsed or are about to. */
  const expiring = useMemo(() => {
    if (type !== 'vehicles') return [];
    return rows
      .map((row) => {
        const problems = VEHICLE_DATE_FIELDS
          .map(({ key, label }) => ({ label, state: expiryState(row[key]) }))
          .filter((entry) => entry.state);
        return problems.length ? { vehicleNo: row.vehicleNo, problems } : null;
      })
      .filter(Boolean);
  }, [rows, type]);

  // ---- actions ---------------------------------------------------------

  const changeTab = (event, index) => {
    setType(tabs[index]);
    setSearch('');
    setSort({ key: null, direction: 'asc' });
  };

  const toggleSort = (key) => {
    setSort((current) => current.key === key
      ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' });
  };

  /*
   * Both wrapped, because DataRow is memoised and a callback rebuilt on every render would
   * change its props every time - which would re-render all 100 rows on each keystroke and
   * undo the memo entirely.
   */
  const openForm = useCallback((row) => {
    setFormError('');
    setForm({ ...toForm(type, row), __editing: Boolean(row) });
  }, [type]);

  const requestDelete = useCallback((row, nameKey, singular) => {
    setConfirmDelete({
      id: row.id,
      name: row[nameKey] || `${singular} ${row.id}`
    });
  }, []);

  const setField = (key, value) => setForm((current) => {
    const next = { ...current, [key]: value };
    // Changing the route invalidates a city chosen under the old one.
    if (key === 'route' && current.city) {
      const city = lookups.cities.find((c) => String(c.id) === String(current.city));
      if (city && String(city.routeId) !== String(value)) {
        next.city = '';
      }
    }
    return next;
  });

  const save = async () => {
    const missing = missingRequired(type, form);
    if (missing.length) {
      setFormError(`Still needed: ${missing.join(', ')}.`);
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = toPayload(type, form);
      if (form.__editing) {
        await updateData(type, form.id, payload);
      } else {
        await createData(type, null, payload);
      }
      setToast({
        severity: 'success',
        message: `${schema.singular.charAt(0).toUpperCase()}${schema.singular.slice(1)} ${form.__editing ? 'updated' : 'added'}.`
      });
      setForm(null);
      await load(type);
      if (type === 'cities' || type === 'routes') {
        // The dropdowns elsewhere are now stale.
        const [routes, cities] = await Promise.all([getData('routes'), getData('cities')]);
        setLookups((current) => ({
          ...current,
          routes: routes.data ?? [],
          cities: (cities.data ?? []).map((city) => ({
            id: city.id, name: city.name, routeId: city.route?.id ?? null
          }))
        }));
      }
    } catch (error) {
      // The server's own message, which names the real problem - a duplicate number, a
      // missing city - instead of "Error updating customers".
      setFormError(error?.response?.data?.message || error.message || 'The save did not go through.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const target = confirmDelete;
    setConfirmDelete(null);
    try {
      await deleteData(type, target.id);
      setToast({ severity: 'success', message: `${target.name} deleted.` });
      await load(type);
    } catch (error) {
      setToast({
        severity: 'error',
        message: error?.response?.data?.message
          || `${target.name} could not be deleted. It may be in use by a sale or a trip.`
      });
    }
  };

  // ---- rendering -------------------------------------------------------

  return (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      // The page itself never scrolls; the table does. Without this the whole layout
      // grows and the table's horizontal scrollbar ends up below the fold.
      overflow: 'hidden',
      p: { xs: 1.5, sm: 2.5 },
      gap: 1.5
    }}>
      {/* Heading */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
        sx={{ flexShrink: 0 }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Master data</Typography>
          <Typography variant="body2" color="text.secondary">
            The reference tables every sale, trip and statement points at.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openForm(null)}
          sx={{ alignSelf: { xs: 'stretch', sm: 'auto' }, flexShrink: 0 }}
        >
          Add {schema.singular}
        </Button>
      </Stack>

      {/* Tabs */}
      <Paper variant="outlined" sx={{ flexShrink: 0 }}>
        <Tabs
          value={tabs.indexOf(type)}
          onChange={changeTab}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ px: 1, minHeight: 44, '& .MuiTab-root': { minHeight: 44, textTransform: 'none', fontWeight: 500 } }}
        >
          {tabs.map((tab) => <Tab key={tab} label={SCHEMA[tab].label} />)}
        </Tabs>
      </Paper>

      {/* Toolbar */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        sx={{ flexShrink: 0 }}
      >
        <TextField
          inputRef={searchRef}
          size="small"
          placeholder={`Search ${schema.label.toLowerCase()}`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ minWidth: { sm: 280 }, flexGrow: { sm: 1 }, maxWidth: 420 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => { setSearch(''); searchRef.current?.focus(); }}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null
          }}
        />
        <Chip
          size="small"
          variant="outlined"
          label={search
            ? `${visible.length} of ${rows.length}`
            : `${rows.length} ${rows.length === 1 ? schema.singular : schema.label.toLowerCase()}`}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Reload from the server">
          <IconButton size="small" onClick={() => load(type)} disabled={loading}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {schema.note && (
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
          {schema.note}
        </Typography>
      )}

      {expiring.length > 0 && (
        <Alert severity="warning" sx={{ flexShrink: 0, py: 0.5 }}>
          <AlertTitle sx={{ mb: 0.25, fontSize: 14 }}>
            {expiring.length} vehicle{expiring.length === 1 ? '' : 's'} need papers renewed
          </AlertTitle>
          <Typography variant="caption">
            {expiring.slice(0, 4).map((vehicle) =>
              `${vehicle.vehicleNo} (${vehicle.problems.map((p) => p.label).join(', ')})`).join(' · ')}
            {expiring.length > 4 ? ` · and ${expiring.length - 4} more` : ''}
          </Typography>
        </Alert>
      )}

      {/*
        The table, and the fix for the scrollbar.

        minHeight: 0 is the load-bearing line. A flex child defaults to min-height:auto,
        which refuses to shrink below its content - so this container grew to fit all 487
        customers, the page scrolled instead of the table, and the horizontal scrollbar
        sat at the bottom of the content where nobody could reach it without scrolling
        to the last row. Held to the viewport, both scrollbars sit on its own edges.
      */}
      <Paper
        variant="outlined"
        sx={{
          flexGrow: 1,
          minHeight: 0,
          maxHeight: `calc(100vh - ${CHROME_HEIGHT}px)`,
          overflow: 'auto',
          position: 'relative'
        }}
      >
        <Table size="small" stickyHeader sx={{ minWidth: 680 }}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  align={column.align || 'left'}
                  sortDirection={sort.key === column.key ? sort.direction : false}
                  sx={{
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    width: column.width,
                    minWidth: column.width,
                    bgcolor: 'background.paper'
                  }}
                >
                  <TableSortLabel
                    active={sort.key === column.key}
                    direction={sort.key === column.key ? sort.direction : 'asc'}
                    onClick={() => toggleSort(column.key)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              {/*
                Pinned right, so the edit and delete buttons stay reachable on a table
                wider than the screen - the point of having a horizontal scrollbar is
                reading the data, not hunting for the actions.
              */}
              <TableCell
                align="right"
                sx={{
                  fontWeight: 700,
                  width: 96,
                  minWidth: 96,
                  position: 'sticky',
                  right: 0,
                  bgcolor: 'background.paper',
                  borderLeft: '1px solid',
                  borderLeftColor: 'divider',
                  zIndex: 3
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading && rows.length === 0 && Array.from({ length: 8 }).map((unused, index) => (
              <TableRow key={`skeleton-${index}`}>
                {columns.map((column) => (
                  <TableCell key={column.key}><Skeleton variant="text" /></TableCell>
                ))}
                <TableCell sx={{ position: 'sticky', right: 0, bgcolor: 'background.paper' }}>
                  <Skeleton variant="text" />
                </TableCell>
              </TableRow>
            ))}

            {!loading && visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} sx={{ border: 0, py: 6 }}>
                  <Stack alignItems="center" spacing={1.5}>
                    <Typography color="text.secondary">
                      {search
                        ? `Nothing matches “${search}”.`
                        : `No ${schema.label.toLowerCase()} yet.`}
                    </Typography>
                    {search
                      ? <Button size="small" onClick={() => setSearch('')}>Clear the search</Button>
                      : (
                        <Button size="small" startIcon={<AddIcon />} onClick={() => openForm(null)}>
                          Add the first {schema.singular}
                        </Button>
                      )}
                  </Stack>
                </TableCell>
              </TableRow>
            )}

            {paged.map((row) => (
              <DataRow
                key={row.id}
                row={row}
                columns={columns}
                cellSx={cellSx}
                singular={schema.singular}
                nameKey={schema.nameKey}
                onEdit={openForm}
                onDelete={requestDelete}
              />
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/*
        Outside the scrolling Paper, so the controls stay put while the table scrolls under
        them. Only shown when there is more than one page: eight vehicles should not be made
        to look like a paginated dataset.
      */}
      {visible.length > PAGE_SIZES[0] && (
        <TablePagination
          component="div"
          count={visible.length}
          page={page}
          onPageChange={(event, next) => setPage(next)}
          rowsPerPage={pageSize}
          rowsPerPageOptions={PAGE_SIZES}
          onRowsPerPageChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(0);
          }}
          labelRowsPerPage="Rows"
          sx={{ flexShrink: 0, borderTop: '1px solid', borderTopColor: 'divider' }}
        />
      )}

      {/* Add / edit */}
      <Dialog open={Boolean(form)} onClose={() => !saving && setForm(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          {form?.__editing ? `Edit ${schema.singular}` : `Add ${schema.singular}`}
          <Typography variant="body2" color="text.secondary">
            {form?.__editing
              ? 'Only the fields below are changed.'
              : `A new ${schema.singular} in ${schema.label.toLowerCase()}.`}
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            {schema.fields
              // An opening balance only makes sense once. After that the ledger owns
              // the figure, and a stale value typed here would overwrite it.
              .filter((field) => !(field.createOnly && form?.__editing))
              .map((field) => (
                <Grid item xs={12} sm={field.full ? 12 : 6} key={field.key}>
                  <FormField
                    field={field}
                    value={form?.[field.key] ?? ''}
                    onChange={(value) => setField(field.key, value)}
                    lookups={lookups}
                    form={form}
                  />
                </Grid>
              ))}
          </Grid>

          {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setForm(null)} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {saving ? 'Saving' : (form?.__editing ? 'Save changes' : `Add ${schema.singular}`)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete */}
      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete {confirmDelete?.name}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {/* Named rather than "Are you sure?", which tells the reader nothing about
                which of 487 rows they are about to remove. */}
            This removes the {schema.singular} from master data. Sales and trips that
            already reference it keep their records.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDelete(null)}>Keep it</Button>
          <Button color="error" variant="contained" onClick={remove}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} variant="filled">
            {toast.message}
          </Alert>
        ) : null}
      </Snackbar>
    </Box>
  );
}

/** One input, shaped by its schema entry. */
const FormField = ({ field, value, onChange, lookups, form }) => {
  if (field.type === 'select') {
    let options = lookups[field.options] ?? [];

    // A dependent list is filtered by what it depends on - cities by route. Offering
    // all 171 cities when the route is already chosen is how the wrong one gets picked.
    if (field.dependsOn) {
      const parent = form?.[field.dependsOn];
      options = parent
        ? options.filter((option) => String(option.routeId) === String(parent))
        : [];
    }

    const blocked = field.dependsOn && !form?.[field.dependsOn];
    return (
      <FormControl fullWidth size="small" disabled={blocked}>
        <InputLabel required={field.required}>{field.label}</InputLabel>
        <Select
          label={field.label}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.name || option.vehicleNumber}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>
          {blocked
            ? `Choose a ${field.dependsOn} first`
            : (options.length === 0 ? 'Nothing to choose from yet' : (field.help || ' '))}
        </FormHelperText>
      </FormControl>
    );
  }

  if (field.type === 'list') {
    return <ListField field={field} value={value} onChange={onChange} />;
  }

  if (field.type === 'date') {
    return (
      <TextField
        fullWidth
        size="small"
        type="date"
        label={field.label}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        InputLabelProps={{ shrink: true }}
        helperText={field.help || ' '}
      />
    );
  }

  if (field.type === 'mobile') {
    const digits = String(value ?? '').replace(/\D/g, '');
    const invalid = digits.length > 0 && !/^[6-9]\d{9}$/.test(digits);
    return (
      <TextField
        fullWidth
        size="small"
        label={field.label}
        value={value ?? ''}
        // Digits only, and capped at ten. A pasted "+91 " prefix is stripped as typed
        // rather than rejected on save.
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(-10))}
        error={invalid}
        helperText={invalid ? 'Ten digits, starting 6 to 9.' : (field.help || ' ')}
        InputProps={{ startAdornment: <InputAdornment position="start">+91</InputAdornment> }}
        inputProps={{ inputMode: 'numeric', style: { fontVariantNumeric: 'tabular-nums' } }}
      />
    );
  }

  return (
    <TextField
      fullWidth
      size="small"
      type={field.type === 'number' ? 'number' : 'text'}
      label={field.label}
      required={field.required}
      autoFocus={field.autoFocus}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      helperText={field.help || ' '}
      inputProps={field.type === 'number' ? { step: 'any' } : undefined}
    />
  );
};

/**
 * Several short values in one field - a party's vehicle registration numbers.
 *
 * Chips with an add box rather than a row of text inputs: the count varies, most parties
 * have one or two, and a fixed set of boxes would either run out or sit mostly empty.
 * Enter and comma both commit, because a registration number is short enough that
 * reaching for the mouse between each one is the slow part.
 */
const ListField = ({ field, value, onChange }) => {
  const [draft, setDraft] = useState('');
  const items = Array.isArray(value) ? value : [];

  const add = () => {
    // Tidied the same way the server tidies it, so what the chip shows is what is
    // stored: "mh13 cu 4916" and "MH13CU4916" are one lorry.
    const tidy = draft.replace(/[\s-]+/g, '').toUpperCase();
    if (!tidy) return;
    if (items.includes(tidy)) {
      setDraft('');
      return;
    }
    onChange([...items, tidy]);
    setDraft('');
  };

  return (
    <Box>
      <TextField
        fullWidth
        size="small"
        label={field.label}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            add();
          }
        }}
        // Committed on blur too, so a number typed and then clicked away from is not
        // silently lost when the dialog is saved.
        onBlur={add}
        placeholder="MH13CU4916"
        helperText={field.help || 'Press Enter to add each one'}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="Add this vehicle">
                <span>
                  <IconButton size="small" onClick={add} disabled={!draft.trim()}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </InputAdornment>
          )
        }}
      />
      {items.length > 0 && (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {items.map((item) => (
            <Chip
              key={item}
              label={item}
              size="small"
              onDelete={() => onChange(items.filter((other) => other !== item))}
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
};
