import React, { useState } from 'react';
import { Box, Paper, Tabs, Tab, Typography } from '@mui/material';
import { 
  GridOn as BulkIcon, 
  PostAdd as SingleIcon, 
  Payment as PaymentIcon 
} from '@mui/icons-material';

// Import existing components
import BulkSalesEntry from './BulkSalesEntry';
import SingleSaleEntry from './SingleSaleEntry';
import PaymentEntry from '../payment/PaymentEntry';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sales-tabpanel-${index}`}
      aria-labelledby={`sales-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `sales-tab-${index}`,
    'aria-controls': `sales-tabpanel-${index}`,
  };
}

const SalesEntryTabs = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.default', minHeight: '100vh' }}>
      <Paper elevation={3} sx={{ borderRadius: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="sales entry tabs"
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                fontSize: '1rem',
                fontWeight: 500,
              },
            }}
          >
            <Tab 
              icon={<BulkIcon />} 
              iconPosition="start"
              label="Bulk Entry" 
              {...a11yProps(0)} 
            />
            <Tab 
              icon={<SingleIcon />} 
              iconPosition="start"
              label="Single Entry" 
              {...a11yProps(1)} 
            />
            <Tab 
              icon={<PaymentIcon />} 
              iconPosition="start"
              label="Payment Entry" 
              {...a11yProps(2)} 
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <BulkSalesEntry />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <SingleSaleEntry />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <PaymentEntry />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default SalesEntryTabs;
