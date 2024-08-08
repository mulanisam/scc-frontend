import React, { useState } from 'react';
import { Container, Grid, TextField, MenuItem, Typography, Paper, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';

const ReportPage = () => {
  const [reportType, setReportType] = useState('');
  const [subType, setSubType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [showReport, setShowReport] = useState(false);

  const handleSearch = () => {
    // Logic to fetch and generate report data
    setShowReport(true);
  };

  const handleClear = () => {
    setReportType('');
    setSubType('');
    setStartDate('');
    setEndDate('');
    setShowReport(false);
    setReportData(null);
  };

  return (
    <Container>
      <Paper elevation={3} style={{ padding: '16px', marginBottom: '16px' }}>
        <Typography variant="h6">Search Reports</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              label="Report Type"
              select
              fullWidth
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setSubType(''); // Reset subType when reportType changes
              }}
            >
              <MenuItem value="sale">Sale Report</MenuItem>
              <MenuItem value="purchase">Purchase Report</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Sub Type"
              select
              fullWidth
              value={subType}
              onChange={(e) => setSubType(e.target.value)}
              disabled={!reportType} // Disable if no report type is selected
            >
              {reportType === 'sale' && (
                <>
                  <MenuItem value="route">Route Wise</MenuItem>
                  <MenuItem value="customer">Customer Wise</MenuItem>
                  <MenuItem value="vehicle">Vehicle Wise</MenuItem>
                  <MenuItem value="driver">Driver Wise</MenuItem>
                  <MenuItem value="city">City Wise</MenuItem>
                </>
              )}
              {reportType === 'purchase' && (
                <>
                  <MenuItem value="supplier">Supplier Wise</MenuItem>
                  <MenuItem value="all">All Purchase Data</MenuItem>
                </>
              )}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              label="End Date"
              type="date"
              fullWidth
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={2} style={{ display: 'flex', alignItems: 'center' }}>
            <IconButton color="primary" onClick={handleSearch} style={{ marginRight: '8px', width: '40px', height: '40px' }}>
              <SearchIcon fontSize="small" />
            </IconButton>
            <IconButton color="secondary" onClick={handleClear} style={{ marginRight: '8px', width: '40px', height: '40px' }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Grid>
        </Grid>
      </Paper>

      {showReport && (
        <Paper elevation={3} style={{ padding: '16px', marginTop: '16px' }}>
          <Typography variant="h6">Report Results</Typography>
          {/* Display report data in a table format */}
          <div>
            {/* Replace with actual table rendering logic */}
            <pre>{JSON.stringify(reportData, null, 2)}</pre>
          </div>
          <Grid container spacing={2} style={{ marginTop: '16px' }}>
            <Grid item sm={1} style={{ display: 'flex', alignItems: 'center' }}>
              <IconButton color="primary" onClick={() => {/* Logic to download PDF */}} style={{ marginRight: '8px', width: '40px', height: '40px' }}>
                <PictureAsPdfIcon fontSize="small" />
              </IconButton>
              <Typography variant="caption" style={{ marginRight: '8px' }}>PDF</Typography>
            </Grid>
            <Grid item sm={1} style={{ display: 'flex', alignItems: 'center' }}>
              <IconButton color="secondary" onClick={() => {/* Logic to download Excel */}} style={{ marginRight: '8px', width: '40px', height: '40px' }}>
                <DownloadForOfflineIcon fontSize="small" />
              </IconButton>
              <Typography variant="caption">Excel</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Container>
  );
};

export default ReportPage;
