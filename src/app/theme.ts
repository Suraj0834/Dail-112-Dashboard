// =============================================================================
// app/theme.ts - Material Design 3 Dark / Light theme
// =============================================================================

import { createTheme, PaletteMode } from '@mui/material';
import { red } from '@mui/material/colors';

const getDesignTokens = (mode: PaletteMode) => ({
    palette: {
        mode,
        ...(mode === 'dark'
            ? {
                primary: { main: '#FF1744', light: '#FF5252', dark: '#C62828' },
                secondary: { main: '#7C4DFF', light: '#B47CFF', dark: '#3D1DDB' },
                background: {
                    default: '#0A0E1A',
                    paper: '#141B2E',
                },
                surface: '#1E2540',
                text: {
                    primary: '#FFFFFF',
                    secondary: '#B0BEC5',
                },
                divider: 'rgba(255,255,255,0.08)',
                error: { main: red[400] },
                success: { main: '#00E676' },
                warning: { main: '#FFD600' },
                info: { main: '#40C4FF' },
            }
            : {
                primary: { main: '#D32F2F', light: '#FF6659', dark: '#9A0007' },
                secondary: { main: '#651FFF', light: '#A255FF', dark: '#12005E' },
                background: {
                    default: '#F5F5F5',
                    paper: '#FFFFFF',
                },
                text: {
                    primary: '#212121',
                    secondary: '#616161',
                },
            }),
    },

    typography: {
        fontFamily: `'Inter', 'Segoe UI', 'Roboto', sans-serif`,
        h1: { fontWeight: 700 },
        h2: { fontWeight: 700 },
        h3: { fontWeight: 600 },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
    },

    shape: { borderRadius: 12 },

    spacing: 8,

    components: {
        MuiCard: {
            styleOverrides: {
                root: ({ theme }: any) => ({
                    backgroundImage: 'none',
                    border:
                        theme.palette.mode === 'dark'
                            ? '1px solid rgba(255,255,255,0.06)'
                            : '1px solid rgba(0,0,0,0.06)',
                }),
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none' as const,
                    fontWeight: 600,
                    borderRadius: 10,
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: ({ theme }: any) => ({
                    background:
                        theme.palette.mode === 'dark' ? '#0D1224' : '#FFFFFF',
                    borderRight:
                        theme.palette.mode === 'dark'
                            ? '1px solid rgba(255,255,255,0.05)'
                            : '1px solid rgba(0,0,0,0.08)',
                }),
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: ({ theme }: any) => ({
                    backgroundImage: 'none',
                    background:
                        theme.palette.mode === 'dark'
                            ? 'rgba(10,14,26,0.85)'
                            : 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(12px)',
                    borderBottom:
                        theme.palette.mode === 'dark'
                            ? '1px solid rgba(255,255,255,0.06)'
                            : '1px solid rgba(0,0,0,0.06)',
                }),
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { fontWeight: 600, borderRadius: 8 },
            },
        },
        MuiTableHead: {
            styleOverrides: {
                root: ({ theme }: any) => ({
                    background:
                        theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.03)'
                            : 'rgba(0,0,0,0.03)',
                }),
            },
        },
    },
});

export const createAppTheme = (mode: PaletteMode) =>
    createTheme(getDesignTokens(mode) as any);
