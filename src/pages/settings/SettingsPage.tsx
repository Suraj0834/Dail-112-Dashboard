// =============================================================================
// pages/settings/SettingsPage.tsx - System Settings & Profile
// =============================================================================

import React, { useState } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, TextField, Button,
    Divider, Switch, FormControlLabel, Avatar, Chip, Alert, Tabs, Tab,
    Paper,
} from '@mui/material';
import {
    Settings as SettingsIcon, Person as PersonIcon,
    Notifications as NotifIcon, Security as SecurityIcon,
    Info as InfoIcon, Save as SaveIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// ── Tab Panel ─────────────────────────────────────────────────────────────────
interface TabPanelProps { children?: React.ReactNode; value: number; index: number }
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
    <Box role="tabpanel" hidden={value !== index} sx={{ py: 3 }}>
        {value === index && children}
    </Box>
);

export const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const [tab, setTab] = useState(0);

    // Profile form state
    const [profile, setProfile] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        station: (user as any)?.station || '',
    });

    // Password form state
    const [passwords, setPasswords] = useState({
        current: '',
        newPass: '',
        confirm: '',
    });

    // Notification preferences
    const [notifPrefs, setNotifPrefs] = useState({
        sosAlerts: true,
        caseUpdates: true,
        weaponAlerts: true,
        systemNotifications: true,
        emailDigest: false,
        soundEnabled: true,
    });

    const handleSaveProfile = () => {
        // In production, call API to update profile
        toast.success('Profile updated (demo - not persisted)');
    };

    const handleChangePassword = () => {
        if (!passwords.current || !passwords.newPass) {
            toast.error('Please fill in all password fields');
            return;
        }
        if (passwords.newPass !== passwords.confirm) {
            toast.error('New passwords do not match');
            return;
        }
        if (passwords.newPass.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        // In production, call API
        toast.success('Password changed (demo - not persisted)');
        setPasswords({ current: '', newPass: '', confirm: '' });
    };

    const handleSaveNotifications = () => {
        toast.success('Notification preferences saved (demo)');
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" fontWeight={700}>
                    <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Settings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage your profile, security, and system preferences
                </Typography>
            </Box>

            <Paper sx={{ borderRadius: 2 }}>
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                >
                    <Tab icon={<PersonIcon />} label="Profile" iconPosition="start" />
                    <Tab icon={<SecurityIcon />} label="Security" iconPosition="start" />
                    <Tab icon={<NotifIcon />} label="Notifications" iconPosition="start" />
                    <Tab icon={<InfoIcon />} label="System Info" iconPosition="start" />
                </Tabs>

                <Box sx={{ px: 3 }}>
                    {/* ── Profile Tab ─────────────────────────────────────────── */}
                    <TabPanel value={tab} index={0}>
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: 'center' }}>
                                <Avatar
                                    sx={{ width: 100, height: 100, mx: 'auto', mb: 2, fontSize: 40 }}
                                >
                                    {user?.name?.charAt(0) || 'U'}
                                </Avatar>
                                <Typography variant="h6" fontWeight={600}>
                                    {user?.name}
                                </Typography>
                                <Chip
                                    label={user?.role?.toUpperCase()}
                                    color="primary"
                                    size="small"
                                    sx={{ mt: 0.5 }}
                                />
                                {user?.badgeId && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Badge: {user.badgeId}
                                    </Typography>
                                )}
                            </Grid>
                            <Grid size={{ xs: 12, md: 8 }}>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField
                                            label="Full Name"
                                            fullWidth
                                            value={profile.name}
                                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField
                                            label="Email"
                                            fullWidth
                                            value={profile.email}
                                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField
                                            label="Phone"
                                            fullWidth
                                            value={profile.phone}
                                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField
                                            label="Station"
                                            fullWidth
                                            value={profile.station}
                                            onChange={(e) => setProfile({ ...profile, station: e.target.value })}
                                        />
                                    </Grid>
                                    <Grid size={12}>
                                        <Button
                                            variant="contained"
                                            startIcon={<SaveIcon />}
                                            onClick={handleSaveProfile}
                                        >
                                            Save Profile
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </TabPanel>

                    {/* ── Security Tab ────────────────────────────────────────── */}
                    <TabPanel value={tab} index={1}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            Change Password
                        </Typography>
                        <Grid container spacing={2} sx={{ maxWidth: 500 }}>
                            <Grid size={12}>
                                <TextField
                                    label="Current Password"
                                    type="password"
                                    fullWidth
                                    value={passwords.current}
                                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                />
                            </Grid>
                            <Grid size={12}>
                                <TextField
                                    label="New Password"
                                    type="password"
                                    fullWidth
                                    value={passwords.newPass}
                                    onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                                />
                            </Grid>
                            <Grid size={12}>
                                <TextField
                                    label="Confirm New Password"
                                    type="password"
                                    fullWidth
                                    value={passwords.confirm}
                                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                />
                            </Grid>
                            <Grid size={12}>
                                <Button variant="contained" onClick={handleChangePassword}>
                                    Update Password
                                </Button>
                            </Grid>
                        </Grid>
                    </TabPanel>

                    {/* ── Notifications Tab ───────────────────────────────────── */}
                    <TabPanel value={tab} index={2}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            Notification Preferences
                        </Typography>
                        <Grid container spacing={1} sx={{ maxWidth: 500 }}>
                            {[
                                { key: 'sosAlerts', label: 'SOS Alert Notifications', desc: 'Get notified for new SOS alerts' },
                                { key: 'caseUpdates', label: 'Case Update Notifications', desc: 'When cases are created or updated' },
                                { key: 'weaponAlerts', label: 'Weapon Detection Alerts', desc: 'AI weapon detection notifications' },
                                { key: 'systemNotifications', label: 'System Notifications', desc: 'General system messages' },
                                { key: 'emailDigest', label: 'Daily Email Digest', desc: 'Receive a daily summary via email' },
                                { key: 'soundEnabled', label: 'Sound Notifications', desc: 'Play sound for critical alerts' },
                            ].map((item) => (
                                <Grid size={12} key={item.key}>
                                    <Card variant="outlined" sx={{ px: 2, py: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box>
                                                <Typography variant="body1" fontWeight={500}>
                                                    {item.label}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {item.desc}
                                                </Typography>
                                            </Box>
                                            <Switch
                                                checked={(notifPrefs as any)[item.key]}
                                                onChange={(e) =>
                                                    setNotifPrefs({ ...notifPrefs, [item.key]: e.target.checked })
                                                }
                                            />
                                        </Box>
                                    </Card>
                                </Grid>
                            ))}
                            <Grid size={12} sx={{ mt: 1 }}>
                                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveNotifications}>
                                    Save Preferences
                                </Button>
                            </Grid>
                        </Grid>
                    </TabPanel>

                    {/* ── System Info Tab ─────────────────────────────────────── */}
                    <TabPanel value={tab} index={3}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            System Information
                        </Typography>
                        <Grid container spacing={2} sx={{ maxWidth: 600 }}>
                            {[
                                { label: 'Application', value: 'Dial-112 Control Room Portal' },
                                { label: 'Version', value: '1.0.0' },
                                { label: 'Backend API', value: import.meta.env.VITE_API_URL || 'http://localhost:5001' },
                                { label: 'Socket Server', value: import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001' },
                                { label: 'AI Service', value: 'http://localhost:8000' },
                                { label: 'Database', value: 'MongoDB 7.0' },
                                { label: 'Framework', value: 'React 18 + TypeScript + MUI' },
                            ].map((item) => (
                                <Grid size={12} key={item.label}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                            {item.label}
                                        </Typography>
                                        <Typography variant="body2">{item.value}</Typography>
                                    </Box>
                                    <Divider />
                                </Grid>
                            ))}
                        </Grid>

                        <Alert severity="info" sx={{ mt: 3, maxWidth: 600 }}>
                            For detailed system health monitoring, check the backend logs
                            or the Docker container health endpoints.
                        </Alert>
                    </TabPanel>
                </Box>
            </Paper>
        </Box>
    );
};
