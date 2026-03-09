// =============================================================================
// components/layout/Sidebar.tsx - Modern redesigned navigation drawer
// =============================================================================

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Drawer, List, Typography, Box, Avatar, Tooltip, Divider, Toolbar,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Warning as SosIcon,
    Folder as CasesIcon,
    Badge as PoliceIcon,
    PersonSearch as CriminalIcon,
    DirectionsCar as VehicleIcon,
    BarChart as AnalyticsIcon,
    AdminPanelSettings as RolesIcon,
    Settings as SettingsIcon,
    LocalShipping as PcrIcon,
    Shield as ShieldIcon,
    Circle as CircleIcon,
    FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const DRAWER_WIDTH = 262;
const ACCENT = '#FF1744';

interface NavItem {
    label: string;
    icon: React.ReactNode;
    path: string;
    badge?: string;
    badgeColor?: string;
    section?: string;
}

const NAV_ITEMS: NavItem[] = [
    { label: 'Dashboard',          icon: <DashboardIcon />,  path: '/',          section: 'OVERVIEW' },
    { label: 'SOS Monitor',        icon: <SosIcon />,        path: '/sos',       section: 'OPERATIONS', badge: 'LIVE', badgeColor: ACCENT },
    { label: 'PCR Tracking',       icon: <PcrIcon />,        path: '/pcr',       badge: 'LIVE', badgeColor: '#00E676' },
    { label: 'Case Management',    icon: <CasesIcon />,      path: '/cases',     section: 'RECORDS' },
    { label: 'Criminal Database',  icon: <CriminalIcon />,   path: '/criminals' },
    { label: 'Police Officers',    icon: <PoliceIcon />,     path: '/police' },
    { label: 'Vehicles',           icon: <VehicleIcon />,    path: '/vehicles' },
    { label: 'Crime Analytics',    icon: <AnalyticsIcon />,  path: '/analytics', section: 'INSIGHTS' },
    { label: 'Roles & Permissions',icon: <RolesIcon />,      path: '/roles',     section: 'SYSTEM' },
    { label: 'Settings',           icon: <SettingsIcon />,   path: '/settings' },
];

interface SidebarProps {
    open: boolean;
    onClose: () => void;
    variant: 'permanent' | 'temporary';
}

const MotionBox = motion(Box);

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose, variant }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { connected } = useSocket();

    const handleNav = (path: string) => {
        navigate(path);
        if (variant === 'temporary') onClose();
    };

    const drawerContent = (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden',
            }}
        >
            {/* AppBar spacer */}
            <Toolbar sx={{ minHeight: '64px !important' }} />

            {/* ── Brand Header ── */}
            <Box
                sx={{
                    px: 2.5,
                    py: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    background: 'linear-gradient(135deg, rgba(255,23,68,0.06) 0%, rgba(124,77,255,0.04) 100%)',
                }}
            >
                <Box
                    sx={{
                        width: 38,
                        height: 38,
                        borderRadius: '10px',
                        background: `linear-gradient(135deg, ${ACCENT}, #C62828)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 4px 14px rgba(255,23,68,0.4)`,
                        flexShrink: 0,
                    }}
                >
                    <ShieldIcon sx={{ color: '#fff', fontSize: 20 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 15, lineHeight: 1.15, letterSpacing: '0.04em' }}>
                        DIAL-112
                    </Typography>
                    <Typography sx={{ fontSize: 10, letterSpacing: '0.12em', color: 'text.secondary', fontWeight: 600 }}>
                        COMMAND CENTER
                    </Typography>
                </Box>
                {/* Connection status */}
                <Tooltip title={connected ? 'System online' : 'Disconnected'} placement="right">
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1,
                            py: 0.4,
                            borderRadius: '20px',
                            background: connected ? 'rgba(0,230,118,0.1)' : 'rgba(96,125,139,0.1)',
                            border: `1px solid ${connected ? 'rgba(0,230,118,0.25)' : 'rgba(96,125,139,0.2)'}`,
                        }}
                    >
                        <motion.div
                            animate={connected
                                ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }
                                : { scale: 1, opacity: 0.5 }
                            }
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <DotIcon sx={{ fontSize: 7, color: connected ? '#00E676' : '#607D8B' }} />
                        </motion.div>
                        <Typography sx={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', color: connected ? '#00E676' : '#607D8B' }}>
                            {connected ? 'LIVE' : 'OFF'}
                        </Typography>
                    </Box>
                </Tooltip>
            </Box>

            {/* ── Navigation ── */}
            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1.5, py: 1.5,
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
                '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: 2 },
            }}>
                <List disablePadding>
                    {NAV_ITEMS.map((item, index) => {
                        const active = location.pathname === item.path ||
                            (item.path !== '/' && location.pathname.startsWith(item.path));

                        return (
                            <React.Fragment key={item.path}>
                                {/* Section label */}
                                {item.section && (
                                    <Typography
                                        sx={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            letterSpacing: '0.12em',
                                            color: 'text.secondary',
                                            opacity: 0.55,
                                            px: 1.5,
                                            pt: index === 0 ? 0.5 : 2,
                                            pb: 0.75,
                                        }}
                                    >
                                        {item.section}
                                    </Typography>
                                )}

                                <motion.div
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.04, duration: 0.3, ease: 'easeOut' }}
                                >
                                    <Tooltip title={item.label} placement="right" disableHoverListener>
                                        <Box
                                            component={motion.div}
                                            whileHover={{ x: 3 }}
                                            whileTap={{ scale: 0.98 }}
                                            transition={{ duration: 0.15 }}
                                            onClick={() => handleNav(item.path)}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                                px: 1.5,
                                                py: 1.1,
                                                mb: 0.25,
                                                borderRadius: '11px',
                                                cursor: 'pointer',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                background: active
                                                    ? `linear-gradient(135deg, ${ACCENT}22, ${ACCENT}0A)`
                                                    : 'transparent',
                                                border: `1px solid ${active ? ACCENT + '35' : 'transparent'}`,
                                                transition: 'background 0.2s, border-color 0.2s',
                                                '&:hover': {
                                                    background: active
                                                        ? `linear-gradient(135deg, ${ACCENT}28, ${ACCENT}10)`
                                                        : 'rgba(255,255,255,0.04)',
                                                    border: `1px solid ${active ? ACCENT + '45' : 'rgba(255,255,255,0.07)'}`,
                                                },
                                            }}
                                        >
                                            {/* Active left indicator bar */}
                                            <AnimatePresence>
                                                {active && (
                                                    <motion.div
                                                        layoutId="active-indicator"
                                                        initial={{ scaleY: 0, opacity: 0 }}
                                                        animate={{ scaleY: 1, opacity: 1 }}
                                                        exit={{ scaleY: 0, opacity: 0 }}
                                                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                                        style={{
                                                            position: 'absolute',
                                                            left: 0,
                                                            top: '18%',
                                                            bottom: '18%',
                                                            width: 3,
                                                            borderRadius: '0 3px 3px 0',
                                                            background: ACCENT,
                                                            boxShadow: `0 0 8px ${ACCENT}88`,
                                                        }}
                                                    />
                                                )}
                                            </AnimatePresence>

                                            {/* Icon */}
                                            <Box
                                                sx={{
                                                    width: 34,
                                                    height: 34,
                                                    borderRadius: '9px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    background: active
                                                        ? `linear-gradient(135deg, ${ACCENT}, #C62828)`
                                                        : 'rgba(255,255,255,0.05)',
                                                    boxShadow: active ? `0 4px 12px ${ACCENT}50` : 'none',
                                                    transition: 'all 0.2s',
                                                    color: active ? '#fff' : 'text.secondary',
                                                    '& svg': { fontSize: 18 },
                                                }}
                                            >
                                                {item.icon}
                                            </Box>

                                            {/* Label */}
                                            <Typography
                                                sx={{
                                                    fontSize: 13.5,
                                                    fontWeight: active ? 700 : 500,
                                                    color: active ? '#fff' : 'text.primary',
                                                    flex: 1,
                                                    lineHeight: 1,
                                                    letterSpacing: active ? '0.01em' : 0,
                                                    transition: 'color 0.2s, font-weight 0.2s',
                                                }}
                                            >
                                                {item.label}
                                            </Typography>

                                            {/* Badge */}
                                            {item.badge && (
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.4,
                                                        px: 0.75,
                                                        py: 0.2,
                                                        borderRadius: '20px',
                                                        background: `${item.badgeColor}18`,
                                                        border: `1px solid ${item.badgeColor}35`,
                                                    }}
                                                >
                                                    <motion.div
                                                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                                                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                                                    >
                                                        <CircleIcon sx={{ fontSize: 5, color: item.badgeColor }} />
                                                    </motion.div>
                                                    <Typography sx={{ fontSize: 9, fontWeight: 800, color: item.badgeColor, letterSpacing: '0.07em' }}>
                                                        {item.badge}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    </Tooltip>
                                </motion.div>
                            </React.Fragment>
                        );
                    })}
                </List>
            </Box>

            {/* ── User Card ── */}
            <Box
                sx={{
                    mx: 1.5,
                    mb: 1.5,
                    p: 1.5,
                    borderRadius: '13px',
                    border: '1px solid',
                    borderColor: 'divider',
                    background: 'linear-gradient(135deg, rgba(255,23,68,0.05) 0%, rgba(124,77,255,0.04) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                }}
            >
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar
                        src={user?.profileImage || undefined}
                        sx={{
                            width: 36,
                            height: 36,
                            bgcolor: ACCENT,
                            fontSize: 14,
                            fontWeight: 700,
                            boxShadow: `0 0 0 2px rgba(255,23,68,0.35)`,
                        }}
                    >
                        {user?.name?.[0]}
                    </Avatar>
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 9,
                            height: 9,
                            borderRadius: '50%',
                            bgcolor: '#00E676',
                            border: '1.5px solid',
                            borderColor: 'background.paper',
                        }}
                    />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }} noWrap>
                        {user?.name}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.2, textTransform: 'capitalize' }} noWrap>
                        {user?.role}{user?.badgeId ? ` · ${user.badgeId}` : ''}
                    </Typography>
                </Box>
                {/* Version tag */}
                <Typography sx={{ fontSize: 9, color: 'text.secondary', opacity: 0.4, fontWeight: 600, flexShrink: 0 }}>
                    v1.0
                </Typography>
            </Box>
        </Box>
    );

    return (
        <Drawer
            variant={variant}
            open={open}
            onClose={onClose}
            sx={{
                width: open || variant === 'permanent' ? DRAWER_WIDTH : 0,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box',
                    overflowX: 'hidden',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                },
            }}
        >
            {drawerContent}
        </Drawer>
    );
};
