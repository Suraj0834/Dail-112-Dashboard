// =============================================================================
// pages/cases/CaseDetailPage.tsx — Full-screen case detail view
// =============================================================================

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Avatar, Chip, Skeleton, Divider,
    TextField, Select, MenuItem, FormControl, IconButton, Tooltip,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    FolderOpen as CaseIcon,
    Person as PersonIcon,
    GpsFixed as LocationIcon,
    Assignment as AssignIcon,
    Timeline as TimelineIcon,
    Circle as DotIcon,
    Refresh as RefreshIcon,
    SmartToy as AiIcon,
    CalendarToday as DateIcon,
    Phone as PhoneIcon,
    Badge as BadgeIcon,
    LocationCity as StationIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { casesService, policeService } from '../../services/api.service';
import { Case, CaseStatus, User } from '../../types';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

// ── Design tokens ─────────────────────────────────────────────────────────────
const G        = 'rgba(255,255,255,0.04)';
const BORDER   = 'rgba(255,255,255,0.07)';
const glass    = { background: G, backdropFilter: 'blur(12px)', border: `1px solid ${BORDER}`, borderRadius: 3 };

const STATUS_META: Record<CaseStatus, { color: string; glow: string; label: string }> = {
    PENDING:       { color: '#FF9800', glow: 'rgba(255,152,0,0.3)',   label: 'Pending'       },
    INVESTIGATING: { color: '#00B0FF', glow: 'rgba(0,176,255,0.3)',   label: 'Investigating' },
    RESOLVED:      { color: '#00E676', glow: 'rgba(0,230,118,0.3)',   label: 'Resolved'      },
    CLOSED:        { color: '#78909C', glow: 'rgba(120,144,156,0.3)', label: 'Closed'        },
};

const CRIME_COLORS: Record<string, string> = {
    THEFT: '#FF6D00', CYBERCRIME: '#AA00FF', VIOLENCE: '#FF1744',
    FRAUD: '#F57F17', HARASSMENT: '#D500F9', ACCIDENT: '#0091EA', OTHER: '#546E7A',
};

const STATUSES: CaseStatus[] = ['PENDING', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];

// Safe date helper — returns null if value is missing or invalid
const safeDate = (v: unknown): Date | null => {
    if (!v) return null;
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? null : d;
};
const safeFmt = (v: unknown, fmt: string) => { const d = safeDate(v); return d ? format(d, fmt) : '—'; };
const safeDist = (v: unknown) => { const d = safeDate(v); return d ? formatDistanceToNow(d, { addSuffix: true }) : '—'; };

// ── Section heading ───────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
    <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Box sx={{ color: '#FF1744' }}>{icon}</Box>
        <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: 'text.secondary' }}>
            {title}
        </Typography>
    </Box>
);

// ── Info row ─────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <Box display="flex" alignItems="flex-start" gap={1.5} py={1} sx={{ borderBottom: `1px solid ${BORDER}`, '&:last-child': { border: 'none' } }}>
        <Box sx={{ color: 'text.disabled', mt: 0.1, flexShrink: 0 }}>{icon}</Box>
        <Box>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 0.2 }}>{value}</Typography>
        </Box>
    </Box>
);

// ── Main component ────────────────────────────────────────────────────────────
export const CaseDetailPage: React.FC = () => {
    const { id }       = useParams<{ id: string }>();
    const navigate     = useNavigate();
    const queryClient  = useQueryClient();

    const [newStatus, setNewStatus] = useState<CaseStatus>('PENDING');
    const [note, setNote]           = useState('');
    const [officerId, setOfficerId] = useState('');

    // ── Data fetching ──────────────────────────────────────────────────────────
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['case', id],
        queryFn: () => casesService.getById(id!),
        enabled: !!id,
    });

    const { data: officersData } = useQuery({
        queryKey: ['all-officers'],
        queryFn: () => policeService.getAll({ isActive: true, page: 1 }),
    });

    const c: Case | undefined     = (data?.data as any)?.case;
    const officers: User[]        = (officersData?.data as any)?.officers || [];

    // ── Mutations ──────────────────────────────────────────────────────────────
    const updateMutation = useMutation({
        mutationFn: () => casesService.updateStatus(id!, newStatus, note),
        onSuccess: () => {
            toast.success(`Status updated to ${newStatus}`);
            setNote('');
            queryClient.invalidateQueries({ queryKey: ['case', id] });
            queryClient.invalidateQueries({ queryKey: ['cases'] });
        },
        onError: () => toast.error('Failed to update status'),
    });

    const assignMutation = useMutation({
        mutationFn: () => casesService.assignOfficer(id!, officerId),
        onSuccess: () => {
            toast.success('Officer assigned successfully');
            setOfficerId('');
            queryClient.invalidateQueries({ queryKey: ['case', id] });
            queryClient.invalidateQueries({ queryKey: ['cases'] });
        },
        onError: () => toast.error('Failed to assign officer'),
    });

    // ── Derived values ─────────────────────────────────────────────────────────
    const sm           = c ? STATUS_META[c.status] : null;
    const crimeColor   = c ? (CRIME_COLORS[c.category] ?? '#546E7A') : '#546E7A';
    const filedByUser  = typeof c?.filedBy === 'object' ? (c.filedBy as User) : null;
    const officer      = typeof c?.assignedOfficer === 'object' ? (c.assignedOfficer as any) : null;

    // ── Skeleton ───────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 4 } }}>
                <Box display="flex" alignItems="center" gap={1.5} mb={4}>
                    <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: 'rgba(255,255,255,0.07)' }} />
                    <Skeleton width={220} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.07)' }} />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 380px' }, gap: 3 }}>
                    <Box display="flex" flexDirection="column" gap={3}>
                        {[180, 140, 240].map((h, i) => (
                            <Skeleton key={i} variant="rectangular" height={h} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 3 }} />
                        ))}
                    </Box>
                    <Box display="flex" flexDirection="column" gap={3}>
                        {[200, 160].map((h, i) => (
                            <Skeleton key={i} variant="rectangular" height={h} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 3 }} />
                        ))}
                    </Box>
                </Box>
            </Box>
        );
    }

    if (!c) {
        return (
            <Box sx={{ textAlign: 'center', py: 10 }}>
                <CaseIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" fontWeight={700}>Case not found</Typography>
                <Typography color="text.secondary" mt={1}>This case may have been removed or the ID is invalid.</Typography>
                <Box component="button" onClick={() => navigate('/cases')} sx={{
                    mt: 3, px: 4, py: 1.2, border: '1px solid rgba(255,23,68,0.4)',
                    borderRadius: 2, background: 'rgba(255,23,68,0.1)', color: '#FF1744',
                    cursor: 'pointer', fontSize: 14, fontWeight: 700,
                }}>
                    ← Back to Cases
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 6 }}>

            {/* ── Top navigation bar ── */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Tooltip title="Back to cases">
                            <IconButton
                                onClick={() => navigate('/cases')}
                                size="small"
                                sx={{
                                    border: `1px solid ${BORDER}`, background: G,
                                    color: 'text.secondary',
                                    '&:hover': { color: '#FF1744', borderColor: 'rgba(255,23,68,0.4)' },
                                }}
                            >
                                <BackIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Box>
                            <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1 }}>
                                Case Management /
                                <Box component="span" sx={{ color: 'text.primary', ml: 0.5 }}>Case Detail</Box>
                            </Typography>
                        </Box>
                    </Box>
                    <Tooltip title="Refresh">
                        <IconButton
                            onClick={() => refetch()}
                            size="small"
                            sx={{
                                border: `1px solid ${BORDER}`, background: G,
                                color: 'text.secondary',
                                '&:hover': { color: '#FF1744', borderColor: 'rgba(255,23,68,0.4)' },
                            }}
                        >
                            <RefreshIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </motion.div>

            {/* ── Hero header ── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Box sx={{
                    ...glass,
                    p: { xs: 3, md: 4 },
                    mb: 3,
                    borderTop: `3px solid ${sm?.color}`,
                    boxShadow: sm ? `0 0 40px ${sm.glow}` : 'none',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Background glow */}
                    <Box sx={{
                        position: 'absolute', top: -60, right: -60,
                        width: 220, height: 220, borderRadius: '50%',
                        background: sm ? `radial-gradient(circle, ${sm.glow} 0%, transparent 70%)` : 'none',
                        pointerEvents: 'none',
                    }} />

                    <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} flexWrap="wrap">
                        <Box display="flex" gap={2} flex={1}>
                            <Box sx={{
                                width: 52, height: 52, borderRadius: 3, flexShrink: 0,
                                background: `linear-gradient(135deg, ${crimeColor}33, ${crimeColor}11)`,
                                border: `1px solid ${crimeColor}44`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <CaseIcon sx={{ color: crimeColor, fontSize: 26 }} />
                            </Box>
                            <Box>
                                <Box display="flex" gap={1} flexWrap="wrap" mb={1.5}>
                                    <Chip label={c.category} size="small" sx={{
                                        fontSize: 10, height: 22,
                                        bgcolor: `${crimeColor}22`, color: crimeColor,
                                        border: `1px solid ${crimeColor}44`, fontWeight: 700,
                                    }} />
                                    {sm && (
                                        <Chip
                                            icon={<DotIcon sx={{ fontSize: '8px !important', color: `${sm.color} !important` }} />}
                                            label={sm.label}
                                            size="small"
                                            sx={{
                                                fontSize: 10, height: 22,
                                                bgcolor: `${sm.color}22`, color: sm.color,
                                                border: `1px solid ${sm.color}44`, fontWeight: 700,
                                            }}
                                        />
                                    )}
                                    {c.aiCategory && (
                                        <Chip
                                            icon={<AiIcon sx={{ fontSize: '12px !important', color: '#AA00FF !important' }} />}
                                            label={`AI: ${c.aiCategory}${c.aiConfidence ? ` · ${Math.round(c.aiConfidence * 100)}%` : ''}`}
                                            size="small"
                                            sx={{
                                                fontSize: 10, height: 22,
                                                bgcolor: 'rgba(170,0,255,0.12)', color: '#AA00FF',
                                                border: '1px solid rgba(170,0,255,0.35)',
                                            }}
                                        />
                                    )}
                                </Box>
                                <Typography sx={{ fontSize: { xs: 18, md: 22 }, fontWeight: 900, lineHeight: 1.2, mb: 1 }}>
                                    {c.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, maxWidth: 680 }}>
                                    {c.description}
                                </Typography>
                            </Box>
                        </Box>

                        {/* Timestamps */}
                        <Box sx={{ ...glass, p: 2, minWidth: 170, flexShrink: 0 }}>
                            <Box mb={1.5}>
                                <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.8 }}>Filed</Typography>
                                <Typography sx={{ fontSize: 12, fontWeight: 600, mt: 0.3 }}>
                                    {safeFmt(c.createdAt, 'dd MMM yyyy')}
                                </Typography>
                                <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                                    {safeDist(c.createdAt)}
                                </Typography>
                            </Box>
                            <Divider sx={{ borderColor: BORDER, my: 1 }} />
                            <Box>
                                <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.8 }}>Last Updated</Typography>
                                <Typography sx={{ fontSize: 12, fontWeight: 600, mt: 0.3 }}>
                                    {safeFmt(c.updatedAt, 'dd MMM yyyy, HH:mm')}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </motion.div>

            {/* ── Two-column layout ── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 400px' }, gap: 3 }}>

                {/* ══ LEFT COLUMN ══════════════════════════════════════════════ */}
                <Box display="flex" flexDirection="column" gap={3}>

                    {/* Case Participants */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Box sx={{ ...glass, p: 3 }}>
                            <SectionLabel icon={<PersonIcon sx={{ fontSize: 16 }} />} title="Participants" />

                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                {/* Filed by */}
                                <Box sx={{ ...glass, p: 2.5, borderRadius: 2 }}>
                                    <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1.5 }}>Filed By</Typography>
                                    {filedByUser ? (
                                        <Box display="flex" alignItems="center" gap={1.5}>
                                            <Avatar sx={{ width: 40, height: 40, bgcolor: 'rgba(0,176,255,0.15)', color: '#00B0FF', fontWeight: 700, fontSize: 16 }}>
                                                {filedByUser.name?.[0]}
                                            </Avatar>
                                            <Box>
                                                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{filedByUser.name}</Typography>
                                                {filedByUser.phone && (
                                                    <Box display="flex" alignItems="center" gap={0.5} mt={0.3}>
                                                        <PhoneIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                                                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{filedByUser.phone}</Typography>
                                                    </Box>
                                                )}
                                                {filedByUser.email && (
                                                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{filedByUser.email}</Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    ) : (
                                        <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>Unknown</Typography>
                                    )}
                                </Box>

                                {/* Assigned officer */}
                                <Box sx={{ ...glass, p: 2.5, borderRadius: 2 }}>
                                    <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1.5 }}>Assigned Officer</Typography>
                                    {officer ? (
                                        <Box display="flex" alignItems="center" gap={1.5}>
                                            <Avatar sx={{ width: 40, height: 40, bgcolor: 'rgba(255,23,68,0.15)', color: '#FF1744', fontWeight: 700, fontSize: 16 }}>
                                                {officer.name?.[0]}
                                            </Avatar>
                                            <Box>
                                                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{officer.name}</Typography>
                                                {officer.badgeId && (
                                                    <Box display="flex" alignItems="center" gap={0.5} mt={0.3}>
                                                        <BadgeIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                                                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{officer.badgeId}</Typography>
                                                    </Box>
                                                )}
                                                {officer.station && (
                                                    <Box display="flex" alignItems="center" gap={0.5}>
                                                        <StationIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                                                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{officer.station}</Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    ) : (
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Box sx={{ width: 40, height: 40, borderRadius: '50%', border: `2px dashed ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <PersonIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                                            </Box>
                                            <Typography sx={{ fontSize: 13, color: '#FF9800', fontWeight: 600 }}>⚠ Unassigned</Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Box>

                            {/* Location */}
                            {c.location?.address && (
                                <Box sx={{ ...glass, p: 2, borderRadius: 2, mt: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: 'rgba(0,145,234,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <LocationIcon sx={{ fontSize: 18, color: '#0091EA' }} />
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.8 }}>Incident Location</Typography>
                                        <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 0.2 }}>{c.location.address}</Typography>
                                        {c.location.coordinates && c.location.coordinates[0] !== 0 && (
                                            <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.2 }}>
                                                {c.location.coordinates[1].toFixed(4)}°N, {c.location.coordinates[0].toFixed(4)}°E
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </motion.div>

                    {/* Activity Timeline */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                        <Box sx={{ ...glass, p: 3 }}>
                            <SectionLabel icon={<TimelineIcon sx={{ fontSize: 16 }} />} title={`Activity Timeline (${c.timeline?.length ?? 0} events)`} />

                            {!c.timeline || c.timeline.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <TimelineIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
                                    <Typography color="text.secondary" fontSize={13}>No activity recorded yet.</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ position: 'relative', pl: 2.5, maxHeight: 480, overflowY: 'auto', pr: 1 }}>
                                    {/* Vertical line */}
                                    <Box sx={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 1, bgcolor: BORDER }} />

                                    {[...c.timeline].reverse().map((t, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                        >
                                            <Box sx={{ display: 'flex', gap: 2, mb: 2.5, position: 'relative' }}>
                                                {/* Dot */}
                                                <Box sx={{
                                                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                                                    bgcolor: '#0D1120', border: `2.5px solid #FF1744`,
                                                    boxShadow: '0 0 8px rgba(255,23,68,0.4)',
                                                    mt: 0.5, zIndex: 1,
                                                }} />
                                                <Box sx={{ ...glass, p: 2, flex: 1, borderRadius: 2 }}>
                                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                                                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{t.action}</Typography>
                                                        <Typography sx={{ fontSize: 10, color: 'text.disabled', flexShrink: 0 }}>
                                                            {safeFmt(t.updatedAt, 'dd MMM, HH:mm')}
                                                        </Typography>
                                                    </Box>
                                                    {t.note && (
                                                        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5, lineHeight: 1.6 }}>{t.note}</Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        </motion.div>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </motion.div>
                </Box>

                {/* ══ RIGHT COLUMN ═════════════════════════════════════════════ */}
                <Box display="flex" flexDirection="column" gap={3}>

                    {/* Update Status */}
                    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}>
                        <Box sx={{ ...glass, p: 3 }}>
                            <SectionLabel icon={<AssignIcon sx={{ fontSize: 16 }} />} title="Update Case Status" />

                            {/* Current status badge */}
                            {sm && (
                                <Box sx={{
                                    display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, mb: 2.5,
                                    borderRadius: 2, bgcolor: `${sm.color}11`, border: `1px solid ${sm.color}33`,
                                }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: sm.color, boxShadow: `0 0 8px ${sm.color}` }} />
                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: sm.color }}>Current: {sm.label}</Typography>
                                </Box>
                            )}

                            {/* Status selector */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2.5 }}>
                                {STATUSES.map((s) => {
                                    const meta = STATUS_META[s];
                                    const isSelected = newStatus === s;
                                    return (
                                        <Box
                                            key={s}
                                            component="button"
                                            onClick={() => setNewStatus(s)}
                                            sx={{
                                                py: 1.2, px: 1, border: `1px solid ${isSelected ? meta.color : BORDER}`,
                                                borderRadius: 2, cursor: 'pointer',
                                                background: isSelected ? `${meta.color}22` : 'rgba(255,255,255,0.03)',
                                                color: isSelected ? meta.color : 'text.secondary',
                                                fontWeight: isSelected ? 800 : 400, fontSize: 12,
                                                boxShadow: isSelected ? `0 0 14px ${meta.glow}` : 'none',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {meta.label}
                                        </Box>
                                    );
                                })}
                            </Box>

                            {/* Note textarea */}
                            <TextField
                                fullWidth
                                size="small"
                                multiline
                                rows={3}
                                placeholder="Add investigation note or reason for status change…"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                sx={{
                                    mb: 2,
                                    '& .MuiOutlinedInput-root': {
                                        background: 'rgba(255,255,255,0.03)', fontSize: 13,
                                        '& fieldset': { borderColor: BORDER },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                                        '&.Mui-focused fieldset': { borderColor: '#FF1744' },
                                    },
                                }}
                            />

                            <motion.div whileTap={{ scale: 0.97 }}>
                                <Box
                                    component="button"
                                    onClick={() => updateMutation.mutate()}
                                    disabled={updateMutation.isPending}
                                    sx={{
                                        width: '100%', py: 1.4, border: 'none', borderRadius: 2,
                                        background: 'linear-gradient(135deg, #FF1744, #C62828)',
                                        color: '#fff', fontWeight: 800, fontSize: 13,
                                        cursor: updateMutation.isPending ? 'default' : 'pointer',
                                        boxShadow: '0 4px 20px rgba(255,23,68,0.4)',
                                        opacity: updateMutation.isPending ? 0.6 : 1,
                                        transition: 'opacity 0.2s',
                                        letterSpacing: 0.5,
                                    }}
                                >
                                    {updateMutation.isPending ? 'Saving…' : '✓ Save Status Update'}
                                </Box>
                            </motion.div>
                        </Box>
                    </motion.div>

                    {/* Assign Officer */}
                    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}>
                        <Box sx={{ ...glass, p: 3 }}>
                            <SectionLabel icon={<BadgeIcon sx={{ fontSize: 16 }} />} title="Assign Officer" />

                            {/* Current officer quick info */}
                            {officer && (
                                <Box sx={{ ...glass, p: 2, mb: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255,23,68,0.15)', color: '#FF1744', fontSize: 13 }}>
                                        {officer.name?.[0]}
                                    </Avatar>
                                    <Box>
                                        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{officer.name}</Typography>
                                        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{officer.station ?? officer.badgeId}</Typography>
                                    </Box>
                                    <Chip label="Current" size="small" sx={{ ml: 'auto', fontSize: 9, height: 18, bgcolor: 'rgba(255,23,68,0.1)', color: '#FF1744', border: '1px solid rgba(255,23,68,0.3)' }} />
                                </Box>
                            )}

                            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                <Select
                                    displayEmpty
                                    value={officerId}
                                    onChange={(e) => setOfficerId(e.target.value)}
                                    renderValue={(v) => v
                                        ? <Typography fontSize={13}>{officers.find(o => o._id === v)?.name}</Typography>
                                        : <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>Select officer to assign…</Typography>
                                    }
                                    sx={{
                                        background: 'rgba(255,255,255,0.03)', fontSize: 13,
                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
                                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FF1744' },
                                    }}
                                    MenuProps={{ PaperProps: { sx: { bgcolor: '#0D1120', border: `1px solid ${BORDER}`, maxHeight: 240 } } }}
                                >
                                    {officers.map((o) => (
                                        <MenuItem key={o._id} value={o._id} sx={{ py: 1.2 }}>
                                            <Box display="flex" alignItems="center" gap={1.5}>
                                                <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: 'rgba(255,23,68,0.15)', color: '#FF1744' }}>
                                                    {o.name?.[0]}
                                                </Avatar>
                                                <Box>
                                                    <Typography fontSize={13} fontWeight={600}>{o.name}</Typography>
                                                    <Typography fontSize={10} color="text.secondary">{o.station}</Typography>
                                                </Box>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <motion.div whileTap={{ scale: 0.97 }}>
                                <Box
                                    component="button"
                                    onClick={() => assignMutation.mutate()}
                                    disabled={!officerId || assignMutation.isPending}
                                    sx={{
                                        width: '100%', py: 1.4,
                                        border: `1px solid ${officerId ? 'rgba(255,23,68,0.5)' : BORDER}`,
                                        borderRadius: 2, cursor: officerId ? 'pointer' : 'default',
                                        background: officerId ? 'rgba(255,23,68,0.12)' : 'rgba(255,255,255,0.03)',
                                        color: officerId ? '#FF1744' : 'text.disabled',
                                        fontWeight: 700, fontSize: 13,
                                        opacity: assignMutation.isPending ? 0.5 : 1,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {assignMutation.isPending ? 'Assigning…' : '→ Assign Selected Officer'}
                                </Box>
                            </motion.div>
                        </Box>
                    </motion.div>

                    {/* Case metadata */}
                    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.22 }}>
                        <Box sx={{ ...glass, p: 3 }}>
                            <SectionLabel icon={<DateIcon sx={{ fontSize: 16 }} />} title="Case Information" />
                            <InfoRow icon={<CaseIcon sx={{ fontSize: 15 }} />}    label="Case ID"      value={c._id} />
                            <InfoRow icon={<PersonIcon sx={{ fontSize: 15 }} />}  label="Category"    value={c.category} />
                            <InfoRow icon={<DateIcon sx={{ fontSize: 15 }} />}    label="Filed On"    value={safeFmt(c.createdAt, 'dd MMM yyyy, HH:mm')} />
                            <InfoRow icon={<RefreshIcon sx={{ fontSize: 15 }} />} label="Last Update" value={safeFmt(c.updatedAt, 'dd MMM yyyy, HH:mm')} />
                            {c.aiCategory && (
                                <InfoRow icon={<AiIcon sx={{ fontSize: 15 }} />} label="AI Category"
                                    value={`${c.aiCategory}${c.aiConfidence ? ` (${Math.round(c.aiConfidence * 100)}% confidence)` : ''}`}
                                />
                            )}
                        </Box>
                    </motion.div>
                </Box>
            </Box>
        </Box>
    );
};
