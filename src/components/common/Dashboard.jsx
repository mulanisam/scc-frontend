import React, { useState, useEffect, useCallback } from 'react';
import {
    Container,
    Grid,
    Typography,
    Card,
    CardContent,
    CardHeader,
    Divider,
    TextField,
    Box,
    Paper,
    Skeleton,
    Alert,
    Chip,
    LinearProgress,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    TrendingUp,
    TrendingDown,
    MonetizationOn,
    Receipt,
    Pending,
    Inventory,
    Scale,
    Warning,
    Refresh
} from '@mui/icons-material';
import { format, isToday, parseISO } from 'date-fns';
import { fetchDashboardData } from '../service/DashboardService';
import '../css/Dashboard.css';

const Dashboard = () => {
    const [dateTime, setDateTime] = useState(format(new Date(), 'dd MMM yyyy HH:mm:ss'));
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [metrics, setMetrics] = useState({
        todaysSaleAmount: 0,
        todaysPayment: 0,
        todaysPending: 0,
        todaysBirdsSale: 0,
        todaysSaleWeight: 0,
        todaysMortality: 0,
        returnToFarmBirds: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Metric configurations with icons and colors
    const metricConfigs = {
        todaysSaleAmount: {
            label: "Sale Amount",
            icon: <MonetizationOn />,
            color: 'primary',
            format: 'currency'
        },
        todaysPayment: {
            label: "Payment Received",
            icon: <Receipt />,
            color: 'success',
            format: 'currency'
        },
        todaysPending: {
            label: "Payment Pending",
            icon: <Pending />,
            color: 'error',
            format: 'currency'
        },
        todaysBirdsSale: {
            label: "Birds Sold",
            icon: <Inventory />,
            color: 'info',
            format: 'number',
            suffix: ' birds'
        },
        todaysSaleWeight: {
            label: "Sale Weight",
            icon: <Scale />,
            color: 'secondary',
            format: 'decimal',
            suffix: ' kg'
        },
        todaysMortality: {
            label: "Mortality",
            icon: <Warning />,
            color: 'warning',
            format: 'number',
            suffix: ' birds'
        },
        returnToFarmBirds: {
            label: "Return to Farm",
            icon: <TrendingDown />,
            color: 'default',
            format: 'number',
            suffix: ' birds'
        }
    };

    // Update current date/time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setDateTime(format(new Date(), 'dd MMM yyyy HH:mm:ss'));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Fetch dashboard data
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchDashboardData(selectedDate);
            setMetrics(data || {
                todaysSaleAmount: 0,
                todaysPayment: 0,
                todaysPending: 0,
                todaysBirdsSale: 0,
                todaysSaleWeight: 0,
                todaysMortality: 0,
                returnToFarmBirds: 0,
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Failed to load dashboard data. Please try again.');
            setMetrics({
                todaysSaleAmount: 0,
                todaysPayment: 0,
                todaysPending: 0,
                todaysBirdsSale: 0,
                todaysSaleWeight: 0,
                todaysMortality: 0,
                returnToFarmBirds: 0,
            });
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    // Fetch data when date changes
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDateChange = (event) => {
        setSelectedDate(event.target.value);
    };

    const handleRefresh = () => {
        fetchData();
    };

    // Format metric values
    const formatMetricValue = (key, value) => {
        const config = metricConfigs[key];
        const numValue = Number(value) || 0;

        switch (config?.format) {
            case 'currency':
                return `₹${numValue.toLocaleString('en-IN')}`;
            case 'decimal':
                return `${numValue.toFixed(1)}${config.suffix || ''}`;
            case 'number':
                return `${numValue.toLocaleString()}${config.suffix || ''}`;
            default:
                return `${numValue}${config?.suffix || ''}`;
        }
    };

    // Calculate derived metrics
    const collectionRate = metrics.todaysSaleAmount > 0 
        ? ((metrics.todaysPayment / metrics.todaysSaleAmount) * 100)
        : 0;

    const averageRatePerKg = metrics.todaysSaleWeight > 0 
        ? (metrics.todaysSaleAmount / metrics.todaysSaleWeight)
        : 0;

    const mortalityRate = (metrics.todaysBirdsSale + metrics.todaysMortality) > 0 
        ? ((metrics.todaysMortality / (metrics.todaysBirdsSale + metrics.todaysMortality)) * 100)
        : 0;

    const birdsPerKg = metrics.todaysSaleWeight > 0 
        ? (metrics.todaysBirdsSale / metrics.todaysSaleWeight)
        : 0;

    return (
        <Container maxWidth="xl" className="dashboard-container" sx={{ py: 3 }}>
            {/* Header */}
            <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                <Grid container justifyContent="space-between" alignItems="center">
                    <Grid item>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                Dashboard
                            </Typography>
                            <TextField
                                label="Select Date"
                                type="date"
                                value={selectedDate}
                                onChange={handleDateChange}
                                InputLabelProps={{ shrink: true }}
                                size="small"
                                sx={{ minWidth: 180 }}
                            />
                            {isToday(parseISO(selectedDate)) && (
                                <Chip 
                                    label="Today" 
                                    color="primary" 
                                    size="small" 
                                    variant="outlined" 
                                />
                            )}
                            <Tooltip title="Refresh Data">
                                <IconButton 
                                    onClick={handleRefresh} 
                                    disabled={loading}
                                    color="primary"
                                >
                                    <Refresh />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Grid>
                    <Grid item>
                        <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            {dateTime}
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Loading Progress */}
            {loading && <LinearProgress sx={{ mb: 2 }} />}

            {/* Metrics Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {Object.entries(metrics).map(([key, value]) => {
                    const config = metricConfigs[key];
                    return (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={key}>
                            <Card 
                                elevation={3}
                                sx={{ 
                                    height: '100%',
                                    opacity: loading ? 0.7 : 1,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 6
                                    },
                                    borderRadius: 2
                                }}
                            >
                                <CardHeader
                                    avatar={
                                        <Box 
                                            sx={{ 
                                                p: 1, 
                                                borderRadius: '50%', 
                                                bgcolor: `${config.color}.light`,
                                                color: `${config.color}.main`,
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                        >
                                            {config.icon}
                                        </Box>
                                    }
                                    title={config.label}
                                    titleTypographyProps={{ 
                                        variant: 'subtitle1', 
                                        fontWeight: 600,
                                        color: 'text.primary'
                                    }}
                                    sx={{ pb: 1 }}
                                />
                                <CardContent sx={{ pt: 0 }}>
                                    {loading ? (
                                        <Skeleton variant="text" height={40} width="80%" />
                                    ) : (
                                        <Typography 
                                            variant="h4" 
                                            sx={{ 
                                                fontWeight: 700,
                                                color: `${config.color}.main`,
                                                lineHeight: 1.2
                                            }}
                                        >
                                            {formatMetricValue(key, value)}
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Analytics Summary */}
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: 'primary.main' }}>
                    Analytics for {format(parseISO(selectedDate), 'dd MMMM yyyy')}
                </Typography>
                
                <Grid container spacing={4}>
                    {/* Collection Rate */}
                    <Grid item xs={12} sm={6} md={3}>
                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Collection Rate
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                                {collectionRate.toFixed(1)}%
                            </Typography>
                            <LinearProgress 
                                variant="determinate" 
                                value={Math.min(collectionRate, 100)} 
                                sx={{ height: 8, borderRadius: 4 }}
                                color={collectionRate >= 80 ? 'success' : collectionRate >= 60 ? 'warning' : 'error'}
                            />
                        </Box>
                    </Grid>

                    {/* Average Rate per KG */}
                    <Grid item xs={12} sm={6} md={3}>
                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Average Rate/kg
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                                ₹{averageRatePerKg.toFixed(2)}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                                <Typography variant="body2" color="success.main">
                                    Market Rate
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>

                    {/* Mortality Rate */}
                    <Grid item xs={12} sm={6} md={3}>
                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Mortality Rate
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                                {mortalityRate.toFixed(2)}%
                            </Typography>
                            <LinearProgress 
                                variant="determinate" 
                                value={Math.min(mortalityRate, 10) * 10} 
                                sx={{ height: 8, borderRadius: 4 }}
                                color={mortalityRate <= 2 ? 'success' : mortalityRate <= 5 ? 'warning' : 'error'}
                            />
                        </Box>
                    </Grid>

                    {/* Birds per KG */}
                    <Grid item xs={12} sm={6} md={3}>
                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Birds per kg
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 600, color: 'info.main' }}>
                                {birdsPerKg.toFixed(2)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Efficiency Ratio
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>
        </Container>
    );
};

export default Dashboard;
