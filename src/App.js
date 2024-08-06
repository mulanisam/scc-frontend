// App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from './components/common/Navbar';
import FooterComponent from './components/common/Footer';
import LoginPage from './components/auth/LoginPage';
import RegistrationPage from './components/auth/RegistrationPage';
import UserManagementPage from './components/userspage/UserManagementPage';
import UpdateUser from './components/userspage/UpdateUser';
import ProfilePage from './components/userspage/ProfilePage';
import SalesEntry from './components/sale/SalesEntry';
import PurchaseEntryPage from './components/purchase/PurchaseEntry';
import MasterData from './components/masterData/MasterData';
import Dashboard from './components/dashboard/Dashboard'; // New Dashboard component
import UserService from './components/service/UserService'; // Ensure UserService is correctly implemented

function App() {
  const isAuthenticated = UserService.isAuthenticated(); // Assuming you have an authentication check method
  const isAdmin = UserService.isAdmin(); // Assuming you have an admin check method

  return (
    <BrowserRouter>
      <div className="App">
        <Navbar />
        <div className="content">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={isAdmin ? <RegistrationPage /> : <Navigate to="/" />} />

            {/* Protected routes */}
            {isAuthenticated && (
              <>
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/sale" element={<SalesEntry />} />
                <Route path="/purchase" element={<PurchaseEntryPage />} />
                <Route path="/master-data" element={<MasterData />} />
                
                {isAdmin && (
                  <>
                    <Route path="/admin/user-management" element={<UserManagementPage />} />
                    <Route path="/update-user/:userId" element={<UpdateUser />} />
                  </>
                )}
              </>
            )}

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
        <FooterComponent />
      </div>
    </BrowserRouter>
  );
}

export default App;
