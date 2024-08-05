import React from 'react';
import { Link } from 'react-router-dom';
import UserService from '../service/UserService';

function Navbar() {
    
    const isAuthenticated = UserService.isAuthenticated();
    //const isAdmin = UserService.isAdmin();
console.log("isAuthenticated",isAuthenticated);
    const handleLogout = () => {
        const confirmLogout = window.confirm('Are you sure you want to logout this user?');
        if (confirmLogout) {
            UserService.logout();
            window.location.href = '/'; // Redirect to the homepage after logging out
        }
    };


    return (
        <nav>
            <ul>
                {!isAuthenticated && <li><Link to="/">Chicken Xpress</Link></li>}
                {isAuthenticated && <li><Link to="/sale">Sale</Link></li>}
                {isAuthenticated && <li><Link to="/purchase">Purchase</Link></li>}
                {isAuthenticated && <li><Link to="/master-data">Masters</Link></li>}
                {isAuthenticated && <li><Link to="/profile">Profile</Link></li>}
                {/* {isAdmin && <li><Link to="/admin/user-management">User Management</Link></li>} */}
                {isAuthenticated && <li><Link to="/" onClick={handleLogout}>Logout</Link></li>}
            </ul>
        </nav>
    );
}

export default Navbar;
