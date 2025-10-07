import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  MenuItem,
  Grid,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  LocationCity as CityIcon,
  AdminPanelSettings as AdminIcon,
  Visibility,
  VisibilityOff,
  PersonAdd as RegisterIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import UserService from '../service/UserService';

function RegistrationPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    city: ''
  });

  const roles = [
    { value: 'USER', label: 'User' },
    { value: 'ADMIN', label: 'Admin' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      await UserService.register(formData, token);
      
      setFormData({
        name: '',
        email: '',
        password: '',
        role: '',
        city: ''
      });
      
      setSuccess('User registered successfully!');
      setTimeout(() => {
        navigate('/admin/user-management');
      }, 2000);
      
    } catch (error) {
      console.error('Error registering user:', error);
      setError(error.message || 'An error occurred while registering user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={8} sx={{ p: 4, borderRadius: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ 
            fontWeight: 700, 
            color: 'primary.main',
            mb: 1
          }}>
            User Registration
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create a new user account
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="primary" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="primary" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="primary" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="City"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CityIcon color="primary" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AdminIcon color="primary" />
                    </InputAdornment>
                  )
                }}
              >
                {roles.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={<RegisterIcon />}
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                  fontSize: '1.1rem'
                }}
              >
                {loading ? 'Registering...' : 'Register User'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}

export default RegistrationPage;
