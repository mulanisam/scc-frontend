import React, { useState } from 'react';
import { Box, Container, Paper, Tab, Tabs } from '@mui/material';
import {
  AccountBalanceWallet as PayablesIcon,
  ShoppingBasket as EntryIcon
} from '@mui/icons-material';
import PurchaseEntryPage from './PurchaseEntry';
import SupplierPayables from './SupplierPayables';

/**
 * The purchase side, entry and payables together.
 *
 * Tabbed like the sales and trading pages rather than a bare entry form, because the two
 * halves belong to one job: somebody entering a load is usually the person about to be asked
 * what the supplier is still owed, and until now there was nowhere at all to look that up.
 *
 * The entry tab stays mounted once opened - it holds half-typed DC lines and a form that would
 * be lost by switching away - while payables is remounted each time, so it reads current
 * figures rather than showing a balance from before the load just entered.
 */

const PurchasePage = () => {
  const [tab, setTab] = useState(0);
  const [entryVisited, setEntryVisited] = useState(true);

  const handleChange = (event, next) => {
    if (next === 0) setEntryVisited(true);
    setTab(next);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Paper square elevation={1} sx={{ flexShrink: 0 }}>
        <Container maxWidth="xl">
          <Tabs value={tab} onChange={handleChange} variant="scrollable" scrollButtons="auto">
            <Tab icon={<EntryIcon fontSize="small" />} iconPosition="start" label="Purchase entry" />
            <Tab icon={<PayablesIcon fontSize="small" />} iconPosition="start" label="Payables" />
          </Tabs>
        </Container>
      </Paper>

      {/*
        Kept in the tree and hidden, not unmounted: a purchase can be four DC lines off paper
        notes, and losing them to a tab change would be worse than the cost of the extra DOM.
      */}
      {entryVisited && (
        <Box sx={{ flexGrow: 1, overflow: 'hidden', display: tab === 0 ? 'flex' : 'none', flexDirection: 'column' }}>
          <PurchaseEntryPage />
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Container maxWidth="xl" sx={{ py: 2 }}>
            <SupplierPayables />
          </Container>
        </Box>
      )}
    </Box>
  );
};

export default PurchasePage;
