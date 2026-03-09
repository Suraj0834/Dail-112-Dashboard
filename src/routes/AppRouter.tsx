// =============================================================================
// routes/AppRouter.tsx - React Router v6 configuration
// =============================================================================

import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { MainLayout } from '../components/layout/MainLayout';

// Lazy-loaded pages for code splitting
const LoginPage = lazy(() => import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const SosMonitorPage = lazy(() => import('../pages/sos/SosMonitorPage').then((m) => ({ default: m.SosMonitorPage })));
const CasesPage = lazy(() => import('../pages/cases/CasesPage').then((m) => ({ default: m.CasesPage })));
const CaseDetailPage = lazy(() => import('../pages/cases/CaseDetailPage').then((m) => ({ default: m.CaseDetailPage })));
const PolicePage = lazy(() => import('../pages/police/PolicePage').then((m) => ({ default: m.PolicePage })));
const CriminalsPage = lazy(() => import('../pages/criminals/CriminalsPage').then((m) => ({ default: m.CriminalsPage })));
const AnalyticsPage = lazy(() => import('../pages/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const VehiclesPage = lazy(() => import('../pages/vehicles/VehiclesPage'));
const PcrTrackingPage = lazy(() => import('../pages/pcr/PcrTrackingPage').then((m) => ({ default: m.PcrTrackingPage })));
const RolesPage = lazy(() => import('../pages/roles/RolesPage').then((m) => ({ default: m.RolesPage })));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));

// Loader fallback
const PageLoader = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress color="primary" />
    </Box>
);

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    if (isLoading) return <PageLoader />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <>{children}</>;
};

export const AppRouter: React.FC = () => {
    return (
        <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* Public */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* Protected – all inside MainLayout */}
                    <Route
                        element={
                            <ProtectedRoute>
                                <MainLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/sos" element={<SosMonitorPage />} />
                        <Route path="/cases" element={<CasesPage />} />
                        <Route path="/cases/:id" element={<CaseDetailPage />} />
                        <Route path="/police" element={<PolicePage />} />
                        <Route path="/criminals" element={<CriminalsPage />} />
                        <Route path="/vehicles" element={<VehiclesPage />} />
                        <Route path="/analytics" element={<AnalyticsPage />} />
                        <Route path="/pcr" element={<PcrTrackingPage />} />
                        <Route path="/roles" element={<RolesPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
};
