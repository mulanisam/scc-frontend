import React, { useState, useEffect } from 'react';
import {
    Container,
    Grid,
    Typography,
    Card,
    CardContent,
    CardHeader,
    Divider,
} from '@mui/material';
import { format } from 'date-fns';
import { fetchDashboardData } from '../service/DashboardService';
import '../css/Dashboard.css'; // Ensure this path is correct

const Dashboard = () => {
    const [dateTime, setDateTime] = useState(format(new Date(), 'dd MMM yyyy HH:mm:ss'));
    const [metrics, setMetrics] = useState({
        todaysSales: 0,
        pendingAmount: 0,
        balanceRecovery: 0,
        totalBalance: 0,
        maxPending: 0,
        monthlySale: 0,
        dieselDaily: 0,
        dieselMonthly: 0,
        driverExpenses: 0,
        monthlyDriverExpenses: 0,
        farmBirds: 0,
        saleFromFarm: 0,
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setDateTime(format(new Date(), 'dd MMM yyyy HH:mm:ss'));
        }, 1000); // Update every second

        return () => clearInterval(interval); // Clean up interval on component unmount
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await fetchDashboardData();
                setMetrics(data);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            }
        };

        fetchData();
    }, []);

    return (
        <Container className="dashboard-container">
            <Grid container justifyContent="flex-end">
                <Typography variant="h6" className="datetime">
                    {dateTime}
                </Typography>
            </Grid>
            <Grid container spacing={3}>
                {Object.entries(metrics).map(([key, value]) => (
                    <Grid item xs={12} sm={6} md={3} key={key}>
                        <Card className="dashboard-card">
                            <CardHeader
                                title={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                className="card-header"
                            />
                            <Divider />
                            <CardContent className="card-content">
                                <Typography variant="h5">
                                    ₹ {value}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
};

export default Dashboard;
