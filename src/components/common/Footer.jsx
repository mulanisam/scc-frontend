import React from 'react';
import { Box, Typography } from '@mui/material';

function FooterComponent() {
  return (
    <Box 
      component="footer" 
      sx={{
        height: 56, // Fixed height
        bgcolor: 'primary.main',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderTop: '1px solid rgba(0,0,0,0.1)'
      }}
    >
      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
        © 2025 Sohel Chicken Centre. All rights reserved.
      </Typography>
    </Box>
  );
}

export default FooterComponent;
