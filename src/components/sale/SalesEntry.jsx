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
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && children}
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
    <Box sx={{ 
      height: '85vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* <Container maxWidth="xl" sx={{ mt: 4, mb: 2, flexShrink: 0 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h4" gutterBottom>
            Sales & Payment Entry
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose your preferred entry method from the tabs below
          </Typography>
        </Box>
      </Container> */}

      <Container maxWidth="xl" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', pb: 2 }}>
        <Card elevation={3} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              aria-label="sales entry tabs"
              variant="fullWidth"
              sx={{
                bgcolor: 'background.paper',
                '& .MuiTab-root': {
                  minHeight: 0,
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

          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
            <TabPanel value={activeTab} index={0}>
              <BulkSalesEntry />
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                <SingleSaleEntry />
              </Box>
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                <PaymentEntry />
              </Box>
            </TabPanel>
          </Box>
        </Card>
      </Container>
    </Box>
  );
};

export default SalesEntryTabs;
