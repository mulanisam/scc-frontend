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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(UserService.isAuthenticated());
      setIsAdmin(UserService.adminOnly());
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        {/* **FIXED: Perfect Screen Fit Layout** */}
        <Box sx={{ 
          height: '100vh', 
          width: '100vw',
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden' // Prevent page-level scroll
        }}>
          {/* Fixed Navbar - 64px height */}
          <Box sx={{ 
            flexShrink: 0,
            height: 64,
            zIndex: (theme) => theme.zIndex.appBar
          }}>
            <Navbar />
          </Box>
          
          {/* Main Content Area - Takes remaining space */}
          <Box 
            component="main" 
            sx={{ 
              flexGrow: 1,
              height: 'calc(100vh - 64px - 56px)', // Total height - navbar - footer
              overflow: 'auto', // Only content scrolls
              bgcolor: 'background.default'
            }}
          >
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
              } />
              <Route path="/login" element={
                !isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />
              } />
              <Route path="/register" element={
                !isAuthenticated ? <RegistrationPage /> : <Navigate to="/dashboard" replace />
              } />

              {/* Protected Routes */}
              {isAuthenticated && (
                <>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/sale" element={<SalesEntry />} />
                  <Route path="/purchase" element={<PurchaseEntryPage />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/master-data" element={<MasterData />} />
                  
                  {/* Admin Routes */}
                  {isAdmin && (
                    <>
                      <Route path="/trading" element={<TradingPage />} />
                      <Route path="/admin/user-management" element={<UserManagementPage />} />
                      <Route path="/admin/update-user/:userId" element={<UpdateUser />} />
                      <Route path="/register" element={<RegistrationPage />} />
                    </>
                  )}
                </>
              )}

              {/* Fallback Route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Box>

          {/* Fixed Footer - 56px height */}
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
