// =============================================================================
// pages/police/PolicePage.tsx — Officers Command Centre — fully redesigned
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Avatar, Chip, TextField, InputAdornment,
    IconButton, Tooltip, Skeleton, Drawer, Divider,
    Select, MenuItem, FormControl, InputLabel, Button,
    ToggleButtonGroup, ToggleButton, LinearProgress, Alert,
} from '@mui/material';
import {
    Search as SearchIcon,
    Close as CloseIcon,
    Refresh as RefreshIcon,
    Add as AddIcon,
    LocalPolice as PoliceIcon,
    Shield as ShieldIcon,
    CheckCircle as ActiveIcon,
    RadioButtonChecked as DutyIcon,
    LocationOn as StationIcon,
    Grid4x4 as BadgeIcon,
    GridView as GridIcon,
    ViewList as ListIcon,
    Lock as LockIcon,
    PowerSettingsNew as ToggleActiveIcon,
    Person as PersonIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    Circle as DotIcon,
    FilterAlt as FilterIcon,
    MilitaryTech as RankIcon,
    Edit as EditIcon,
    WbSunny as MorningIcon,
    WbTwilight as EveningIcon,
    NightsStay as NightIcon,
    AccessTime as ClockIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { policeService } from '../../services/api.service';
import { User } from '../../types';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

// ── Design tokens ──────────────────────────────────────────────────────────
const DARK_BG  = 'rgba(20,27,46,0.95)';
const DARK_BG2 = 'rgba(14,20,36,0.98)';
const BORDER   = 'rgba(255,255,255,0.08)';
const G        = 'rgba(255,255,255,0.04)';
const glass    = {
    background: `linear-gradient(135deg, ${DARK_BG} 0%, ${DARK_BG2} 100%)`,
    backdropFilter: 'blur(20px)',
    border: `1px solid ${BORDER}`,
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
};

const RANK_COLORS: Record<string, string> = {
    Constable:        '#42A5F5',
    'Head Constable': '#26C6DA',
    ASI:              '#66BB6A',
    SI:               '#FFA726',
    Inspector:        '#FF7043',
    DSP:              '#AB47BC',
    SP:               '#EC407A',
    DIG:              '#EF5350',
    IG:               '#FF1744',
};

const getColor = (rank?: string) => RANK_COLORS[rank || ''] || '#78909C';

const RANKS    = ['Constable', 'Head Constable', 'ASI', 'SI', 'Inspector', 'DSP', 'SP', 'DIG', 'IG'];
const STATIONS = ['Central', 'North', 'South', 'East', 'West', 'Airport', 'Railway', 'Highway'];

// ── Helpers ────────────────────────────────────────────────────────────────
const safeDate = (v: unknown): Date | null => {
    if (!v) return null;
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? null : d;
};
const safeDist = (v: unknown) => { const d = safeDate(v); return d ? formatDistanceToNow(d, { addSuffix: true }) : '—'; };
const safeFmt  = (v: unknown, fmt: string) => { const d = safeDate(v); return d ? format(d, fmt) : '—'; };

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const photoUrl = (p?: string | null) => p ? (p.startsWith('http') ? p : `${(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001')}${p}`) : undefined;

// ── AnimNum ────────────────────────────────────────────────────────────────
const AnimNum: React.FC<{ value: number; duration?: number }> = ({ value, duration = 1 }) => {
    const [n, setN] = useState(0);
    useEffect(() => {
        const ctrl = animate(0, value, { duration, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) });
        return ctrl.stop;
    }, [value, duration]);
    return <>{n.toLocaleString()}</>;
};

// ── StatCard ───────────────────────────────────────────────────────────────
const StatCard: React.FC<{
    label: string; value: number; color: string; glow: string; Icon: React.ElementType; delay?: number;
}> = ({ label, value, color, glow, Icon, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
        whileHover={{ y: -5, scale: 1.02 }}
        style={{ flex: 1, minWidth: 150 }}
    >
        <Box sx={{
            height: '100%', borderRadius: '16px', position: 'relative', overflow: 'hidden',
            background: `linear-gradient(135deg, ${DARK_BG} 0%, ${DARK_BG2} 100%)`,
            border: `1px solid ${color}22`,
            boxShadow: `0 0 0 1px ${color}14, 0 8px 32px rgba(0,0,0,0.4)`,
            backdropFilter: 'blur(20px)',
            transition: 'all 0.3s ease',
            '&:hover': { boxShadow: `0 0 0 1px ${color}50, 0 20px 48px rgba(0,0,0,0.5), 0 0 32px ${glow}` },
        }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
            <Box sx={{ position: 'absolute', top: -40, right: -40, width: 110, height: 110,
                borderRadius: '50%', background: `${color}12`, filter: 'blur(28px)', pointerEvents: 'none' }} />
            <Box sx={{ p: '18px 22px 16px' }}>
                <Box sx={{ mb: 1.5, width: 42, height: 42, borderRadius: '12px',
                    background: `linear-gradient(135deg, ${color}22, ${color}0E)`,
                    border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    '& svg': { fontSize: 20, color } }}>
                    <Icon />
                </Box>
                <Typography sx={{ fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px', color: '#fff' }}>
                    <AnimNum value={value} />
                </Typography>
                <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.6px', mt: 0.5 }}>
                    {label}
                </Typography>
            </Box>
        </Box>
    </motion.div>
);

// ── Rank badge ─────────────────────────────────────────────────────────────
const RankBadge: React.FC<{ rank?: string }> = ({ rank }) => {
    const color = getColor(rank);
    return (
        <Chip label={rank || 'N/A'} size="small" icon={<RankIcon sx={{ fontSize: '11px !important', color: `${color} !important` }} />}
            sx={{ fontSize: 10, height: 22, fontWeight: 700, bgcolor: `${color}1A`, color, border: `1px solid ${color}44` }} />
    );
};

// ── Shift meta ─────────────────────────────────────────────────────────────
const SHIFT_META = {
    Morning: { color: '#FFD54F', Icon: MorningIcon, label: 'Morning Shift', glow: 'rgba(255,213,79,0.25)' },
    Evening: { color: '#FF8A65', Icon: EveningIcon, label: 'Evening Shift', glow: 'rgba(255,138,101,0.25)' },
    Night:   { color: '#7986CB', Icon: NightIcon,   label: 'Night Shift',   glow: 'rgba(121,134,203,0.25)' },
} as const;
const SHIFTS = ['Morning', 'Evening', 'Night'] as const;
type Shift = typeof SHIFTS[number];

// ── Duty badge ─────────────────────────────────────────────────────────────
const DutyBadge: React.FC<{ on?: boolean; shift?: string | null }> = ({ on, shift }) => {
    const sm = shift && SHIFT_META[shift as Shift];
    const label = on ? (sm ? sm.label : 'On Duty') : 'Off Duty';
    const color = on ? (sm ? sm.color : '#00E676') : '#78909C';
    return (
        <Chip icon={<DotIcon sx={{ fontSize: '9px !important', color: `${color} !important` }} />}
            label={label} size="small"
            sx={{ fontSize: 10, height: 20, fontWeight: 700,
                bgcolor: `${color}1A`, color,
                border: `1px solid ${color}44`,
                boxShadow: on ? `0 0 6px ${color}44` : 'none',
            }} />
    );
};

// ── Officer list-row ───────────────────────────────────────────────────────
const OfficerRow: React.FC<{ o: User; index: number; onClick: () => void }> = ({ o, index, onClick }) => {
    const color = getColor(o.rank);
    return (
        <motion.div
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.32, delay: index * 0.03 }}
            whileHover={{ x: 4 }}
        >
            <Box onClick={onClick} sx={{
                ...glass, p: '13px 18px', mb: 0.8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 2,
                borderRadius: '12px', borderLeft: `3px solid ${color}`,
                transition: 'all 0.2s ease',
                '&:hover': { border: `1px solid ${color}44`, borderLeft: `3px solid ${color}`,
                    boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 16px ${color}22` },
            }}>
                <Avatar src={photoUrl(o.profileImage)} sx={{
                    width: 40, height: 40, flexShrink: 0,
                    border: `2px solid ${color}55`,
                    boxShadow: `0 0 12px ${color}33`,
                    background: `linear-gradient(135deg, ${color}44, ${color}22)`,
                    fontSize: 16, fontWeight: 800, color,
                }}>
                    {o.name.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.3}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
                            {o.name}
                        </Typography>
                        <RankBadge rank={o.rank} />
                        {!o.isActive && (
                            <Chip label="Disabled" size="small" sx={{ fontSize: 9, height: 18,
                                bgcolor: 'rgba(239,83,80,0.1)', color: '#EF5350', border: '1px solid rgba(239,83,80,0.3)' }} />
                        )}
                    </Box>
                    <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <BadgeIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontFamily: 'monospace' }}>
                                {o.badgeId || '—'}
                            </Typography>
                        </Box>
                        {o.station && (
                            <Box display="flex" alignItems="center" gap={0.4}>
                                <StationIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                                <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{o.station}</Typography>
                            </Box>
                        )}
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <EmailIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                            <Typography sx={{ fontSize: 11, color: 'text.disabled',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                                {o.email}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
                <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.7} flexShrink={0}>
                    <DutyBadge on={o.isOnDuty} shift={o.dutyShift} />
                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                        {safeDist(o.lastLogin)}
                    </Typography>
                </Box>
            </Box>
        </motion.div>
    );
};

// ── Officer grid-card ──────────────────────────────────────────────────────
const OfficerCard: React.FC<{ o: User; index: number; onClick: () => void }> = ({ o, index, onClick }) => {
    const color = getColor(o.rank);
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.045, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ y: -7, scale: 1.03 }}
            style={{ cursor: 'pointer' }}
            onClick={onClick}
        >
            <Box sx={{
                ...glass, overflow: 'hidden', position: 'relative',
                transition: 'all 0.3s ease',
                '&:hover': { border: `1px solid ${color}44`, boxShadow: `0 10px 40px rgba(0,0,0,0.5), 0 0 28px ${color}22` },
            }}>
                {/* Top accent */}
                <Box sx={{ height: 3, background: `linear-gradient(90deg, ${color}88, ${color}22)` }} />
                {/* Glow blob */}
                <Box sx={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90,
                    borderRadius: '50%', background: `${color}0C`, filter: 'blur(24px)', pointerEvents: 'none' }} />

                <Box sx={{ p: 2.5 }}>
                    {/* Avatar + status row */}
                    <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                        <Box position="relative">
                            <Avatar src={photoUrl(o.profileImage)} sx={{
                                width: 56, height: 56,
                                border: `2px solid ${color}66`,
                                boxShadow: `0 0 18px ${color}44`,
                                background: `linear-gradient(135deg, ${color}44, ${color}22)`,
                                fontSize: 22, fontWeight: 800, color,
                            }}>
                                {o.name.charAt(0)}
                            </Avatar>
                            {/* Online dot */}
                            <Box sx={{
                                position: 'absolute', bottom: 2, right: 2, width: 11, height: 11,
                                borderRadius: '50%',
                                background: o.isOnDuty ? '#00E676' : '#78909C',
                                border: '2px solid rgba(14,20,36,0.98)',
                                boxShadow: o.isOnDuty ? '0 0 8px rgba(0,230,118,0.8)' : 'none',
                            }} />
                        </Box>
                        <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.5}>
                            <RankBadge rank={o.rank} />
                            {!o.isActive && (
                                <Chip label="Disabled" size="small" sx={{ fontSize: 9, height: 17,
                                    bgcolor: 'rgba(239,83,80,0.1)', color: '#EF5350', border: '1px solid rgba(239,83,80,0.3)' }} />
                            )}
                        </Box>
                    </Box>

                    <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 0.3, lineHeight: 1.2,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {o.name}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.6} mb={1.5}>
                        <BadgeIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                        <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: 'text.secondary' }}>
                            {o.badgeId || '—'}
                        </Typography>
                    </Box>

                    <Divider sx={{ borderColor: BORDER, mb: 1.5 }} />

                    {/* Station + phone */}
                    <Box display="flex" flexDirection="column" gap={0.6} mb={1.5}>
                        {o.station && (
                            <Box display="flex" alignItems="center" gap={0.7}>
                                <StationIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{o.station} Station</Typography>
                            </Box>
                        )}
                        {o.phone && (
                            <Box display="flex" alignItems="center" gap={0.7}>
                                <PhoneIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{o.phone}</Typography>
                            </Box>
                        )}
                    </Box>

                    <Box display="flex" justifyContent="space-between" alignItems="center"
                        sx={{ pt: 1.2, borderTop: `1px solid ${BORDER}` }}>
                        <DutyBadge on={o.isOnDuty} shift={o.dutyShift} />
                        <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>
                            {safeDist(o.lastLogin)}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </motion.div>
    );
};

// ── Skeletons ──────────────────────────────────────────────────────────────
const RowSkel = () => (
    <Box sx={{ ...glass, p: '13px 18px', mb: 0.8, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 2 }}>
        <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
        <Box flex={1}>
            <Skeleton height={14} width="35%" sx={{ bgcolor: 'rgba(255,255,255,0.07)', mb: 0.5 }} />
            <Skeleton height={11} width="60%" sx={{ bgcolor: 'rgba(255,255,255,0.04)' }} />
        </Box>
        <Skeleton height={20} width={70} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 6 }} />
    </Box>
);
const CardSkel = () => (
    <Box sx={{ ...glass, overflow: 'hidden' }}>
        <Skeleton height={3} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
        <Box sx={{ p: 2.5 }}>
            <Box display="flex" gap={1} mb={2}>
                <Skeleton variant="circular" width={56} height={56} sx={{ bgcolor: 'rgba(255,255,255,0.07)' }} />
                <Box flex={1} display="flex" justifyContent="flex-end">
                    <Skeleton width={65} height={22} sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 6 }} />
                </Box>
            </Box>
            <Skeleton height={16} width="70%" sx={{ bgcolor: 'rgba(255,255,255,0.07)' }} />
            <Skeleton height={11} width="40%" sx={{ bgcolor: 'rgba(255,255,255,0.05)', mt: 0.5 }} />
        </Box>
    </Box>
);

// ── Pagination ─────────────────────────────────────────────────────────────
const PillBtn: React.FC<{ label: string; active?: boolean; disabled?: boolean; onClick: () => void }> =
    ({ label, active, disabled, onClick }) => (
        <Box component="button" onClick={!disabled ? onClick : undefined} sx={{
            minWidth: 34, height: 34, borderRadius: '10px',
            border: `1px solid ${active ? '#00B0FF' : BORDER}`,
            background: active ? 'rgba(0,176,255,0.18)' : G,
            color: active ? '#00B0FF' : disabled ? 'text.disabled' : 'text.secondary',
            fontWeight: active ? 700 : 400, fontSize: 13, cursor: disabled ? 'default' : 'pointer',
            transition: 'all 0.2s',
            '&:hover': { background: !disabled && !active ? 'rgba(255,255,255,0.07)' : undefined },
        }}>
            {label}
        </Box>
    );

const PillPager: React.FC<{ page: number; pages: number; total: number; onChange: (p: number) => void }> =
    ({ page, pages, total, onChange }) => {
        const visible = Array.from({ length: Math.min(pages, 7) }, (_, i) => {
            if (pages <= 7) return i + 1;
            if (page <= 4) return i + 1;
            if (page >= pages - 3) return pages - 6 + i;
            return page - 3 + i;
        });
        return (
            <Box display="flex" alignItems="center" justifyContent="space-between" pt={2.5}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    Page {page} of {pages} · {total} officers
                </Typography>
                <Box display="flex" gap={0.5}>
                    <PillBtn label="‹" disabled={page === 1} onClick={() => onChange(page - 1)} />
                    {visible.map((p) => (
                        <PillBtn key={p} label={String(p)} active={p === page} onClick={() => onChange(p)} />
                    ))}
                    <PillBtn label="›" disabled={page === pages} onClick={() => onChange(page + 1)} />
                </Box>
            </Box>
        );
    };

// ── Add / Edit Officer Drawer ──────────────────────────────────────────────
const OfficerFormDrawer: React.FC<{
    open: boolean;
    editOfficer?: User | null;
    onClose: () => void;
}> = ({ open, editOfficer, onClose }) => {
    const queryClient = useQueryClient();
    const isEdit = !!editOfficer;
    const [form, setForm] = useState({
        name: '', email: '', phone: '', password: '',
        badgeId: '', station: '', rank: '',
    });
    const [error, setError] = useState('');

    // populate form when editing
    React.useEffect(() => {
        if (editOfficer) {
            setForm({
                name: editOfficer.name || '',
                email: editOfficer.email || '',
                phone: editOfficer.phone || '',
                password: '',
                badgeId: editOfficer.badgeId || '',
                station: editOfficer.station || '',
                rank: editOfficer.rank || '',
            });
        } else {
            setForm({ name: '', email: '', phone: '', password: '', badgeId: '', station: '', rank: '' });
        }
        setError('');
    }, [editOfficer, open]);

    const createMutation = useMutation({
        mutationFn: () => {
            const fd = new FormData();
            Object.entries({ ...form, role: 'police' }).forEach(([k, v]) => fd.append(k, v));
            return policeService.create(fd);
        },
        onSuccess: () => {
            toast.success('Officer onboarded!');
            queryClient.invalidateQueries({ queryKey: ['police-officers'] });
            onClose();
        },
        onError: (err: any) => setError(err?.response?.data?.message || 'Failed to add officer'),
    });

    const updateMutation = useMutation({
        mutationFn: () => policeService.update(editOfficer!._id, {
            name: form.name, phone: form.phone, badgeId: form.badgeId,
            station: form.station, rank: form.rank,
        }),
        onSuccess: () => {
            toast.success('Officer updated!');
            queryClient.invalidateQueries({ queryKey: ['police-officers'] });
            onClose();
        },
        onError: (err: any) => setError(err?.response?.data?.message || 'Failed to update officer'),
    });

    const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((p) => ({ ...p, [field]: e.target.value }));

    const fieldSx = {
        '& .MuiOutlinedInput-root': {
            background: G, fontSize: 13,
            '& fieldset': { borderColor: BORDER },
            '&:hover fieldset':  { borderColor: 'rgba(255,255,255,0.2)' },
            '&.Mui-focused fieldset': { borderColor: '#00B0FF', boxShadow: '0 0 0 3px rgba(0,176,255,0.08)' },
        },
        '& .MuiInputLabel-root': { fontSize: 13 },
    };

    const accentColor = isEdit ? '#FF9800' : '#00B0FF';

    return (
        <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{
            sx: {
                width: { xs: '100vw', sm: 460 },
                background: `linear-gradient(180deg, ${DARK_BG2} 0%, rgba(10,14,26,0.99) 100%)`,
                backdropFilter: 'blur(30px)',
                borderLeft: `1px solid ${BORDER}`,
                overflowY: 'auto',
            },
        }}>
            {/* Header */}
            <Box sx={{ p: 3, borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, zIndex: 1,
                background: `linear-gradient(180deg, ${DARK_BG2} 0%, transparent 100%)`, backdropFilter: 'blur(20px)' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Box sx={{ width: 38, height: 38, borderRadius: '11px',
                            background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}0A)`,
                            border: `1px solid ${accentColor}33`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isEdit ? <EditIcon sx={{ fontSize: 18, color: accentColor }} /> : <AddIcon sx={{ fontSize: 18, color: accentColor }} />}
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: 15, fontWeight: 800 }}>
                                {isEdit ? 'Edit Officer' : 'Onboard Officer'}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                                {isEdit ? `Updating ${editOfficer?.name}` : 'Add a new officer to the force'}
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={onClose} size="small" sx={{
                        color: 'text.secondary', border: `1px solid ${BORDER}`,
                        '&:hover': { color: '#FF1744', borderColor: '#FF174444' },
                    }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Box>

            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Accent line */}
                <Box sx={{ height: '2px', background: `linear-gradient(90deg, ${accentColor}, transparent)`, borderRadius: 1 }} />

                {error && (
                    <Alert severity="error" sx={{ bgcolor: 'rgba(239,83,80,0.1)', color: '#EF9A9A',
                        border: '1px solid rgba(239,83,80,0.3)', '& .MuiAlert-icon': { color: '#EF5350' } }}>
                        {error}
                    </Alert>
                )}

                {/* Name + Badge */}
                <Box display="flex" gap={1.5}>
                    <TextField label="Full Name" fullWidth size="small" sx={fieldSx}
                        value={form.name} onChange={set('name')} />
                    <TextField label="Badge ID" fullWidth size="small" sx={fieldSx}
                        value={form.badgeId} onChange={set('badgeId')} />
                </Box>

                {/* Email + Phone */}
                <Box display="flex" gap={1.5}>
                    <TextField label="Email" type="email" fullWidth size="small" sx={fieldSx}
                        value={form.email} onChange={set('email')}
                        disabled={isEdit}
                        InputProps={{ startAdornment: <EmailIcon sx={{ fontSize: 15, color: 'text.disabled', mr: 0.5 }} /> }} />
                    <TextField label="Phone" fullWidth size="small" sx={fieldSx}
                        value={form.phone} onChange={set('phone')}
                        InputProps={{ startAdornment: <PhoneIcon sx={{ fontSize: 15, color: 'text.disabled', mr: 0.5 }} /> }} />
                </Box>

                {/* Rank + Station */}
                <Box display="flex" gap={1.5}>
                    <FormControl fullWidth size="small" sx={fieldSx}>
                        <InputLabel>Rank</InputLabel>
                        <Select value={form.rank} label="Rank"
                            onChange={(e) => setForm((p) => ({ ...p, rank: e.target.value as string }))}>
                            {RANKS.map((r) => (
                                <MenuItem key={r} value={r} sx={{ fontSize: 12 }}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <RankIcon sx={{ fontSize: 14, color: getColor(r) }} />
                                        {r}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth size="small" sx={fieldSx}>
                        <InputLabel>Station</InputLabel>
                        <Select value={form.station} label="Station"
                            onChange={(e) => setForm((p) => ({ ...p, station: e.target.value as string }))}>
                            {STATIONS.map((s) => (
                                <MenuItem key={s} value={s} sx={{ fontSize: 12 }}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <StationIcon sx={{ fontSize: 14, color: '#00B0FF' }} />
                                        {s}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                {/* Password (create only) */}
                {!isEdit && (
                    <TextField label="Initial Password" type="password" fullWidth size="small" sx={fieldSx}
                        value={form.password} onChange={set('password')} />
                )}

                {/* Submit */}
                <Button fullWidth variant="contained" size="large"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    onClick={() => isEdit ? updateMutation.mutate() : createMutation.mutate()}
                    startIcon={isEdit ? <EditIcon /> : <AddIcon />}
                    sx={{
                        mt: 1, borderRadius: '12px', fontWeight: 700, fontSize: 13,
                        textTransform: 'none',
                        background: isEdit
                            ? 'linear-gradient(135deg, #FF9800, #FF6D00)'
                            : 'linear-gradient(135deg, #0091EA, #00B0FF)',
                        '&:hover': { background: isEdit
                            ? 'linear-gradient(135deg, #FFA726, #FF8F00)'
                            : 'linear-gradient(135deg, #0277BD, #0091EA)' },
                        '&:disabled': { opacity: 0.4 },
                    }}>
                    {createMutation.isPending || updateMutation.isPending
                        ? (isEdit ? 'Saving…' : 'Onboarding…')
                        : (isEdit ? 'Save Changes' : 'Onboard Officer')}
                </Button>
            </Box>
        </Drawer>
    );
};

// ── Reset Password Drawer ──────────────────────────────────────────────────
const ResetPwdDrawer: React.FC<{ officer: User | null; onClose: () => void }> = ({ officer, onClose }) => {
    const [pwd, setPwd] = useState('');
    const [confirm, setConfirm] = useState('');
    const mutation = useMutation({
        mutationFn: () => policeService.resetPassword(officer!._id, pwd),
        onSuccess: () => { toast.success('Password reset!'); onClose(); setPwd(''); setConfirm(''); },
        onError: () => toast.error('Failed to reset password'),
    });
    const mismatch = pwd && confirm && pwd !== confirm;
    const fieldSx = {
        '& .MuiOutlinedInput-root': { background: G, fontSize: 13,
            '& fieldset': { borderColor: BORDER },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
            '&.Mui-focused fieldset': { borderColor: '#AB47BC', boxShadow: '0 0 0 3px rgba(171,71,188,0.08)' } },
        '& .MuiInputLabel-root': { fontSize: 13 },
    };
    return (
        <Drawer anchor="right" open={!!officer} onClose={onClose} PaperProps={{
            sx: { width: { xs: '100vw', sm: 420 },
                background: `linear-gradient(180deg, ${DARK_BG2} 0%, rgba(10,14,26,0.99) 100%)`,
                backdropFilter: 'blur(30px)', borderLeft: `1px solid ${BORDER}`, overflowY: 'auto' },
        }}>
            <Box sx={{ p: 3, borderBottom: `1px solid ${BORDER}` }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Box sx={{ width: 38, height: 38, borderRadius: '11px',
                            background: 'rgba(171,71,188,0.15)', border: '1px solid rgba(171,71,188,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <LockIcon sx={{ fontSize: 18, color: '#CE93D8' }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: 15, fontWeight: 800 }}>Reset Password</Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{officer?.name}</Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={onClose} size="small"
                        sx={{ color: 'text.secondary', border: `1px solid ${BORDER}`,
                            '&:hover': { color: '#FF1744', borderColor: '#FF174444' } }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Box>
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ height: '2px', background: 'linear-gradient(90deg, #AB47BC, transparent)', borderRadius: 1 }} />
                <TextField label="New Password" type="password" fullWidth size="small" sx={fieldSx}
                    value={pwd} onChange={(e) => setPwd(e.target.value)} />
                <TextField label="Confirm Password" type="password" fullWidth size="small"
                    error={!!mismatch}
                    helperText={mismatch ? 'Passwords do not match' : ''}
                    sx={{ ...fieldSx, '& .MuiFormHelperText-root': { color: '#EF5350' } }}
                    value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                <Button fullWidth variant="contained" size="large"
                    disabled={!pwd || !!mismatch || mutation.isPending || pwd !== confirm}
                    onClick={() => mutation.mutate()}
                    startIcon={<LockIcon />}
                    sx={{ mt: 1, borderRadius: '12px', fontWeight: 700, fontSize: 13, textTransform: 'none',
                        background: 'linear-gradient(135deg, #7B1FA2, #AB47BC)',
                        '&:hover': { background: 'linear-gradient(135deg, #6A1B9A, #9C27B0)' },
                        '&:disabled': { opacity: 0.4 } }}>
                    {mutation.isPending ? 'Resetting…' : 'Reset Password'}
                </Button>
            </Box>
        </Drawer>
    );
};

// ── Officer Detail Drawer ──────────────────────────────────────────────────
const OfficerDetailDrawer: React.FC<{
    officerId: string | null;
    onClose: () => void;
    onEdit: (o: User) => void;
    onResetPwd: (o: User) => void;
}> = ({ officerId, onClose, onEdit, onResetPwd }) => {
    const queryClient = useQueryClient();
    const [selectedShift, setSelectedShift] = useState<Shift | ''>('');

    const { data, isLoading } = useQuery({
        queryKey: ['officer-detail', officerId],
        queryFn: () => policeService.getById(officerId!),
        enabled: !!officerId,
    });
    const officer: User | null = (data?.data as any)?.officer || null;

    // Sync shift selector when officer data loads
    React.useEffect(() => {
        if (officer?.dutyShift) setSelectedShift(officer.dutyShift as Shift);
        else setSelectedShift('');
    }, [officer?.dutyShift, officer?._id]);

    const toggleMutation = useMutation({
        mutationFn: (isActive: boolean) => policeService.toggleActive(officerId!, isActive),
        onSuccess: () => {
            toast.success('Status updated');
            queryClient.invalidateQueries({ queryKey: ['officer-detail', officerId] });
            queryClient.invalidateQueries({ queryKey: ['police-officers'] });
        },
        onError: () => toast.error('Failed to update status'),
    });

    const dutyMutation = useMutation({
        mutationFn: ({ isOnDuty, shift }: { isOnDuty: boolean; shift: string | null }) =>
            policeService.toggleDuty(officerId!, isOnDuty, shift),
        onSuccess: (_, vars) => {
            toast.success(vars.isOnDuty ? '🟢 Officer set On Duty' : '⚫ Officer set Off Duty');
            queryClient.invalidateQueries({ queryKey: ['officer-detail', officerId] });
            queryClient.invalidateQueries({ queryKey: ['police-officers'] });
            queryClient.invalidateQueries({ queryKey: ['police-count-duty'] });
        },
        onError: () => toast.error('Failed to update duty status'),
    });

    const color = officer ? getColor(officer.rank) : '#00B0FF';

    return (
        <Drawer anchor="right" open={!!officerId} onClose={onClose} PaperProps={{
            sx: { width: { xs: '100vw', sm: 480 },
                background: `linear-gradient(180deg, ${DARK_BG2} 0%, rgba(10,14,26,0.99) 100%)`,
                backdropFilter: 'blur(30px)', borderLeft: `1px solid ${BORDER}`, overflowY: 'auto' },
        }}>
            {isLoading && <LinearProgress sx={{ '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #0091EA, #00B0FF)' } }} />}

            {/* Header */}
            <Box sx={{ p: 3, borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, zIndex: 1,
                background: `linear-gradient(180deg, ${DARK_BG2} 0%, transparent 100%)`, backdropFilter: 'blur(20px)' }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography sx={{ fontSize: 11, color: 'text.disabled', letterSpacing: 1, textTransform: 'uppercase', mb: 0.5 }}>
                            Officer Profile
                        </Typography>
                        <Typography sx={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>
                            {officer?.name || '—'}
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small"
                        sx={{ color: 'text.secondary', border: `1px solid ${BORDER}`,
                            '&:hover': { color: '#FF1744', borderColor: '#FF174444' } }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Box>

            {officer && (
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Gradient accent */}
                    <Box sx={{ height: '2px', background: `linear-gradient(90deg, ${color}, transparent)`, borderRadius: 1 }} />

                    {/* Officer avatar hero */}
                    <Box sx={{ ...glass, p: 3, borderRadius: '14px', textAlign: 'center', border: `1px solid ${color}22`,
                        background: `linear-gradient(135deg, ${color}08 0%, ${DARK_BG2} 100%)` }}>
                        <Box position="relative" display="inline-block" mb={1.5}>
                            <Avatar src={photoUrl(officer.profileImage)}
                                sx={{ width: 80, height: 80, border: `3px solid ${color}66`,
                                    boxShadow: `0 0 24px ${color}44`,
                                    background: `linear-gradient(135deg, ${color}55, ${color}22)`,
                                    fontSize: 30, fontWeight: 900, color, mx: 'auto' }}>
                                {officer.name.charAt(0)}
                            </Avatar>
                            <Box sx={{ position: 'absolute', bottom: 4, right: 4, width: 14, height: 14,
                                borderRadius: '50%', background: officer.isOnDuty ? '#00E676' : '#78909C',
                                border: '2.5px solid rgba(14,20,36,0.98)',
                                boxShadow: officer.isOnDuty ? '0 0 10px rgba(0,230,118,0.9)' : 'none' }} />
                        </Box>
                        <Typography sx={{ fontSize: 17, fontWeight: 800, mb: 0.3 }}>{officer.name}</Typography>
                        <Box display="flex" justifyContent="center" gap={0.8} flexWrap="wrap">
                            <RankBadge rank={officer.rank} />
                            <DutyBadge on={officer.isOnDuty} shift={officer.dutyShift} />
                            {!officer.isActive && (
                                <Chip label="Account Disabled" size="small"
                                    sx={{ fontSize: 9, height: 18, bgcolor: 'rgba(239,83,80,0.12)',
                                        color: '#EF5350', border: '1px solid rgba(239,83,80,0.3)' }} />
                            )}
                        </Box>
                    </Box>

                    {/* Contact info */}
                    <Box sx={{ ...glass, p: 2, borderRadius: '12px' }}>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 1.5, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
                            Contact Information
                        </Typography>
                        <Box display="flex" flexDirection="column" gap={1}>
                            {[
                                { icon: <BadgeIcon sx={{ fontSize: 14, color }} />, label: 'Badge ID', value: officer.badgeId || '—', mono: true },
                                { icon: <StationIcon sx={{ fontSize: 14, color: '#00B0FF' }} />, label: 'Station', value: officer.station ? `${officer.station} Station` : '—', mono: false },
                                { icon: <EmailIcon sx={{ fontSize: 14, color: '#AB47BC' }} />, label: 'Email', value: officer.email, mono: false },
                                { icon: <PhoneIcon sx={{ fontSize: 14, color: '#00E676' }} />, label: 'Phone', value: officer.phone || '—', mono: false },
                            ].map(({ icon, label, value, mono }) => (
                                <Box key={label} display="flex" alignItems="center" gap={1.2}>
                                    <Box sx={{ width: 30, height: 30, borderRadius: '9px', background: G,
                                        border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {icon}
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: 9, color: 'text.disabled', lineHeight: 1 }}>{label}</Typography>
                                        <Typography sx={{ fontSize: 12, fontWeight: mono ? 400 : 600, fontFamily: mono ? 'monospace' : 'inherit' }}>
                                            {value}
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    {/* Timestamps */}
                    <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1.5}>
                        {[
                            { label: 'Joined', value: safeFmt(officer.createdAt, 'dd MMM yyyy') },
                            { label: 'Last Login', value: safeDist(officer.lastLogin) },
                        ].map(({ label, value }) => (
                            <Box key={label} sx={{ ...glass, p: 1.5, borderRadius: '12px' }}>
                                <Typography sx={{ fontSize: 9, color: 'text.disabled', mb: 0.3, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Typography>
                                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{value}</Typography>
                            </Box>
                        ))}
                    </Box>

                    {/* ── Duty timing panel ── */}
                    <Box sx={{ ...glass, p: 2, borderRadius: '12px',
                        border: `1px solid ${officer.isOnDuty ? 'rgba(0,230,118,0.2)' : BORDER}`,
                        background: officer.isOnDuty
                            ? `linear-gradient(135deg, rgba(0,230,118,0.06) 0%, ${DARK_BG2} 100%)`
                            : `linear-gradient(135deg, ${DARK_BG} 0%, ${DARK_BG2} 100%)`,
                    }}>
                        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                            <ClockIcon sx={{ fontSize: 14, color: officer.isOnDuty ? '#00E676' : 'text.disabled' }} />
                            <Typography sx={{ fontSize: 10, color: 'text.disabled', letterSpacing: 0.5,
                                textTransform: 'uppercase', fontWeight: 600, flex: 1 }}>
                                Duty Status
                            </Typography>
                            {officer.isOnDuty && officer.dutyStartedAt && (
                                <Typography sx={{ fontSize: 10, color: '#00E676' }}>
                                    Since {safeDist(officer.dutyStartedAt)}
                                </Typography>
                            )}
                        </Box>

                        {/* Current status indicator */}
                        <Box sx={{ ...glass, p: 1.5, borderRadius: '10px', mb: 1.5,
                            background: G, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                                background: officer.isOnDuty ? '#00E676' : '#78909C',
                                boxShadow: officer.isOnDuty ? '0 0 10px rgba(0,230,118,0.8)' : 'none',
                            }} />
                            <Box flex={1}>
                                <Typography sx={{ fontSize: 12, fontWeight: 700,
                                    color: officer.isOnDuty ? '#00E676' : '#78909C' }}>
                                    {officer.isOnDuty
                                        ? (officer.dutyShift ? SHIFT_META[officer.dutyShift as Shift].label : 'On Duty')
                                        : 'Off Duty'}
                                </Typography>
                                {officer.isOnDuty && officer.dutyStartedAt && (
                                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                                        Started {safeFmt(officer.dutyStartedAt, 'dd MMM · HH:mm')}
                                    </Typography>
                                )}
                            </Box>
                        </Box>

                        {/* Shift selector */}
                        <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 1, letterSpacing: 0.4, fontWeight: 600 }}>
                            SET SHIFT
                        </Typography>
                        <Box display="flex" gap={0.8} mb={1.5}>
                            {SHIFTS.map((s) => {
                                const sm = SHIFT_META[s];
                                const active = selectedShift === s;
                                return (
                                    <Box key={s} component="button" onClick={() => setSelectedShift(active ? '' : s)}
                                        sx={{ flex: 1, py: 0.8, borderRadius: '10px', cursor: 'pointer',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4,
                                            bgcolor: active ? `${sm.color}18` : G,
                                            color: active ? sm.color : 'text.secondary',
                                            border: `1px solid ${active ? sm.color + '55' : BORDER}`,
                                            boxShadow: active ? `0 0 10px ${sm.glow}` : 'none',
                                            transition: 'all 0.2s',
                                            '&:hover': { bgcolor: `${sm.color}12`, color: sm.color, borderColor: `${sm.color}44` },
                                        }}>
                                        <sm.Icon sx={{ fontSize: 16 }} />
                                        <Typography sx={{ fontSize: 9, fontWeight: 700, lineHeight: 1 }}>{s}</Typography>
                                    </Box>
                                );
                            })}
                        </Box>

                        {/* Toggle duty button */}
                        <Button fullWidth variant="contained" size="medium"
                            disabled={dutyMutation.isPending || (!officer.isOnDuty && !selectedShift)}
                            onClick={() => dutyMutation.mutate({
                                isOnDuty: !officer.isOnDuty,
                                shift: !officer.isOnDuty ? (selectedShift || null) : null,
                            })}
                            sx={{
                                borderRadius: '10px', fontWeight: 700, fontSize: 12, textTransform: 'none',
                                background: officer.isOnDuty
                                    ? 'linear-gradient(135deg, #424242, #616161)'
                                    : 'linear-gradient(135deg, #1B5E20, #2E7D32)',
                                '&:hover': {
                                    background: officer.isOnDuty
                                        ? 'linear-gradient(135deg, #616161, #757575)'
                                        : 'linear-gradient(135deg, #2E7D32, #388E3C)',
                                },
                                '&:disabled': { opacity: 0.35 },
                            }}>
                            {dutyMutation.isPending
                                ? 'Updating…'
                                : officer.isOnDuty
                                    ? '⚫  End Duty'
                                    : `🟢  Start ${selectedShift ? SHIFT_META[selectedShift as Shift].label : 'Duty'}`}
                        </Button>
                        {!officer.isOnDuty && !selectedShift && (
                            <Typography sx={{ fontSize: 10, color: 'text.disabled', textAlign: 'center', mt: 0.8 }}>
                                Select a shift above to activate duty
                            </Typography>
                        )}
                    </Box>

                    {/* Actions */}
                    <Box display="flex" flexDirection="column" gap={1.2}>
                        <Button fullWidth variant="outlined" startIcon={<EditIcon />}
                            onClick={() => onEdit(officer)}
                            sx={{ borderRadius: '11px', fontWeight: 700, fontSize: 12, textTransform: 'none',
                                borderColor: '#FF980044', color: '#FF9800',
                                '&:hover': { borderColor: '#FF9800', bgcolor: 'rgba(255,152,0,0.08)' } }}>
                            Edit Officer Details
                        </Button>
                        <Button fullWidth variant="outlined" startIcon={<LockIcon />}
                            onClick={() => onResetPwd(officer)}
                            sx={{ borderRadius: '11px', fontWeight: 700, fontSize: 12, textTransform: 'none',
                                borderColor: '#AB47BC44', color: '#CE93D8',
                                '&:hover': { borderColor: '#AB47BC', bgcolor: 'rgba(171,71,188,0.08)' } }}>
                            Reset Password
                        </Button>
                        <Button fullWidth variant="outlined"
                            startIcon={<ToggleActiveIcon />}
                            onClick={() => toggleMutation.mutate(!officer.isActive)}
                            disabled={toggleMutation.isPending}
                            sx={{ borderRadius: '11px', fontWeight: 700, fontSize: 12, textTransform: 'none',
                                borderColor: officer.isActive ? 'rgba(239,83,80,0.4)' : 'rgba(0,230,118,0.4)',
                                color: officer.isActive ? '#EF5350' : '#00E676',
                                '&:hover': {
                                    bgcolor: officer.isActive ? 'rgba(239,83,80,0.08)' : 'rgba(0,230,118,0.08)',
                                    borderColor: officer.isActive ? '#EF5350' : '#00E676',
                                } }}>
                            {toggleMutation.isPending ? 'Updating…' : (officer.isActive ? 'Disable Account' : 'Enable Account')}
                        </Button>
                    </Box>
                </Box>
            )}
        </Drawer>
    );
};

// ── Main Page ──────────────────────────────────────────────────────────────
export const PolicePage: React.FC = () => {
    const queryClient = useQueryClient();
    const [page, setPage]               = useState(1);
    const [search, setSearch]           = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [filterStation, setFilterStation] = useState('');
    const [filterRank, setFilterRank]   = useState('');
    const [viewMode, setViewMode]       = useState<'list' | 'grid'>('list');
    const [selectedId, setSelectedId]   = useState<string | null>(null);
    const [formOpen, setFormOpen]       = useState(false);
    const [editOfficer, setEditOfficer] = useState<User | null>(null);
    const [resetOfficer, setResetOfficer] = useState<User | null>(null);
    const LIMIT = 16;

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['police-officers', page, search, filterStation, filterRank],
        queryFn: () => policeService.getAll({
            page,
            station: filterStation || undefined,
        }),
        refetchInterval: 60_000,
    });

    // stat counts
    const totalQ  = useQuery({ queryKey: ['police-count-all'],    queryFn: () => policeService.getAll({ page: 1 }), refetchInterval: 60_000 });
    const activeQ = useQuery({ queryKey: ['police-count-active'], queryFn: () => policeService.getAll({ page: 1, isActive: true }), refetchInterval: 60_000 });
    const dutyQ   = useQuery({ queryKey: ['police-count-duty'],   queryFn: () => policeService.getAll({ page: 1, isActive: true }), refetchInterval: 60_000 });

    const rawOfficers: User[] = (data?.data as any)?.officers || [];
    const total: number       = (data?.data as any)?.total || 0;

    // client-side search + rank filter
    const officers = rawOfficers.filter((o) => {
        const matchSearch = !search ||
            o.name.toLowerCase().includes(search.toLowerCase()) ||
            (o.badgeId || '').toLowerCase().includes(search.toLowerCase()) ||
            (o.email || '').toLowerCase().includes(search.toLowerCase());
        const matchRank = !filterRank || o.rank === filterRank;
        return matchSearch && matchRank;
    });

    const totalCount  = (totalQ.data?.data  as any)?.total || 0;
    const activeCount = (activeQ.data?.data as any)?.total || 0;
    const pages = Math.max(1, Math.ceil(total / LIMIT));
    const hasFilter = !!(search || filterStation || filterRank);

    const resetFilters = () => { setSearch(''); setSearchInput(''); setFilterStation(''); setFilterRank(''); setPage(1); };

    const openEdit = (o: User) => { setEditOfficer(o); setSelectedId(null); setFormOpen(true); };
    const openReset = (o: User) => { setResetOfficer(o); setSelectedId(null); };

    return (
        <Box sx={{ minHeight: '100vh', pb: 4 }}>

            {/* ── Page Header ── */}
            <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Box sx={{
                            width: 44, height: 44, borderRadius: '13px',
                            background: 'linear-gradient(135deg, rgba(0,176,255,0.2), rgba(0,176,255,0.05))',
                            border: '1px solid rgba(0,176,255,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 20px rgba(0,176,255,0.12)',
                        }}>
                            <PoliceIcon sx={{ color: '#00B0FF', fontSize: 24 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1 }}>
                                Officers Command
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {isFetching ? 'Refreshing…' : `${totalCount} officers · ${activeCount} active`}
                            </Typography>
                        </Box>
                    </Box>
                    <Box display="flex" gap={1}>
                        <Tooltip title="Refresh">
                            <IconButton onClick={() => { refetch(); totalQ.refetch(); activeQ.refetch(); dutyQ.refetch(); }} size="small"
                                sx={{ color: 'text.secondary', border: `1px solid ${BORDER}`, background: G,
                                    '&:hover': { color: '#00B0FF', borderColor: '#00B0FF44', background: 'rgba(0,176,255,0.08)' } }}>
                                <motion.div animate={isFetching ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                                    <RefreshIcon fontSize="small" />
                                </motion.div>
                            </IconButton>
                        </Tooltip>
                        <Button variant="contained" startIcon={<AddIcon />}
                            onClick={() => { setEditOfficer(null); setFormOpen(true); }}
                            sx={{ borderRadius: '11px', fontWeight: 700, fontSize: 13, textTransform: 'none',
                                background: 'linear-gradient(135deg, #0091EA, #00B0FF)',
                                '&:hover': { background: 'linear-gradient(135deg, #0277BD, #0091EA)' } }}>
                            Onboard Officer
                        </Button>
                    </Box>
                </Box>
            </motion.div>

            {/* ── Stat Cards ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
                <Box display="flex" gap={2} mb={3} flexWrap="wrap">
                    <StatCard label="Total Officers" value={totalCount}
                        color="#00B0FF" glow="rgba(0,176,255,0.3)" Icon={PoliceIcon} delay={0.08} />
                    <StatCard label="Active Officers" value={activeCount}
                        color="#00E676" glow="rgba(0,230,118,0.3)" Icon={ActiveIcon} delay={0.15} />
                    <StatCard label="Stations" value={STATIONS.length}
                        color="#FF9800" glow="rgba(255,152,0,0.3)" Icon={StationIcon} delay={0.22} />
                    <StatCard label="Ranks" value={RANKS.length}
                        color="#AB47BC" glow="rgba(171,71,188,0.3)" Icon={ShieldIcon} delay={0.29} />
                </Box>
            </motion.div>

            {/* ── Search + filter toolbar ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
                <Box sx={{ ...glass, p: 2, mb: 2.5, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField size="small" placeholder="Search by name, badge, email…"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
                        sx={{ flex: 1, minWidth: 240,
                            '& .MuiOutlinedInput-root': { background: G, fontSize: 13,
                                '& fieldset': { borderColor: BORDER },
                                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.18)' },
                                '&.Mui-focused fieldset': { borderColor: '#00B0FF', boxShadow: '0 0 0 3px rgba(0,176,255,0.08)' } } }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 17, color: 'text.disabled' }} /></InputAdornment>,
                            endAdornment: searchInput && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>
                                        <CloseIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    {/* Station filter */}
                    <FormControl size="small" sx={{ minWidth: 140,
                        '& .MuiOutlinedInput-root': { background: G, fontSize: 12,
                            '& fieldset': { borderColor: BORDER },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.18)' },
                            '&.Mui-focused fieldset': { borderColor: '#00B0FF' } } }}>
                        <InputLabel sx={{ fontSize: 12 }}>Station</InputLabel>
                        <Select value={filterStation} label="Station"
                            onChange={(e) => { setFilterStation(e.target.value); setPage(1); }}>
                            <MenuItem value="" sx={{ fontSize: 12 }}>All Stations</MenuItem>
                            {STATIONS.map((s) => <MenuItem key={s} value={s} sx={{ fontSize: 12 }}>{s}</MenuItem>)}
                        </Select>
                    </FormControl>

                    {/* Rank filter pills */}
                    <Box display="flex" gap={0.6} flexWrap="wrap">
                        {['SI', 'Inspector', 'DSP', 'SP'].map((r) => {
                            const c = getColor(r);
                            const active = filterRank === r;
                            return (
                                <Box key={r} component="button"
                                    onClick={() => { setFilterRank(active ? '' : r); setPage(1); }}
                                    sx={{ px: 1.2, py: 0.4, borderRadius: '8px', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                                        bgcolor: active ? `${c}22` : G, color: active ? c : 'text.secondary',
                                        border: `1px solid ${active ? c + '55' : BORDER}`,
                                        transition: 'all 0.18s',
                                        '&:hover': { bgcolor: `${c}15`, color: c, borderColor: `${c}44` } }}>
                                    {r}
                                </Box>
                            );
                        })}
                    </Box>

                    <Box display="flex" gap={1} ml="auto" alignItems="center">
                        {hasFilter && (
                            <Chip label="Clear" size="small" onClick={resetFilters} onDelete={resetFilters}
                                sx={{ fontSize: 11, height: 26, bgcolor: 'rgba(255,23,68,0.1)', color: '#FF1744',
                                    border: '1px solid rgba(255,23,68,0.3)' }} />
                        )}
                        <ToggleButtonGroup value={viewMode} exclusive size="small"
                            onChange={(_, v) => v && setViewMode(v)}
                            sx={{ '& .MuiToggleButton-root': { color: 'text.secondary', border: `1px solid ${BORDER}`, px: 1.2,
                                '&.Mui-selected': { bgcolor: 'rgba(0,176,255,0.12)', color: '#00B0FF', borderColor: '#00B0FF33' } } }}>
                            <ToggleButton value="list"><ListIcon fontSize="small" /></ToggleButton>
                            <ToggleButton value="grid"><GridIcon fontSize="small" /></ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </Box>
            </motion.div>

            {/* ── Officers list / grid ── */}
            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {viewMode === 'list'
                            ? [...Array(8)].map((_, i) => <RowSkel key={i} />)
                            : <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 2 }}>
                                {[...Array(8)].map((_, i) => <CardSkel key={i} />)}
                            </Box>}
                    </motion.div>
                ) : officers.length === 0 ? (
                    <motion.div key="empty" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
                        <Box sx={{ ...glass, p: 8, textAlign: 'center' }}>
                            <FilterIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 2 }} />
                            <Typography fontWeight={700} fontSize={16}>No officers found</Typography>
                            <Typography variant="body2" color="text.secondary" mt={1}>
                                {hasFilter ? 'Try clearing the filters.' : 'No officers onboarded yet.'}
                            </Typography>
                            {hasFilter && (
                                <Box component="button" onClick={resetFilters} sx={{
                                    mt: 2, px: 3, py: 1, border: '1px solid rgba(0,176,255,0.4)',
                                    borderRadius: '10px', background: 'rgba(0,176,255,0.1)', color: '#00B0FF',
                                    cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                                    Clear Filters
                                </Box>
                            )}
                        </Box>
                    </motion.div>
                ) : viewMode === 'list' ? (
                    <motion.div key={`list-${page}-${search}-${filterStation}-${filterRank}`}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {officers.map((o, i) => (
                            <OfficerRow key={o._id} o={o} index={i} onClick={() => setSelectedId(o._id)} />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div key={`grid-${page}-${search}-${filterStation}-${filterRank}`}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 2 }}>
                            {officers.map((o, i) => (
                                <OfficerCard key={o._id} o={o} index={i} onClick={() => setSelectedId(o._id)} />
                            ))}
                        </Box>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Pagination ── */}
            {!isLoading && officers.length > 0 && pages > 1 && (
                <PillPager page={page} pages={pages} total={total} onChange={(p) => setPage(p)} />
            )}

            {/* ── Drawers ── */}
            <OfficerDetailDrawer
                officerId={selectedId}
                onClose={() => setSelectedId(null)}
                onEdit={openEdit}
                onResetPwd={openReset}
            />
            <OfficerFormDrawer
                open={formOpen}
                editOfficer={editOfficer}
                onClose={() => { setFormOpen(false); setEditOfficer(null); }}
            />
            <ResetPwdDrawer
                officer={resetOfficer}
                onClose={() => setResetOfficer(null)}
            />
        </Box>
    );
};
