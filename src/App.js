import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import theme from './theme/theme';

// Components
import Navbar from './components/common/Navbar';
import LoginPage from './components/auth/LoginPage';
import RegistrationPage from './components/auth/RegistrationPage';
import FooterComponent from './components/common/Footer';
import UserService from './components/service/UserService';
import UpdateUser from './components/userspage/UpdateUser';
import UserManagementPage from './components/userspage/UserManagementPage';
import Reports from './components/common/Reports';
import SalesEntry from './components/sale/SalesEntry';
import PurchaseEntryPage from './components/purchase/PurchaseEntry';
import MasterData from './components/masterData/MasterData';
import Dashboard from './components/common/Dashboard';
import TradingPage from './components/trading/TradingPage';
import DriverSalesPage from './components/sale/DriverSalesPage';
import CustomerLedgerView from './components/ledger/CustomerLedgerView';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDriver, setIsDriver] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = UserService.isAuthenticated();
      const admin = UserService.adminOnly();
      const driver = UserService.isDriver();
      
      console.log('App auth check:', { authenticated, admin, driver }); // Debug log
      
      setIsAuthenticated(authenticated);
      setIsAdmin(admin);
      setIsDriver(driver);
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Box sx={{ 
          height: '100vh', 
          width: '100vw',
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Fixed Navbar */}
          <Box sx={{ 
            flexShrink: 0,
            height: 64,
            zIndex: (theme) => theme.zIndex.appBar
          }}>
            <Navbar />
          </Box>
          
          {/* Main Content Area */}
          <Box 
            component="main" 
            sx={{ 
              flexGrow: 1,
              height: 'calc(100vh - 64px - 56px)',
              overflow: 'auto',
              bgcolor: 'background.default'
            }}
          >
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={
                isAuthenticated ? (
                  isDriver ? <Navigate to="/driver-sales" replace /> : <Navigate to="/dashboard" replace />
                ) : <Navigate to="/login" replace />
              } />
              
              <Route path="/login" element={
                !isAuthenticated ? <LoginPage /> : (
                  isDriver ? <Navigate to="/driver-sales" replace /> : <Navigate to="/dashboard" replace />
                )
              } />
              
              <Route path="/register" element={
                !isAuthenticated ? <RegistrationPage /> : (
                  isDriver ? <Navigate to="/driver-sales" replace /> : <Navigate to="/dashboard" replace />
                )
              } />

              {/* Driver Routes */}
              <Route path="/driver-sales" element={
                isAuthenticated && isDriver ? (
                  <DriverSalesPage />
                ) : (
                  <Navigate to="/login" replace />
                )
              } />

              {/* Regular User/Admin Routes */}
              {isAuthenticated && !isDriver && (
                <>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/sale" element={<SalesEntry />} />
                  <Route path="/purchase" element={<PurchaseEntryPage />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/ledger" element={<CustomerLedgerView />} />
                  <Route path="/master-data" element={<MasterData />} />
                  
                  {/* Admin Routes */}
                  {isAdmin && (
                    <>
                      <Route path="/trading" element={<TradingPage />} />
                      <Route path="/admin/user-management" element={<UserManagementPage />} />
                      <Route path="/admin/update-user/:userId" element={<UpdateUser />} />
                    </>
                  )}
                </>
              )}

              {/* Fallback Route */}
              <Route path="*" element={
                <Navigate to={
                  isAuthenticated ? (
                    isDriver ? "/driver-sales" : "/dashboard"
                  ) : "/login"
                } replace />
              } />
            </Routes>
          </Box>

          {/* Fixed Footer */}
          <Box sx={{ 
            flexShrink: 0,
            height: 56,
            zIndex: (theme) => theme.zIndex.appBar - 1
          }}>
            <FooterComponent />
          </Box>
        </Box>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
