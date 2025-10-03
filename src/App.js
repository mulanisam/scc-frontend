import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(UserService.isAuthenticated());
      setIsAdmin(UserService.adminOnly());
    };

    checkAuth();

    // Add an event listener to update the authentication status on storage change
    window.addEventListener('storage', checkAuth);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  return (
    <BrowserRouter>
      <div className="App">
        <Navbar />
        <div className="content">
          <Routes>
            <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/login" element={<LoginPage />} />
            {isAuthenticated && (
              <>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/sale" element={<SalesEntry />} />
                <Route path="/purchase" element={<PurchaseEntryPage />} />
                <Route path="/master-data" element={<MasterData />} />
                {isAdmin && (
                  <>
                    <Route path="/register" element={<RegistrationPage />} />
                    <Route path="/admin/user-management" element={<UserManagementPage />} />
                    <Route path="/update-user/:userId" element={<UpdateUser />} />
                  </>
                )}
              </>
            )}
            <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
          </Routes>
        </div>
        <FooterComponent />
      </div>
    </BrowserRouter>
  );
}

export default App;
