import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import UserService from '../service/UserService';

function Navbar() {
    
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    //const isAdmin = UserService.isAdmin();
    useEffect(() => {
        const handleStorageChange = () => {
            setIsAuthenticated(UserService.isAuthenticated());
        };
        window.addEventListener('storage', handleStorageChange);

        // Clean up event listener on component unmount
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);
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
