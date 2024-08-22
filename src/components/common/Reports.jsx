import React, { useState, useEffect } from 'react';
import { Container, Grid, TextField, MenuItem, Typography, Paper, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ClearIcon from '@mui/icons-material/Clear';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import { fetchReportData } from '../service/ReportsService'; // Import the service
import { getData } from '../service/MasterDataService';

const ReportPage = () => {
  const [reportType, setReportType] = useState('');
  const [subType, setSubType] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportData, setReportData] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [subTypeId, setSubTypeId] = useState('');
  const [subTypeIdOptions, setSubTypeIdOptions] = useState([]); // Initialize as an empty array


  useEffect(() => {
    if (subType) {
      fetchSubTypeIds(subType);
    }
  }, [subType]);

  const handleReportTypeChange = (e) => {
    setReportType(e.target.value);
    setSubType('');
    setSubTypeId('');
    setSubTypeIdOptions([]); // Clear subtype ID options
    setShowReport(false);
  };

  const handleSubTypeChange = (e) => {
    setSubType(e.target.value);
    setSubTypeId('');
  };

  const fetchSubTypeIds = async (type) => {
    try {
      const data = await getData(type); // Fetch subtype IDs dynamically
      const subTypeData = data.data;
      if (Array.isArray(subTypeData)) {
        const formattedOptions = subTypeData.map(item => ({
            value: item.id,  // Use item.id as the value
            label: item.name ? item.name:item.vehicleNo // Use item.name as the label
        }));
        setSubTypeIdOptions(formattedOptions); // Set formatted options
    } else {
        console.error("Fetched data is not an array:", data);
        setSubTypeIdOptions([]); // Default to empty array if data is not an array
    }
    } catch (error) {
      console.error("Error fetching subtype IDs:", error);
      setSubTypeIdOptions([]); // Default to empty array on error
    }
  };

  const handleSearch = async () => {
    const reportRequest = { reportType, subType, startDate, endDate, subTypeId };
    try {
      const data = await fetchReportData(reportRequest);
      setReportData(data.data); // Assuming the report data is in `data` field
      setShowReport(true);
    } catch (error) {
      console.error("Error fetching report data:", error);
    }
  };

  const handleClear = () => {
    setReportType('');
    setSubType('');
    setSubTypeId('');
    setStartDate('');
    setEndDate('');
    setShowReport(false);
    setReportData(null);
  };

  const sanitizeText = (text) => {
    if (typeof text === 'string') {
      return text.replace(/\r?\n|\r/g, ' ').trim(); // Remove line breaks and extra spaces
    }
    return text;
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: 'landscape', // Use landscape orientation for horizontal layout
      unit: 'mm', // Units in millimeters
      format: 'a4' // Page size A4
    });
    const tableHeaders = getTableHeaders();
    const tableData = reportData.map(row => tableHeaders.map(header => sanitizeText(row[header])));

    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      theme: 'striped',
      styles: {
        cellPadding: 2,
        fontSize: 8, // Adjust font size if necessary
        textColor: [0, 0, 0],
        valign: 'middle',
        halign: 'center',
        overflow: 'linebreak', // Allow text to wrap within cells
      },
      headStyles: {
        cellPadding: 2,
        fontSize: 8,
        textColor: [0, 0, 0],
        valign: 'middle',
        halign: 'center',
        overflow: 'linebreak', // Allow header text to wrap
      },
      margin: { top: 10, bottom: 10, left: 10, right: 10 },
      tableWidth: 'auto', // Set margins to avoid text getting cut off
    });

    doc.save('report.pdf');
  };

  const handleDownloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, 'report.xlsx');
  };

  // Extract table headers dynamically from the report data
  const getTableHeaders = () => {
    if (reportData.length === 0) return [];
    const firstRow = reportData[0];
    return Object.keys(firstRow);
  };

  // Define subtype options based on reportType
  const reportTypeOptions = {
    sale: [
      { value: 'routes', label: 'Route Wise' },
      { value: 'customers', label: 'Customer Wise' },
      { value: 'vehicles', label: 'Vehicle Wise' },
      { value: 'drivers', label: 'Driver Wise' },
      { value: 'cities', label: 'City Wise' },
   
    ],
    purchase: [
      { value: 'supplier', label: 'Supplier Wise' },
      { value: 'all', label: 'All Purchase Data' }
    ]
  };

  return (
    <Container>
      <Paper elevation={3} style={{ padding: '16px', marginBottom: '16px' }}>
        <Typography variant="h6">Search Reports</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={2}>
            <TextField
              label="Report Type"
              select
              fullWidth
              value={reportType}
              onChange={handleReportTypeChange}
            >
              <MenuItem value="sale">Sale Report</MenuItem>
              <MenuItem value="purchase">Purchase Report</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              label="Sub Type"
              select
              fullWidth
              value={subType}
              onChange={handleSubTypeChange}
              disabled={!reportType} // Disable if no report type is selected
            >
              {reportTypeOptions[reportType]?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={2}>
              <TextField
                  label="Subtype ID (Optional)"
                  select
                  fullWidth
                  value={subTypeId}
                  onChange={(e) => setSubTypeId(e.target.value)}
                  disabled={!subType} // Disable if no subtype is selected
              >
                  {subTypeIdOptions.length > 0 ? (
                      subTypeIdOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                              {option.label}
                          </MenuItem>
                      ))
                  ) : (
                      <MenuItem disabled>No options available</MenuItem>
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
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {getTableHeaders().map(header => (
                    <TableCell key={header}>
                      <TableSortLabel>{header}</TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.map((row, index) => (
                  <TableRow key={index}>
                    {getTableHeaders().map(header => (
                      <TableCell key={header}>
                        {row[header]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Grid container spacing={2} style={{ marginTop: '16px' }}>
            <Grid item sm={1} style={{ display: 'flex', alignItems: 'center' }}>
              <IconButton color="primary" onClick={handleDownloadPdf} style={{ marginRight: '8px', width: '40px', height: '40px' }}>
                <PictureAsPdfIcon fontSize="small" />
              </IconButton>
              <Typography variant="caption" style={{ marginRight: '8px' }}>PDF</Typography>
            </Grid>
            <Grid item sm={1} style={{ display: 'flex', alignItems: 'center' }}>
              <IconButton color="secondary" onClick={handleDownloadExcel} style={{ marginRight: '8px', width: '40px', height: '40px' }}>
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
