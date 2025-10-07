import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  TextField, 
  MenuItem, 
  Autocomplete, 
  Typography, 
  Paper, 
  IconButton, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  TableSortLabel,
  Box,
  Button,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Tooltip,
  CircularProgress,
  Alert,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Download as DownloadIcon,
  Assessment as ReportsIcon,
  CalendarToday as DateIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { fetchReportData } from '../service/ReportsService';
import { getData } from '../service/MasterDataService';
import { getCompanyConfig } from '../../config/companyConfig';

const ReportPage = () => {
  const [reportType, setReportType] = useState('');
  const [subType, setSubType] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportData, setReportData] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [subTypeId, setSubTypeId] = useState('');
  const [subTypeIdOptions, setSubTypeIdOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (subType) {
      fetchSubTypeIds(subType);
    }
  }, [subType]);

  const handleReportTypeChange = (e) => {
    setReportType(e.target.value);
    setSubType('');
    setSubTypeId('');
    setSubTypeIdOptions([]);
    setShowReport(false);
    setError('');
  };

  const handleSubTypeChange = (e) => {
    setSubType(e.target.value);
    setSubTypeId('');
    setError('');
  };

  const fetchSubTypeIds = async (type) => {
    try {
      const data = await getData(type);
      const subTypeData = data.data;
      if (Array.isArray(subTypeData)) {
        const formattedOptions = subTypeData.map(item => ({
          value: item.id,
          label: item.name || item.vehicleNo || item.shopName || `${item.name || 'Unknown'}`
        }));
        setSubTypeIdOptions(formattedOptions);
      } else {
        console.error("Fetched data is not an array:", data);
        setSubTypeIdOptions([]);
      }
    } catch (error) {
      console.error("Error fetching subtype IDs:", error);
      setSubTypeIdOptions([]);
    }
  };

  const handleSearch = async () => {
    if (!reportType || !subType) {
      setError('Please select both Report Type and Sub Type');
      return;
    }
    
    setLoading(true);
    setGenerating(true);
    setError('');
    const reportRequest = { reportType, subType, startDate, endDate, subTypeId };
    
    try {
      const data = await fetchReportData(reportRequest);
      setReportData(data.data);
      setShowReport(true);
      if (!data.data || data.data.length === 0) {
        setError('No data found for the selected criteria');
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
      setError('Error generating report. Please try again.');
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  const handleClear = () => {
    setReportType('');
    setSubType('');
    setSubTypeId('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate(new Date().toISOString().slice(0, 10));
    setShowReport(false);
    setReportData(null);
    setSubTypeIdOptions([]);
    setError('');
  };

  const sanitizeText = (text) => {
    if (typeof text === 'string') {
      return text.replace(/\r?\n|\r/g, ' ').trim();
    }
    return text;
  };

  const handleDownloadPdf = () => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Get company configuration
  const companyConfig = getCompanyConfig();
  
  const companyName = companyConfig.name;
  const companyAddress = companyConfig.address;
  const contactNumber = `Contact: ${companyConfig.contactNumber}`;
  const reportName = `${reportType.toUpperCase()} ${subType.toUpperCase()} Report`;
  const dateRange = `Date Range: ${startDate} to ${endDate}`;
  const generationDate = `Generated: ${new Date().toLocaleDateString()}`;

  if (reportData && reportData.length > 0) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const rightX = pageWidth - 10;

    // Header
    doc.setFontSize(14);
    doc.text(reportName, 10, 10);
    doc.setFontSize(10);
    doc.text(dateRange, 10, 15);
    doc.text(generationDate, 10, 20);

    doc.setFontSize(14);
    doc.text(companyName, rightX, 10, { align: 'right' });
    doc.setFontSize(10);
    doc.text(companyAddress, rightX, 15, { align: 'right' });
    doc.text(contactNumber, rightX, 20, { align: 'right' });

    const tableHeaders = getTableHeaders();
    const tableData = reportData.map(row =>
      tableHeaders.map(header => sanitizeText(row[header]))
    );

    // Add totals row
    const totalsRow = tableHeaders.map(header => {
      const totals = calculateTotals();
      if (header.includes('NAME') || header.includes('SUPPLIER')) return 'TOTALS';
      return typeof reportData[0][header] === 'number' ? (totals[header] || '') : '';
    });
    tableData.push(totalsRow);

    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
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
        textColor: [255, 255, 255],
        fillColor: [21, 101, 192],
        valign: 'middle',
        halign: 'center',
      },
      margin: { top: 30, bottom: 10, left: 10, right: 10 },
      tableWidth: 'auto',
    });

    doc.save(`${reportName.replace(/ /g, '_')}.pdf`);
  }
};


  const handleDownloadExcel = () => {
    if (!reportData || reportData.length === 0) return;

    const tableHeaders = getTableHeaders();
    const tableData = reportData.map(row => {
      const excelRow = {};
      tableHeaders.forEach(header => {
        excelRow[header] = sanitizeText(row[header]);
      });
      return excelRow;
    });

    // Add totals row
    const totals = calculateTotals();
    const totalsRow = {};
    tableHeaders.forEach(header => {
      if (header.includes('NAME') || header.includes('SUPPLIER')) {
        totalsRow[header] = 'TOTALS';
      } else if (typeof reportData[0]?.[header] === 'number') {
        totalsRow[header] = totals[header] || 0;
      } else {
        totalsRow[header] = '';
      }
    });
    tableData.push(totalsRow);

    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${reportType}_${subType}_report.xlsx`);
  };

  const getTableHeaders = () => {
    if (!reportData || reportData.length === 0) return [];
    return Object.keys(reportData[0]);
  };

  const calculateTotals = () => {
    if (!reportData || reportData.length === 0) return {};
    
    const totals = {};
    reportData.forEach(row => {
      getTableHeaders().forEach(header => {
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
      { value: 'all', label: 'All Purchase Data' },
      { value: 'vehicle', label: 'Vehicle Wise' },
      { value: 'driver', label: 'Driver Wise' }
    ]
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Fixed Header Section */}
      <Box sx={{ flexShrink: 0 }}>
        <Container maxWidth="xl" sx={{ py: 2 }}>
          

          {/* Report Parameters */}
          <Card elevation={3} sx={{ mb: 2, borderRadius: 2 }}>
            <CardHeader 
              title="Report Parameters" 
              action={
                <Chip 
                  label={reportData ? `${reportData.length} Records` : 'No Data'}
                  color={reportData && reportData.length > 0 ? 'success' : 'default'}
                  size="small"
                />
              }
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                py: 1,
                '& .MuiCardHeader-title': { fontWeight: 600, fontSize: '0.9rem', color: 'white' }
              }}
            />
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    label="Report Type"
                    select
                    fullWidth
                    value={reportType}
                    onChange={handleReportTypeChange}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FilterIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  >
                    <MenuItem value=""><em>Select Type</em></MenuItem>
                    <MenuItem value="sale">Sales Report</MenuItem>
                    <MenuItem value="purchase">Purchase Report</MenuItem>
                  </TextField>
                </Grid>
                
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    label="Sub Type"
                    select
                    fullWidth
                    value={subType}
                    onChange={handleSubTypeChange}
                    disabled={!reportType}
                    size="small"
                  >
                    <MenuItem value=""><em>Select Sub Type</em></MenuItem>
                    {reportTypeOptions[reportType]?.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {subType && subType !== 'all' && (
                  <Grid item xs={12} sm={6} md={2}>
                    <Autocomplete
                      disabled={!subType}
                      options={subTypeIdOptions}
                      getOptionLabel={option => option.label}
                      value={subTypeIdOptions.find(option => option.value === subTypeId) || null}
                      onChange={(_, newValue) => setSubTypeId(newValue?.value || '')}
                      renderInput={params => (
                        <TextField
                          {...params}
                          label="Filter (Optional)"
                          placeholder="Search or select"
                          fullWidth
                          size="small"
                        />
                      )}
                    />
                  </Grid>
                )}

                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    label="Start Date"
                    type="date"
                    fullWidth
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DateIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    label="End Date"
                    type="date"
                    fullWidth
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DateIcon color="primary" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={2}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Generate Report">
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSearch}
                        disabled={!reportType || !subType || loading}
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                        size="small"
                        sx={{ minWidth: 100 }}
                      >
                        {loading ? 'Loading...' : 'Generate'}
                      </Button>
                    </Tooltip>
                    
                    <Tooltip title="Clear All">
                      <IconButton 
                        color="secondary" 
                        onClick={handleClear}
                        size="small"
                        sx={{ 
                          bgcolor: 'secondary.main', 
                          color: 'white',
                          '&:hover': { bgcolor: 'secondary.dark' }
                        }}
                      >
                        <ClearIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Grid>

                {error && (
                  <Grid item xs={12}>
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                      {error}
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Container>
      </Box>

      {/* Scrollable Report Results Section */}
      {showReport && reportData && (
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <Container maxWidth="xl" sx={{ height: '100%', pb: 2 }}>
            <Card elevation={3} sx={{ height: '100%', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
              <CardHeader 
                title={`${reportType.toUpperCase()} ${subType.toUpperCase()} Report Results`}
                action={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Download PDF">
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={handleDownloadPdf}
                        size="small"
                        disabled={!reportData || reportData.length === 0}
                      >
                        PDF
                      </Button>
                    </Tooltip>
                    
                    <Tooltip title="Download Excel">
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<DownloadIcon />}
                        onClick={handleDownloadExcel}
                        size="small"
                        disabled={!reportData || reportData.length === 0}
                      >
                        Excel
                      </Button>
                    </Tooltip>
                  </Box>
                }
                sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  py: 1,
                  flexShrink: 0,
                  '& .MuiCardHeader-title': { fontWeight: 600, fontSize: '0.9rem', color: 'white' }
                }}
              />
              
              {/* Report Info */}
              <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>{reportData.length}</strong> records found | 
                  Date Range: <strong>{startDate}</strong> to <strong>{endDate}</strong>
                  {subTypeId && (
                    <>
                      {' | '}
                      Filter: <strong>{subTypeIdOptions.find(opt => opt.value === subTypeId)?.label}</strong>
                    </>
                  )}
                </Typography>
              </Box>
              
              {/* Scrollable Table */}
              <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                {reportData.length === 0 ? (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '200px' 
                  }}>
                    <Typography variant="h6" color="text.secondary">
                      No data available for the selected criteria
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          {getTableHeaders().map(header => (
                            <TableCell 
                              key={header} 
                              sx={{ 
                                fontWeight: 'bold', 
                                bgcolor: '#f5f5f5',
                                whiteSpace: 'nowrap',
                                color: 'primary.main',
                                py: 1,
                                fontSize: '0.85rem'
                              }}
                            >
                              <TableSortLabel>
                                {header.replace(/_/g, ' ').toUpperCase()}
                              </TableSortLabel>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData.map((row, index) => (
                          <TableRow 
                            key={index} 
                            hover
                            sx={{ '& td': { py: 0.5, fontSize: '0.85rem' } }}
                          >
                            {getTableHeaders().map(header => (
                              <TableCell 
                                key={header}
                                sx={{
                                  whiteSpace: 'nowrap',
                                  maxWidth: '200px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {typeof row[header] === 'number' ? 
                                  row[header].toLocaleString() : 
                                  row[header]
                                }
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>

              {/* Fixed Totals Row */}
              {reportData && reportData.length > 0 && (
                <Box sx={{ 
                  borderTop: '2px solid #e0e0e0', 
                  bgcolor: 'primary.main',
                  flexShrink: 0 
                }}>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        {getTableHeaders().map(header => (
                          <TableCell 
                            key={header} 
                            sx={{ 
                              fontWeight: 'bold',
                              color: 'white',
                              bgcolor: 'primary.main',
                              border: 'none',
                              py: 1
                            }}
                          >
                            {header.includes('NAME') || header.includes('SUPPLIER') ? 
                              'TOTALS' : 
                              typeof reportData[0]?.[header] === 'number' ? 
                                (calculateTotals()[header] || '').toLocaleString() : 
                                ''
                            }
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Card>
          </Container>
        </Box>
      )}

      {/* Loading State */}
      {generating && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '200px',
          flexGrow: 1
        }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>Generating report...</Typography>
        </Box>
      )}
    </Box>
  );
};

export default ReportPage;
