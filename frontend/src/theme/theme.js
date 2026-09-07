import { createTheme } from '@mui/material/styles'

export const paletteTokens = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  secondary: '#0F766E',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  selected: '#EFF6FF',
}

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: paletteTokens.primary, dark: paletteTokens.primaryDark },
    secondary: { main: paletteTokens.secondary },
    success: { main: paletteTokens.success },
    warning: { main: paletteTokens.warning },
    error: { main: paletteTokens.error },
    background: { default: paletteTokens.background, paper: paletteTokens.surface },
    text: { primary: paletteTokens.text, secondary: paletteTokens.muted },
    divider: paletteTokens.border,
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontWeight: 750 },
    h6: { fontWeight: 750 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiCard: { styleOverrides: { root: { border: `1px solid ${paletteTokens.border}`, boxShadow: '0 8px 30px rgba(15,23,42,0.06)' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
  },
})

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#60A5FA' },
    secondary: { main: '#2DD4BF' },
    success: { main: '#4ADE80' },
    warning: { main: '#F59E0B' },
    error: { main: '#F87171' },
    background: { default: '#0B1220', paper: '#111827' },
    text: { primary: '#F8FAFC', secondary: '#CBD5E1' },
    divider: '#263244',
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h4: { fontWeight: 800 }, h5: { fontWeight: 750 }, h6: { fontWeight: 750 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiCard: { styleOverrides: { root: { border: '1px solid #263244', boxShadow: '0 12px 40px rgba(0,0,0,0.24)' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
})
