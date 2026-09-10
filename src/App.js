import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import theme from './theme/theme';

import { AuthProvider, useAuth } from './auth/AuthContext';

// Components
import Navbar from './components/common/Navbar';
import LoginPage from './components/auth/LoginPage';
import RegistrationPage from './components/auth/RegistrationPage';
import FooterComponent from './components/common/Footer';
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

/** Where a signed-in user belongs when they hit a route they shouldn't. */
const useHomePath = () => {
  const { isAuthenticated, isDriver } = useAuth();
  if (!isAuthenticated) return '/login';
  return isDriver ? '/driver-sales' : '/dashboard';
};

/**
 * Route guard. `allow` receives the auth state and returns whether this user
 * may see the route; anyone else is sent to their own home page.
 */
const RequireAuth = ({ allow, children }) => {
  const auth = useAuth();
  const home = useHomePath();

  if (!auth.isAuthenticated) return <Navigate to="/login" replace />;
  if (allow && !allow(auth)) return <Navigate to={home} replace />;
  return children;
};

/** Login/register are only for signed-out visitors. */
const RedirectIfAuthed = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const home = useHomePath();
  return isAuthenticated ? <Navigate to={home} replace /> : children;
};

const isOfficeUser = ({ isDriver }) => !isDriver;
const isAdminUser = ({ isAdmin }) => isAdmin;

const AppRoutes = () => {
  const home = useHomePath();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={home} replace />} />

      <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />

      {/* Creating users is an admin action, reached from User Management.
          This was previously signed-out-only, so an admin following the
          "Add User" link was redirected straight back to their dashboard and
          could never actually add anyone. The API now requires ADMIN here too. */}
      <Route path="/register" element={<RequireAuth allow={isAdminUser}><RegistrationPage /></RequireAuth>} />

      {/* Drivers */}
      <Route
        path="/driver-sales"
        element={
          <RequireAuth allow={({ isDriver }) => isDriver}>
            <DriverSalesPage />
          </RequireAuth>
        }
      />

      {/* Office staff and admins */}
      <Route path="/dashboard" element={<RequireAuth allow={isOfficeUser}><Dashboard /></RequireAuth>} />
      <Route path="/sale" element={<RequireAuth allow={isOfficeUser}><SalesEntry /></RequireAuth>} />
      <Route path="/purchase" element={<RequireAuth allow={isOfficeUser}><PurchaseEntryPage /></RequireAuth>} />
      <Route path="/reports" element={<RequireAuth allow={isOfficeUser}><Reports /></RequireAuth>} />
      <Route path="/ledger" element={<RequireAuth allow={isOfficeUser}><CustomerLedgerView /></RequireAuth>} />
      <Route path="/master-data" element={<RequireAuth allow={isOfficeUser}><MasterData /></RequireAuth>} />

      {/* Admin only */}
      <Route path="/trading" element={<RequireAuth allow={isAdminUser}><TradingPage /></RequireAuth>} />
      <Route
        path="/admin/user-management"
        element={<RequireAuth allow={isAdminUser}><UserManagementPage /></RequireAuth>}
      />
      <Route
        path="/admin/update-user/:userId"
        element={<RequireAuth allow={isAdminUser}><UpdateUser /></RequireAuth>}
      />

      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
};

const AppShell = () => (
  // `width: 100%` rather than 100vw: 100vw ignores the vertical scrollbar and
  // produces a spurious horizontal one.
  <Box sx={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <Box sx={{ flexShrink: 0, zIndex: (t) => t.zIndex.appBar }}>
      <Navbar />
    </Box>

    {/* Sized by flex rather than `calc(100vh - 64px - 56px)`, so the header
        and footer can change height without breaking the layout. */}
    <Box component="main" sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto', bgcolor: 'background.default' }}>
      <AppRoutes />
    </Box>

    <Box sx={{ flexShrink: 0, zIndex: (t) => t.zIndex.appBar - 1 }}>
      <FooterComponent />
    </Box>
  </Box>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
