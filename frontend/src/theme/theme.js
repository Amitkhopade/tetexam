import { createTheme } from '@mui/material/styles'

export const paletteTokens = {
  primary: '#2563EB', primaryDark: '#1D4ED8', secondary: '#0F766E', success: '#16A34A', warning: '#D97706', error: '#DC2626',
  background: '#EEF3F8', surface: '#EEF3F8', text: '#132033', muted: '#64748B', border: '#D7E0EA', selected: '#E4ECF8',
}

const neoShadow = '10px 10px 22px rgba(148,163,184,0.32), -10px -10px 22px rgba(255,255,255,0.92)'
const neoInset = 'inset 4px 4px 10px rgba(148,163,184,0.20), inset -4px -4px 10px rgba(255,255,255,0.88)'

export const lightTheme = createTheme({
  palette: {
    mode: 'light', primary: { main: paletteTokens.primary, dark: paletteTokens.primaryDark }, secondary: { main: paletteTokens.secondary },
    success: { main: paletteTokens.success }, warning: { main: paletteTokens.warning }, error: { main: paletteTokens.error },
    background: { default: paletteTokens.background, paper: paletteTokens.surface }, text: { primary: paletteTokens.text, secondary: paletteTokens.muted }, divider: paletteTokens.border,
  },
  shape: { borderRadius: 18 },
  typography: { fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', h2: { fontWeight: 900, letterSpacing: '-0.035em' }, h4: { fontWeight: 850, letterSpacing: '-0.02em' }, h5: { fontWeight: 800 }, h6: { fontWeight: 800 }, button: { fontWeight: 800, textTransform: 'none' } },
  components: {
    MuiCssBaseline: { styleOverrides: { body: { background: paletteTokens.background } } },
    MuiCard: { styleOverrides: { root: { border: '0', backgroundColor: paletteTokens.surface, boxShadow: neoShadow } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none', boxShadow: neoShadow } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 14 } } },
    MuiTextField: { defaultProps: { variant: 'outlined' } },
    MuiChip: { styleOverrides: { root: { fontWeight: 800 } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 14, background: paletteTokens.surface, boxShadow: neoInset, '& fieldset': { borderColor: 'transparent' } } } },
    MuiDrawer: { styleOverrides: { paper: { backgroundColor: paletteTokens.background, boxShadow: '6px 0 18px rgba(148,163,184,.14)' } } },
  },
})

export const darkTheme = createTheme({
  palette: { mode: 'dark', primary: { main: '#60A5FA' }, secondary: { main: '#2DD4BF' }, success: { main: '#4ADE80' }, warning: { main: '#F59E0B' }, error: { main: '#F87171' }, background: { default: '#111827', paper: '#111827' }, text: { primary: '#F8FAFC', secondary: '#CBD5E1' }, divider: '#263244' },
  shape: { borderRadius: 18 }, typography: { fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', h4: { fontWeight: 850 }, h5: { fontWeight: 800 }, h6: { fontWeight: 800 }, button: { fontWeight: 800, textTransform: 'none' } },
  components: { MuiCssBaseline: { styleOverrides: { body: { background: '#111827' } } }, MuiCard: { styleOverrides: { root: { border: '0', background: '#111827', boxShadow: '10px 10px 24px rgba(0,0,0,.36), -8px -8px 20px rgba(30,41,59,.35)' } } }, MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } }, MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 14 } } }, MuiChip: { styleOverrides: { root: { fontWeight: 800 } } } },
})
