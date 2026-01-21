import React, { useState } from 'react';
import { 
  Box, 
  Container,
  Paper, 
  Tabs, 
  Tab, 
  Typography,
  Card,
  CardContent
} from '@mui/material';
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
        <Box>
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
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Sales & Payment Entry
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Choose your preferred entry method from the tabs below
        </Typography>
      </Box>

      <Card elevation={3}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="sales entry tabs"
            variant="fullWidth"
            sx={{
              bgcolor: 'background.paper',
              '& .MuiTab-root': {
                minHeight: 70,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                '&.Mui-selected': {
                  color: 'primary.main',
                  bgcolor: 'action.selected'
                }
              },
            }}
          >
            <Tab 
              icon={<BulkIcon sx={{ fontSize: 28 }} />} 
              iconPosition="start"
              label="Bulk Entry" 
              {...a11yProps(0)} 
            />
            <Tab 
              icon={<SingleIcon sx={{ fontSize: 28 }} />} 
              iconPosition="start"
              label="Single Entry" 
              {...a11yProps(1)} 
            />
            <Tab 
              icon={<PaymentIcon sx={{ fontSize: 28 }} />} 
              iconPosition="start"
              label="Payment Entry" 
              {...a11yProps(2)} 
            />
          </Tabs>
        </Box>

        <CardContent sx={{ p: 0 }}>
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ p: 2 }}>
              <BulkSalesEntry />
            </Box>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Box sx={{ p: 2 }}>
              <SingleSaleEntry />
            </Box>
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <Box sx={{ p: 2 }}>
              <PaymentEntry />
            </Box>
          </TabPanel>
        </CardContent>
      </Card>
    </Container>
  );
};

export default SalesEntryTabs;
