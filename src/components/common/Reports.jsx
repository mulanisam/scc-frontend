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
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
  
    const companyName = "SOHEL CHICKEN CENTRE"; 
    const companyAddress = "Madha, Solapur, Maharashtra-413209"; 
    const contactNumber = "Contact: +91 8605030099"; 
    const reportName = `${reportType} ${subType} Report`; 
    const dateRange = `Statement Date Range: ${startDate} - ${endDate}`; 
    const generationDate = `Report Generated on: ${new Date().toLocaleDateString()}`;

    if (reportData.length > 0) {
       
        const { ROUTE, VEHICLE, DRIVER } = reportData[0];
        const routeText = ROUTE || 'N/A';
        const vehicleText = VEHICLE || 'N/A';
        const driverText = DRIVER || 'N/A';

        // Calculate the right side position based on page width
        const pageWidth = doc.internal.pageSize.getWidth();
        const rightX = pageWidth - 10; // Margin of 10mm

        // Add the header with the report details on the left and company details on the right
        doc.setFontSize(14);
        doc.text(reportName, 10, 10);
        doc.setFontSize(10);
        doc.text(dateRange, 10, 15);
        doc.text(generationDate, 10, 20);

        // Display Route, Vehicle, and Driver information in one line
        doc.setFontSize(10);
        doc.text(`Route: ${routeText}    Vehicle: ${vehicleText}    Driver: ${driverText}`, 10, 25);
      
        doc.setFontSize(14);
        doc.text(companyName, rightX, 10, { align: 'right' });
        doc.setFontSize(10);
        doc.text(companyAddress, rightX, 15, { align: 'right' });
        doc.text(contactNumber, rightX, 20, { align: 'right' });
      
        // Filter out the first three columns (Route, Vehicle, Driver) from the table headers and data
        const tableHeaders = getTableHeaders().filter(header => !['ROUTE', 'VEHICLE', 'DRIVER', 'RATE'].includes(header));        
        // const tableData = reportData.map((row) =>
        //   tableHeaders.map((header) => sanitizeText(row[header]))
        // );
        const tableDataWithTotals = [
          ...reportData.map(row =>
            tableHeaders.map(header => sanitizeText(row[header]))
          ),
          // Totals row
          getTableHeaders().filter(header => !['ROUTE', 'VEHICLE', 'DRIVER', 'RATE'].includes(header)).map(header =>
            header === 'TOTAL' ? 'Totals' : typeof reportData[0][header] === 'number' ? calculateTotals()[header] : ''
          ),
        ];
        autoTable(doc, {
          head: [tableHeaders],
          body: tableDataWithTotals,
          theme: 'striped',
          styles: {
            cellPadding: 2,
            fontSize: 8,
            textColor: [0, 0, 0],
            valign: 'middle',
            halign: 'center',
            overflow: 'linebreak',
          },
          headStyles: {
            cellPadding: 2,
            fontSize: 8,
            textColor: [0, 0, 0],
            valign: 'middle',
            halign: 'center',
            overflow: 'linebreak',
          },
          margin: { top: 30, bottom: 10, left: 10, right: 10 }, // Adjust top margin to fit header
          didDrawPage: (data) => {
            // Re-draw the header on each page
            doc.setFontSize(14);
            doc.text(reportName, data.settings.margin.left, 10);
            doc.setFontSize(10);
            doc.text(dateRange, data.settings.margin.left, 15);
            doc.text(generationDate, data.settings.margin.left, 20);

            // Re-draw Route, Vehicle, Driver information in one line on each page
            doc.setFontSize(10);
            doc.text(`Route: ${routeText}    Vehicle: ${vehicleText}    Driver: ${driverText}`, data.settings.margin.left, 25);
        
            doc.setFontSize(14);
            doc.text(companyName, rightX, 10, { align: 'right' });
            doc.setFontSize(10);
            doc.text(companyAddress, rightX, 15, { align: 'right' });
            doc.text(contactNumber, rightX, 20, { align: 'right' });
          },
          tableWidth: 'auto',
        });
      
        doc.save(`${reportName.replace(/ /g, '_')}.pdf`);
    } else {
        console.error("reportData is empty");
    }
};

  const handleDownloadExcel = () => {
    const tableHeaders = getTableHeaders().filter(header => !['ROUTE', 'VEHICLE', 'DRIVER', 'RATE'].includes(header));        
        const tableData = reportData.map((row) =>
          tableHeaders.map((header) => sanitizeText(row[header]))
        );
    const ws = XLSX.utils.json_to_sheet(tableData);
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
  // const calculateTotals = () => {
  //   const totals = {};
  //   reportData.forEach(row => {
  //     getTableHeaders().forEach(header => {
  //       if (typeof row[header] === 'number') {
  //         totals[header] = (totals[header] || 0) + row[header];
  //       }
  //     });
  //   });
  //   return totals;
  // };
  const calculateTotals = () => {
    const totals = {};
    reportData.forEach(row => {
      getTableHeaders().forEach(header => {
        console.log("Header",header);
        if (
          header !== 'BALANCE PENDING' && 
          typeof row[header] === 'number' && 
          !isNaN(row[header])
        ) {
          totals[header] = (totals[header] || 0) + row[header];
        }
      });
    });
    return totals;
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
                 <TableRow>
                    {getTableHeaders().map(header => (
                      <TableCell key={header} align={typeof reportData[0][header] === 'number' ? 'right' : 'left'}>
                        {header === 'TOTAL' ? 'Totals' : typeof reportData[0][header] === 'number' ? calculateTotals()[header] : ''}
                      </TableCell>
                    ))}
                  </TableRow>
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
