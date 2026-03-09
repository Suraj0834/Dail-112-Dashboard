// =============================================================================
// components/layout/Topbar.tsx - Modern redesigned top app bar
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
    AppBar, Toolbar, IconButton, InputBase, Box, Badge,
    Avatar, Menu, MenuItem, Typography, Tooltip, Divider,
    List, ListItem, ListItemText, Chip, useTheme,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Search as SearchIcon,
    Notifications as NotifIcon,
    DarkMode as DarkModeIcon,
    LightMode as LightModeIcon,
    Logout as LogoutIcon,
    ManageAccounts as ProfileIcon,
    Shield as ShieldIcon,
    Circle as CircleIcon,
    NotificationsNone as NotifEmptyIcon,
    Close as CloseIcon,
    AccessTime as ClockIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

interface TopbarProps {
    onMenuClick: () => void;
    isDark: boolean;
    onToggleTheme: () => void;
}

const MotionBox = motion(Box);
const MotionIconButton = motion(IconButton);

// Notification type visual config
const notifConfig: Record<string, { color: string; bg: string; label: string }> = {
    sos:    { color: '#FF1744', bg: 'rgba(255,23,68,0.12)',   label: 'SOS' },
    weapon: { color: '#FF6D00', bg: 'rgba(255,109,0,0.12)',   label: 'WEAPON' },
    case:   { color: '#40C4FF', bg: 'rgba(64,196,255,0.12)',  label: 'CASE' },
    system: { color: '#00E676', bg: 'rgba(0,230,118,0.12)',   label: 'SYSTEM' },
};

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick, isDark, onToggleTheme }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { notifications, unreadCount, markAllRead } = useSocket();

    const [notifOpen, setNotifOpen] = useState(false);
    const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
    const [searchFocused, setSearchFocused] = useState(false);
    const [time, setTime] = useState(new Date());
    const notifRef = useRef<HTMLDivElement>(null);

    // Live clock
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // Close notif panel on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formattedDate = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    const glassBase = isDark
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(0,0,0,0.04)';
    const glassBorder = isDark
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(0,0,0,0.08)';
    const accentRed = '#FF1744';

    return (
        <>
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    zIndex: (t) => t.zIndex.drawer + 1,
                    background: isDark
                        ? 'rgba(10,14,26,0.82)'
                        : 'rgba(255,255,255,0.88)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    borderBottom: `1px solid ${glassBorder}`,
                    boxShadow: isDark
                        ? '0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)'
                        : '0 1px 0 rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.08)',
                }}
            >
                <Toolbar sx={{ gap: 1.5, minHeight: '64px !important', px: { xs: 1.5, md: 2.5 } }}>

                    {/* ── Menu Toggle (mobile only) ── */}
                    <MotionIconButton
                        edge="start"
                        onClick={onMenuClick}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        sx={{
                            display: { xs: 'flex', md: 'none' },
                            color: 'text.primary',
                            background: glassBase,
                            border: `1px solid ${glassBorder}`,
                            borderRadius: '10px',
                            width: 38,
                            height: 38,
                        }}
                    >
                        <MenuIcon sx={{ fontSize: 20 }} />
                    </MotionIconButton>

                    {/* ── Brand Logo ── */}
                    <MotionBox
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        sx={{
                            display: { xs: 'none', sm: 'flex' },
                            alignItems: 'center',
                            gap: 1,
                            mr: 1,
                        }}
                    >
                        <Box
                            sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '9px',
                                background: `linear-gradient(135deg, ${accentRed}, #C62828)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: `0 0 12px rgba(255,23,68,0.4)`,
                            }}
                        >
                            <ShieldIcon sx={{ fontSize: 18, color: '#fff' }} />
                        </Box>
                        <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '13px',
                                    letterSpacing: '0.08em',
                                    color: isDark ? '#fff' : '#0A0E1A',
                                    lineHeight: 1.1,
                                    display: 'block',
                                }}
                            >
                                DIAL-112
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    fontSize: '9px',
                                    letterSpacing: '0.12em',
                                    color: accentRed,
                                    fontWeight: 700,
                                    display: 'block',
                                    lineHeight: 1,
                                }}
                            >
                                COMMAND CENTER
                            </Typography>
                        </Box>
                    </MotionBox>

                    {/* ── Live Status Pill ── */}
                    <MotionBox
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.35 }}
                        sx={{
                            display: { xs: 'none', md: 'flex' },
                            alignItems: 'center',
                            gap: 0.75,
                            px: 1.5,
                            py: 0.5,
                            borderRadius: '20px',
                            background: 'rgba(0,230,118,0.1)',
                            border: '1px solid rgba(0,230,118,0.2)',
                        }}
                    >
                        <motion.div
                            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <CircleIcon sx={{ fontSize: 8, color: '#00E676' }} />
                        </motion.div>
                        <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#00E676', letterSpacing: '0.06em' }}>
                            LIVE
                        </Typography>
                    </MotionBox>

                    {/* ── Search Bar ── */}
                    <MotionBox
                        animate={{
                            boxShadow: searchFocused
                                ? isDark
                                    ? `0 0 0 2px ${accentRed}44, 0 4px 20px rgba(255,23,68,0.15)`
                                    : `0 0 0 2px ${accentRed}33, 0 4px 20px rgba(211,47,47,0.1)`
                                : '0 0 0 1px transparent',
                        }}
                        transition={{ duration: 0.2 }}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            background: glassBase,
                            border: `1px solid ${searchFocused ? accentRed + '55' : glassBorder}`,
                            borderRadius: '12px',
                            px: 1.5,
                            py: 0.5,
                            flex: 1,
                            maxWidth: 420,
                            ml: 1,
                            transition: 'border-color 0.2s',
                        }}
                    >
                        <motion.div
                            animate={{ color: searchFocused ? accentRed : isDark ? '#607D8B' : '#9E9E9E' }}
                            transition={{ duration: 0.2 }}
                            style={{ display: 'flex', alignItems: 'center' }}
                        >
                            <SearchIcon sx={{ fontSize: 18, mr: 1 }} />
                        </motion.div>
                        <InputBase
                            placeholder="Search cases, officers, vehicles..."
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            sx={{
                                flex: 1,
                                fontSize: '13.5px',
                                color: 'text.primary',
                                '& ::placeholder': { color: 'text.secondary', opacity: 0.8 },
                            }}
                        />
                        <AnimatePresence>
                            {searchFocused && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.7 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.7 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <Typography
                                        sx={{
                                            fontSize: '10px',
                                            color: 'text.secondary',
                                            background: glassBase,
                                            border: `1px solid ${glassBorder}`,
                                            borderRadius: '5px',
                                            px: 0.7,
                                            py: 0.2,
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        ⌘ K
                                    </Typography>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </MotionBox>

                    {/* ── Spacer ── */}
                    <Box sx={{ flex: 1 }} />

                    {/* ── Live Clock ── */}
                    <Box
                        sx={{
                            display: { xs: 'none', lg: 'flex' },
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            mr: 0.5,
                        }}
                    >
                        <Typography sx={{ fontSize: '13px', fontWeight: 700, color: 'text.primary', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
                            {formattedTime}
                        </Typography>
                        <Typography sx={{ fontSize: '10px', color: 'text.secondary', lineHeight: 1.1 }}>
                            {formattedDate}
                        </Typography>
                    </Box>

                    {/* ── Divider ── */}
                    <Box sx={{ width: '1px', height: 28, background: glassBorder, mx: 0.5, display: { xs: 'none', md: 'block' } }} />

                    {/* ── Theme Toggle ── */}
                    <Tooltip title={isDark ? 'Light mode' : 'Dark mode'} placement="bottom">
                        <MotionIconButton
                            onClick={onToggleTheme}
                            whileHover={{ scale: 1.1, rotate: 15 }}
                            whileTap={{ scale: 0.9 }}
                            sx={{
                                color: 'text.secondary',
                                background: glassBase,
                                border: `1px solid ${glassBorder}`,
                                borderRadius: '10px',
                                width: 36,
                                height: 36,
                            }}
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={isDark ? 'light' : 'dark'}
                                    initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                    exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ display: 'flex' }}
                                >
                                    {isDark
                                        ? <LightModeIcon sx={{ fontSize: 18 }} />
                                        : <DarkModeIcon sx={{ fontSize: 18 }} />}
                                </motion.div>
                            </AnimatePresence>
                        </MotionIconButton>
                    </Tooltip>

                    {/* ── Notifications ── */}
                    <Box sx={{ position: 'relative' }} ref={notifRef}>
                        <Tooltip title="Notifications" placement="bottom">
                            <MotionIconButton
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    setNotifOpen((o) => !o);
                                    markAllRead();
                                }}
                                sx={{
                                    color: notifOpen ? accentRed : 'text.secondary',
                                    background: notifOpen
                                        ? `rgba(255,23,68,0.1)`
                                        : glassBase,
                                    border: `1px solid ${notifOpen ? accentRed + '44' : glassBorder}`,
                                    borderRadius: '10px',
                                    width: 36,
                                    height: 36,
                                    transition: 'all 0.2s',
                                }}
                            >
                                <Badge
                                    badgeContent={unreadCount}
                                    max={99}
                                    sx={{
                                        '& .MuiBadge-badge': {
                                            background: accentRed,
                                            color: '#fff',
                                            fontSize: '9px',
                                            minWidth: 16,
                                            height: 16,
                                            fontWeight: 800,
                                        },
                                    }}
                                >
                                    <AnimatePresence mode="wait">
                                        {unreadCount > 0 ? (
                                            <motion.div
                                                key="has-notif"
                                                animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
                                                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 4 }}
                                                style={{ display: 'flex' }}
                                            >
                                                <NotifIcon sx={{ fontSize: 18 }} />
                                            </motion.div>
                                        ) : (
                                            <motion.div key="no-notif" style={{ display: 'flex' }}>
                                                <NotifEmptyIcon sx={{ fontSize: 18 }} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Badge>
                            </MotionIconButton>
                        </Tooltip>

                        {/* Floating Notification Panel */}
                        <AnimatePresence>
                            {notifOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: 'calc(100% + 10px)',
                                        width: 360,
                                        zIndex: 9999,
                                        borderRadius: 16,
                                        overflow: 'hidden',
                                        background: isDark ? '#141B2E' : '#FFFFFF',
                                        border: `1px solid ${glassBorder}`,
                                        boxShadow: isDark
                                            ? '0 24px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)'
                                            : '0 24px 48px rgba(0,0,0,0.15)',
                                    }}
                                >
                                    {/* Header */}
                                    <Box
                                        sx={{
                                            px: 2,
                                            py: 1.5,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            borderBottom: `1px solid ${glassBorder}`,
                                            background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <NotifIcon sx={{ fontSize: 18, color: accentRed }} />
                                            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                                                Notifications
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {notifications.length > 0 && (
                                                <Box
                                                    sx={{
                                                        px: 1,
                                                        py: 0.25,
                                                        borderRadius: '20px',
                                                        background: `rgba(255,23,68,0.12)`,
                                                        border: `1px solid rgba(255,23,68,0.25)`,
                                                    }}
                                                >
                                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: accentRed }}>
                                                        {notifications.length} NEW
                                                    </Typography>
                                                </Box>
                                            )}
                                            <IconButton
                                                size="small"
                                                onClick={() => setNotifOpen(false)}
                                                sx={{ color: 'text.secondary', width: 24, height: 24 }}
                                            >
                                                <CloseIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </Box>
                                    </Box>

                                    {/* Notification List */}
                                    <Box sx={{ maxHeight: 380, overflowY: 'auto' }}>
                                        {notifications.length === 0 ? (
                                            <Box sx={{ py: 5, textAlign: 'center' }}>
                                                <NotifEmptyIcon sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
                                                <Typography color="text.secondary" variant="body2" sx={{ fontSize: 13 }}>
                                                    No notifications
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <List dense disablePadding>
                                                {notifications.slice(0, 12).map((n, i) => {
                                                    const cfg = notifConfig[n.type] || { color: '#607D8B', bg: 'rgba(96,125,139,0.1)', label: n.type.toUpperCase() };
                                                    return (
                                                        <motion.div
                                                            key={n.id}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.04, duration: 0.2 }}
                                                        >
                                                            <ListItem
                                                                divider
                                                                sx={{
                                                                    opacity: n.read ? 0.55 : 1,
                                                                    gap: 1.5,
                                                                    py: 1.25,
                                                                    px: 2,
                                                                    alignItems: 'flex-start',
                                                                    '&:hover': { background: glassBase },
                                                                    transition: 'background 0.15s',
                                                                    borderLeft: n.read ? 'none' : `3px solid ${cfg.color}`,
                                                                }}
                                                            >
                                                                <Box
                                                                    sx={{
                                                                        minWidth: 52,
                                                                        px: 0.8,
                                                                        py: 0.35,
                                                                        borderRadius: '6px',
                                                                        background: cfg.bg,
                                                                        border: `1px solid ${cfg.color}33`,
                                                                        textAlign: 'center',
                                                                        mt: 0.25,
                                                                    }}
                                                                >
                                                                    <Typography sx={{ fontSize: 9, fontWeight: 800, color: cfg.color, letterSpacing: '0.06em' }}>
                                                                        {cfg.label}
                                                                    </Typography>
                                                                </Box>
                                                                <ListItemText
                                                                    primary={n.title}
                                                                    secondary={n.message}
                                                                    primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                                                                    secondaryTypographyProps={{ fontSize: 12, mt: 0.25 }}
                                                                />
                                                            </ListItem>
                                                        </motion.div>
                                                    );
                                                })}
                                            </List>
                                        )}
                                    </Box>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Box>

                    {/* ── Divider ── */}
                    <Box sx={{ width: '1px', height: 28, background: glassBorder, mx: 0.5 }} />

                    {/* ── Profile Avatar ── */}
                    <Tooltip title="Account" placement="bottom">
                        <Box
                            component={motion.div}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={(e: React.MouseEvent<HTMLElement>) => setProfileAnchor(e.currentTarget)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                pl: 0.5,
                                pr: 1.25,
                                py: 0.5,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                background: Boolean(profileAnchor) ? glassBase : 'transparent',
                                border: `1px solid ${Boolean(profileAnchor) ? glassBorder : 'transparent'}`,
                                transition: 'all 0.2s',
                                '&:hover': { background: glassBase, border: `1px solid ${glassBorder}` },
                            }}
                        >
                            <Box sx={{ position: 'relative' }}>
                                <Avatar
                                    src={user?.profileImage || undefined}
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        bgcolor: accentRed,
                                        fontSize: 13,
                                        fontWeight: 700,
                                        boxShadow: `0 0 0 2px ${isDark ? '#141B2E' : '#fff'}, 0 0 0 3.5px ${accentRed}66`,
                                    }}
                                >
                                    {user?.name?.[0]}
                                </Avatar>
                                {/* Online dot */}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        bottom: 1,
                                        right: 1,
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor: '#00E676',
                                        border: `1.5px solid ${isDark ? '#141B2E' : '#fff'}`,
                                    }}
                                />
                            </Box>
                            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, color: 'text.primary' }}>
                                    {user?.name?.split(' ')[0] || 'Officer'}
                                </Typography>
                                <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1.1, textTransform: 'capitalize' }}>
                                    {user?.role || 'admin'}
                                </Typography>
                            </Box>
                        </Box>
                    </Tooltip>
                </Toolbar>
            </AppBar>

            {/* ── Profile Menu ── */}
            <Menu
                anchorEl={profileAnchor}
                open={Boolean(profileAnchor)}
                onClose={() => setProfileAnchor(null)}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                    sx: {
                        mt: 1,
                        minWidth: 220,
                        borderRadius: '14px',
                        border: `1px solid ${glassBorder}`,
                        background: isDark ? '#141B2E' : '#FFFFFF',
                        boxShadow: isDark
                            ? '0 16px 40px rgba(0,0,0,0.5)'
                            : '0 16px 40px rgba(0,0,0,0.12)',
                        overflow: 'hidden',
                    },
                }}
            >
                {/* Profile header */}
                <Box
                    sx={{
                        px: 2,
                        py: 1.75,
                        background: isDark
                            ? 'linear-gradient(135deg, rgba(255,23,68,0.08), rgba(124,77,255,0.06))'
                            : 'linear-gradient(135deg, rgba(211,47,47,0.04), rgba(101,31,255,0.03))',
                        borderBottom: `1px solid ${glassBorder}`,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                            src={user?.profileImage || undefined}
                            sx={{ width: 40, height: 40, bgcolor: accentRed, fontSize: 15, fontWeight: 700 }}
                        >
                            {user?.name?.[0]}
                        </Avatar>
                        <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{user?.name}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{user?.email}</Typography>
                        </Box>
                    </Box>
                    <Box
                        sx={{
                            mt: 1.25,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1,
                            py: 0.3,
                            borderRadius: '6px',
                            background: 'rgba(0,230,118,0.1)',
                            border: '1px solid rgba(0,230,118,0.2)',
                        }}
                    >
                        <CircleIcon sx={{ fontSize: 7, color: '#00E676' }} />
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#00E676', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            {user?.role || 'Active'}
                        </Typography>
                    </Box>
                </Box>

                <MenuItem
                    onClick={() => { navigate('/settings'); setProfileAnchor(null); }}
                    sx={{ gap: 1.5, py: 1.25, fontSize: 13, fontWeight: 500 }}
                >
                    <ProfileIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    Profile & Settings
                </MenuItem>

                <Divider sx={{ my: 0.5 }} />

                <MenuItem
                    onClick={() => { logout(); setProfileAnchor(null); }}
                    sx={{
                        gap: 1.5,
                        py: 1.25,
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#FF1744',
                        '&:hover': { background: 'rgba(255,23,68,0.08)' },
                    }}
                >
                    <LogoutIcon sx={{ fontSize: 18 }} />
                    Sign Out
                </MenuItem>
            </Menu>
        </>
    );
};
