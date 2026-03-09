// =============================================================================
// components/layout/MainLayout.tsx - Root authenticated layout
// =============================================================================

import React, { useState, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Toolbar, useTheme, useMediaQuery, ThemeProvider, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { createAppTheme } from '../../app/theme';

const DRAWER_WIDTH = 260;

export const MainLayout: React.FC = () => {
    const [isDark, setIsDark] = useState(
        () => localStorage.getItem('dial112_theme') !== 'light'
    );
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const theme = useMemo(() => createAppTheme(isDark ? 'dark' : 'light'), [isDark]);
    const prefersMobile = useMediaQuery('(max-width:900px)');

    const toggleTheme = () => {
        setIsDark((prev) => {
            const next = !prev;
            localStorage.setItem('dial112_theme', next ? 'dark' : 'light');
            return next;
        });
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                {/* Sidebar */}
                <Sidebar
                    open={prefersMobile ? sidebarOpen : true}
                    onClose={() => setSidebarOpen(false)}
                    variant={prefersMobile ? 'temporary' : 'permanent'}
                />

                {/* Main content */}
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: '100vh',
                        background: theme.palette.background.default,
                    }}
                >
                    <Topbar
                        onMenuClick={() => setSidebarOpen((o) => !o)}
                        isDark={isDark}
                        onToggleTheme={toggleTheme}
                    />
                    <Toolbar />

                    {/* Page content */}
                    <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, overflow: 'auto' }}>
                        <Outlet />
                    </Box>
                </Box>
            </Box>

            {/* Toast notifications */}
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: isDark ? '#1E2540' : '#fff',
                        color: isDark ? '#fff' : '#212121',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    },
                }}
            />
        </ThemeProvider>
    );
};
