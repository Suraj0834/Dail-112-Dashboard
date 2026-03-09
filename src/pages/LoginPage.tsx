// =============================================================================
// pages/LoginPage.tsx - Authentication page
// =============================================================================

import React, { useState } from 'react';
import {
    Box, Card, CardContent, Typography, TextField, Button,
    CircularProgress, Alert, InputAdornment, IconButton, Chip,
} from '@mui/material';
import {
    Email as EmailIcon,
    Lock as LockIcon,
    Visibility,
    VisibilityOff,
    Warning as SosIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export const LoginPage: React.FC = () => {
    const { login, isLoading } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email || !password) { setError('Please fill all fields'); return; }
        try {
            await login(email, password);
            navigate('/');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Login failed. Check credentials.');
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #0A0E1A 0%, #141B2E 50%, #1a1040 100%)',
                p: 2,
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ width: '100%', maxWidth: 440 }}
            >
                {/* Logo */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Box
                        sx={{
                            width: 64, height: 64, borderRadius: 4,
                            background: 'linear-gradient(135deg, #FF1744, #C62828)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            mx: 'auto', mb: 2, boxShadow: '0 8px 32px rgba(255,23,68,0.4)',
                        }}
                    >
                        <SosIcon sx={{ color: '#fff', fontSize: 36 }} />
                    </Box>
                    <Typography variant="h4" fontWeight={700} color="white">
                        Dial-112
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mt: 0.5 }}>
                        Police Control Room Portal
                    </Typography>
                    <Chip
                        label="AUTHORIZED PERSONNEL ONLY"
                        size="small"
                        sx={{ mt: 1.5, bgcolor: 'rgba(255,23,68,0.15)', color: '#FF5252', fontSize: 10, fontWeight: 700 }}
                    />
                </Box>

                {/* Card */}
                <Card
                    sx={{
                        background: 'rgba(20,27,46,0.85)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}
                >
                    <CardContent sx={{ p: 4 }}>
                        <Typography variant="h6" fontWeight={700} color="white" mb={3}>
                            Sign In to Control Room
                        </Typography>

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                        )}

                        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            <TextField
                                label="Email Address"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                fullWidth
                                autoFocus
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <EmailIcon sx={{ color: 'text.secondary' }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        color: 'white',
                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                                    },
                                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
                                }}
                            />

                            <TextField
                                label="Password"
                                type={showPwd ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                fullWidth
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockIcon sx={{ color: 'text.secondary' }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowPwd((s) => !s)} edge="end">
                                                {showPwd ? <VisibilityOff sx={{ color: 'text.secondary' }} /> : <Visibility sx={{ color: 'text.secondary' }} />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        color: 'white',
                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                                    },
                                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
                                }}
                            />

                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                size="large"
                                fullWidth
                                disabled={isLoading}
                                sx={{
                                    py: 1.5,
                                    mt: 1,
                                    background: 'linear-gradient(135deg, #FF1744, #C62828)',
                                    boxShadow: '0 4px 20px rgba(255,23,68,0.4)',
                                    '&:hover': { boxShadow: '0 6px 28px rgba(255,23,68,0.6)' },
                                }}
                            >
                                {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>

                <Typography
                    variant="caption"
                    sx={{ display: 'block', textAlign: 'center', mt: 3, color: 'rgba(255,255,255,0.3)' }}
                >
                    Government of India — Emergency Services Division
                </Typography>
            </motion.div>
        </Box>
    );
};
