import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  ShoppingCart as SaleIcon,
  ShoppingBasket as PurchaseIcon,
  TrendingUp as TradingIcon,
  Storage as MasterIcon,
  Assessment as ReportsIcon,
  Logout as LogoutIcon,
  Person as ProfileIcon,
  Business as CompanyIcon,
  LocalShipping as DriverIcon,
  AccountBalanceWallet as LedgerIcon
} from '@mui/icons-material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import UserService from '../service/UserService';
import { getCompanyConfig } from '../../config/companyConfig';

function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get company configuration
  const companyConfig = getCompanyConfig();

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = UserService.isAuthenticated();
      const admin = UserService.adminOnly();
      const driver = UserService.isDriver();
      
      console.log('Navbar auth check:', { authenticated, admin, driver }); // Debug log
      
      setIsAuthenticated(authenticated);
      setIsAdmin(admin);
      setIsDriver(driver);
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm('Are you sure you want to logout?');
    if (confirmLogout) {
      UserService.logout();
      localStorage.clear();
      
      setIsAuthenticated(false);
      setIsAdmin(false);
      setIsDriver(false);
      
      window.dispatchEvent(new Event('storage'));
      navigate('/login', { replace: true });
    }
    handleProfileMenuClose();
  };

  // Define navigation items based on roles
  const getNavItems = () => {
    if (isDriver) {
      return [
        { name: 'Driver Sales', path: '/driver-sales', icon: <DriverIcon />, auth: true }
      ];
    }
    
    // Regular user and admin items
    const items = [
      { name: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, auth: true },
      { name: 'Sales', path: '/sale', icon: <SaleIcon />, auth: true },
      { name: 'Purchase', path: '/purchase', icon: <PurchaseIcon />, auth: true },
      { name: 'Ledger', path: '/ledger', icon: <LedgerIcon />, auth: true },
      { name: 'Masters', path: '/master-data', icon: <MasterIcon />, auth: true },
      { name: 'Reports', path: '/reports', icon: <ReportsIcon />, auth: true }
    ];

    // Add admin-only items
    if (isAdmin) {
      items.push(
        { name: 'Trading', path: '/trading', icon: <TradingIcon />, auth: true, admin: true }
      );
    }

    return items;
  };

  const navItems = getNavItems();

  const drawer = (
    <Box sx={{ width: 280, height: '100%', bgcolor: 'primary.main' }}>
      <Box sx={{ p: 2, bgcolor: 'primary.dark', display: 'flex', alignItems: 'center', gap: 1 }}>
        <CompanyIcon sx={{ color: 'white', fontSize: 24 }} />
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
          {companyConfig.name}
        </Typography>
      </Box>
      <Divider />
      <List sx={{ pt: 2 }}>
        {navItems.map((item) => {
          if (item.auth && !isAuthenticated) return null;
          if (item.admin && !isAdmin) return null;

          const isActive = location.pathname === item.path;
          
          return (
            <ListItem key={item.name} disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                sx={{
                  mx: 1,
                  borderRadius: 2,
                  mb: 0.5,
                  bgcolor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                }}
              >
                <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.name} 
                  sx={{ '& .MuiTypography-root': { color: 'white', fontWeight: 500 } }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
        
        {isAuthenticated && (
          <>
            <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />
            <ListItem disablePadding>
              <ListItemButton 
                onClick={handleLogout} 
                sx={{ 
                  mx: 1, 
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                }}
              >
                <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Logout" 
                  sx={{ '& .MuiTypography-root': { color: 'white', fontWeight: 500 } }}
                />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );

  if (!isAuthenticated) {
    return (
      <AppBar position="static" elevation={0} sx={{ height: 64 }}>
        <Toolbar sx={{ height: 64 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CompanyIcon sx={{ fontSize: 28, color: 'white' }} />
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700,
                color: 'white',
                fontSize: { xs: '1.2rem', md: '1.5rem' },
                letterSpacing: '0.5px'
              }}
            >
              {isMobile ? companyConfig.shortName : companyConfig.name}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>
    );
  }

  return (
    <>
      <AppBar position="static" elevation={2} sx={{ height: 64, zIndex: theme.zIndex.appBar }}>
        <Toolbar sx={{ height: 64 }}>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          {/* Company Name - Left Side with Icon */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <CompanyIcon sx={{ fontSize: 28, color: 'white' }} />
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700,
                color: 'white',
                fontSize: { xs: '1.2rem', md: '1.5rem' },
                letterSpacing: '0.5px'
              }}
            >
              {isMobile ? companyConfig.shortName : companyConfig.name}
            </Typography>
            
            {/* Show user role indicator */}
            {isDriver && (
              <Typography variant="body2" sx={{ 
                color: 'rgba(255,255,255,0.8)', 
                ml: 1, 
                fontSize: '0.8rem' 
              }}>
                (Driver)
              </Typography>
            )}
          </Box>

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {navItems.map((item) => {
                if (item.auth && !isAuthenticated) return null;
                if (item.admin && !isAdmin) return null;

                const isActive = location.pathname === item.path;
                
                return (
                  <Button
                    key={item.name}
                    component={Link}
                    to={item.path}
                    color="inherit"
                    startIcon={item.icon}
                    sx={{
                      borderRadius: 2,
                      px: 2,
                      bgcolor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                    }}
                  >
                    {item.name}
                  </Button>
                );
              })}
            </Box>
          )}

          <IconButton
            color="inherit"
            onClick={handleProfileMenuOpen}
            sx={{ ml: 1 }}
          >
            <ProfileIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
      >
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 280,
            bgcolor: 'primary.main'
          }
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
}

export default Navbar;
