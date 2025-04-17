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
        todaysSaleAmount: 0,
        todaysPayment: 0,
        todaysPending: 0,
        todaysBirdsSale: 0,
        todaysSaleWeight: 0,
        todaysMortality: 0,
        returnToFarmBirds: 0,
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
