import { createTheme } from '@mui/material/styles';

// Universal Color Palette - Deep Blue & Emerald Green
const colors = {
  primary: {
    main: '#1565C0',      // Deep Blue
    light: '#5E92F3',     // Light Blue  
    dark: '#0D47A1',      // Darker Blue
    contrastText: '#FFFFFF'
  },
  secondary: {
    main: '#00897B',      // Emerald Green
    light: '#4DB6AC',     // Light Emerald
    dark: '#00695C',      // Dark Emerald
    contrastText: '#FFFFFF'
  },
  background: {
    default: '#F8F9FA',
    paper: '#FFFFFF'
  },
  text: {
    primary: '#212529',
    secondary: '#6C757D'
  }
};

const theme = createTheme({
  palette: {
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    text: colors.text,
    success: {
      main: colors.secondary.main,
      light: colors.secondary.light,
      dark: colors.secondary.dark,
      contrastText: '#FFFFFF'
    },
    error: {
      main: '#D32F2F',
      light: '#EF5350',
      dark: '#C62828',
      contrastText: '#FFFFFF'
    },
    warning: {
      main: '#ED6C02',
      light: '#FF9800',
      dark: '#E65100',
      contrastText: '#FFFFFF'
    },
    info: {
      main: colors.primary.light,
      light: '#64B5F6',
      dark: colors.primary.dark,
      contrastText: '#FFFFFF'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: { fontFamily: '"Inter", sans-serif', fontWeight: 700, color: colors.primary.main },
    h2: { fontFamily: '"Inter", sans-serif', fontWeight: 600, color: colors.primary.main },
    h3: { fontFamily: '"Inter", sans-serif', fontWeight: 600, color: colors.primary.main },
    h4: { fontFamily: '"Inter", sans-serif', fontWeight: 600, color: colors.primary.main },
    h5: { fontFamily: '"Inter", sans-serif', fontWeight: 600, color: colors.primary.main },
    h6: { fontFamily: '"Inter", sans-serif', fontWeight: 600, color: colors.primary.main },
    button: { 
      fontFamily: '"Inter", sans-serif', 
      fontWeight: 500, 
      textTransform: 'none' 
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 2px 8px rgba(21, 101, 192, 0.2)' }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.primary.light
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.primary.main
            }
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#F5F5F5',
          fontWeight: 600,
          color: colors.primary.main
        }
      }
    }
  }
});

export default theme;
