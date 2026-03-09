// =============================================================================
// pages/cases/CasesPage.tsx — Case Management — fully redesigned (glassmorphism)
// =============================================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
    Box, Typography, Avatar, Chip, TextField, InputAdornment,
    IconButton, Tooltip, Skeleton, Drawer, Divider,
    Select, MenuItem, FormControl, InputLabel, Button,
    ToggleButtonGroup, ToggleButton, LinearProgress,
} from '@mui/material';
import {
    Search as SearchIcon,
    Close as CloseIcon,
    Refresh as RefreshIcon,
    FolderOpen as CaseIcon,
    AccessTime as PendingIcon,
    ManageSearch as InvestigatingIcon,
    CheckCircle as ResolvedIcon,
    Archive as ClosedIcon,
    LocationOn as LocationIcon,
    Person as PersonIcon,
    Warning as SuspectIcon,
    Circle as DotIcon,
    FilterAlt as FilterIcon,
    GridView as GridIcon,
    ViewList as ListIcon,
    SmartToy as AiIcon,
    Assignment as AssignIcon,
    Update as UpdateIcon,
    LocalPolice as PoliceIcon,
    RadioButtonChecked as RadioIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { casesService, policeService } from '../../services/api.service';
import { Case, CaseStatus, CrimeType, User } from '../../types';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

// ── Design tokens matching Dashboard / CriminalsPage ──────────────────────────
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

const STATUS_META: Record<CaseStatus, { color: string; glow: string; label: string; Icon: React.ElementType }> = {
    PENDING:       { color: '#FF9800', glow: 'rgba(255,152,0,0.28)',   label: 'Pending',       Icon: PendingIcon },
    INVESTIGATING: { color: '#00B0FF', glow: 'rgba(0,176,255,0.28)',   label: 'Investigating', Icon: InvestigatingIcon },
    RESOLVED:      { color: '#00E676', glow: 'rgba(0,230,118,0.28)',   label: 'Resolved',      Icon: ResolvedIcon },
    CLOSED:        { color: '#78909C', glow: 'rgba(120,144,156,0.28)', label: 'Closed',        Icon: ClosedIcon },
};

const CRIME_TYPE_COLORS: Record<string, string> = {
    THEFT:       '#FF6D00',
    CYBERCRIME:  '#AA00FF',
    VIOLENCE:    '#FF1744',
    FRAUD:       '#F57F17',
    HARASSMENT:  '#D500F9',
    ACCIDENT:    '#0091EA',
    OTHER:       '#546E7A',
};

const CRIME_TYPES: CrimeType[] = ['THEFT', 'CYBERCRIME', 'VIOLENCE', 'FRAUD', 'HARASSMENT', 'ACCIDENT', 'OTHER'];
const STATUSES:   CaseStatus[] = ['PENDING', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const safeDate  = (v: unknown): Date | null => { if (!v) return null; const d = new Date(v as string); return isNaN(d.getTime()) ? null : d; };
const safeFmt   = (v: unknown, fmt: string) => { const d = safeDate(v); return d ? format(d, fmt) : '—'; };
const safeDist  = (v: unknown) => { const d = safeDate(v); return d ? formatDistanceToNow(d, { addSuffix: true }) : '—'; };
const userName  = (u: unknown): string => (u && typeof u === 'object' && 'name' in u) ? (u as any).name : '—';
const userPhone = (u: unknown): string => (u && typeof u === 'object' && 'phone' in u) ? (u as any).phone : '';
const suspectName   = (s: unknown): string => (s && typeof s === 'object' && 'name' in s) ? (s as any).name : '—';
const suspectDanger = (s: unknown): string => (s && typeof s === 'object' && 'dangerLevel' in s) ? (s as any).dangerLevel : '';

const DANGER_COLORS: Record<string, string> = { LOW: '#00E676', MEDIUM: '#FF9800', HIGH: '#FF5722', CRITICAL: '#FF1744' };

// ── Animated counter ──────────────────────────────────────────────────────────
const AnimNum: React.FC<{ value: number; duration?: number }> = ({ value, duration = 1 }) => {
    const [n, setN] = useState(0);
    useEffect(() => {
        const ctrl = animate(0, value, { duration, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) });
        return ctrl.stop;
    }, [value, duration]);
    return <>{n.toLocaleString()}</>;
};

// ── Glassmorphism Stat Card ───────────────────────────────────────────────────
const StatCard: React.FC<{
    label: string; value: number; color: string; glow: string;
    Icon: React.ElementType; active: boolean; onClick: () => void; delay?: number;
}> = ({ label, value, color, glow, Icon, active, onClick, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
        whileHover={{ y: -5, scale: 1.02 }}
        style={{ flex: 1, minWidth: 150, cursor: 'pointer' }}
        onClick={onClick}
    >
        <Box sx={{
            height: '100%', borderRadius: '16px', position: 'relative', overflow: 'hidden',
            background: `linear-gradient(135deg, ${DARK_BG} 0%, ${DARK_BG2} 100%)`,
            border: `1px solid ${active ? color + '66' : color + '22'}`,
            boxShadow: active
                ? `0 0 0 1px ${color}44, 0 8px 32px rgba(0,0,0,0.5), 0 0 28px ${glow}`
                : `0 0 0 1px ${color}14, 0 8px 32px rgba(0,0,0,0.4)`,
            backdropFilter: 'blur(20px)',
            transition: 'all 0.3s ease',
            '&:hover': { boxShadow: `0 0 0 1px ${color}50, 0 20px 48px rgba(0,0,0,0.5), 0 0 32px ${glow}` },
        }}>
            {/* Top accent line */}
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
            {/* Glow blob */}
            <Box sx={{ position: 'absolute', top: -40, right: -40, width: 110, height: 110,
                borderRadius: '50%', background: `${color}12`, filter: 'blur(28px)', pointerEvents: 'none' }} />
            <Box sx={{ p: '18px 20px 16px' }}>
                <Box sx={{ mb: 1.5 }}>
                    <Box sx={{
                        width: 40, height: 40, borderRadius: '12px',
                        background: `linear-gradient(135deg, ${color}22, ${color}0E)`,
                        border: `1px solid ${color}28`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        '& svg': { fontSize: 20, color },
                    }}>
                        <Icon />
                    </Box>
                </Box>
                <Typography sx={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: active ? color : 'text.primary',
                    textShadow: active ? `0 0 20px ${glow}` : 'none', transition: 'all 0.3s' }}>
                    <AnimNum value={value} />
                </Typography>
                <Typography sx={{ fontSize: 11, color: active ? color : 'text.secondary', mt: 0.5,
                    fontWeight: active ? 700 : 400, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {label}
                </Typography>
            </Box>
        </Box>
    </motion.div>
);

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: CaseStatus }> = ({ status }) => {
    const m = STATUS_META[status];
    return (
        <Chip
            icon={<Box sx={{ color: `${m.color} !important`, display: 'flex', alignItems: 'center' }}>
                <RadioIcon sx={{ fontSize: '10px !important' }} />
            </Box>}
            label={m.label}
            size="small"
            sx={{
                fontSize: 10, height: 22, fontWeight: 700,
                bgcolor: `${m.color}1A`, color: m.color,
                border: `1px solid ${m.color}44`,
                boxShadow: `0 0 8px ${m.glow}`,
            }}
        />
    );
};

// ── Crime type chip ────────────────────────────────────────────────────────────
const CrimeChip: React.FC<{ category: string }> = ({ category }) => {
    const color = CRIME_TYPE_COLORS[category] || '#546E7A';
    return (
        <Chip label={category} size="small" sx={{
            fontSize: 10, height: 20, fontWeight: 700,
            bgcolor: `${color}18`, color, border: `1px solid ${color}44`,
        }} />
    );
};

// ── Case Row (list view) ──────────────────────────────────────────────────────
const CaseRow: React.FC<{ c: Case; index: number; onClick: () => void }> = ({ c, index, onClick }) => {
    const color    = STATUS_META[c.status]?.color || '#fff';
    const catColor = CRIME_TYPE_COLORS[c.category] || '#546E7A';
    const reporter = userName(c.filedBy);
    const suspect  = suspectName(c.suspect);
    const hasSuspect = c.suspect && typeof c.suspect === 'object' && 'name' in (c.suspect as object);

    return (
        <motion.div
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: index * 0.035 }}
            whileHover={{ x: 4 }}
        >
            <Box onClick={onClick} sx={{
                ...glass, p: '14px 18px', mb: 1, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 2,
                borderRadius: '12px', borderLeft: `3px solid ${color}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                    border: `1px solid ${color}44`,
                    borderLeft: `3px solid ${color}`,
                    boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 16px ${STATUS_META[c.status]?.glow}`,
                },
            }}>
                {/* Category icon */}
                <Box sx={{
                    width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                    background: `linear-gradient(135deg, ${catColor}22, ${catColor}0A)`,
                    border: `1px solid ${catColor}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 900, color: catColor }}>
                        {c.category.charAt(0)}
                    </Typography>
                </Box>

                {/* Title + meta */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.4}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 }}>
                            {c.title}
                        </Typography>
                        <CrimeChip category={c.category} />
                        {c.aiCategory && (
                            <Chip icon={<AiIcon sx={{ fontSize: '10px !important' }} />}
                                label="AI" size="small"
                                sx={{ fontSize: 9, height: 18, bgcolor: 'rgba(156,39,176,0.12)', color: '#CE93D8',
                                    border: '1px solid rgba(156,39,176,0.3)', '& .MuiChip-icon': { fontSize: 10, ml: '4px' } }} />
                        )}
                    </Box>
                    <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <PersonIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{reporter}</Typography>
                        </Box>
                        {hasSuspect && (
                            <Box display="flex" alignItems="center" gap={0.5}>
                                <SuspectIcon sx={{ fontSize: 11, color: DANGER_COLORS[suspectDanger(c.suspect)] || '#FF5722' }} />
                                <Typography sx={{ fontSize: 11, color: DANGER_COLORS[suspectDanger(c.suspect)] || 'text.secondary', fontWeight: 600 }}>
                                    {suspect}
                                </Typography>
                            </Box>
                        )}
                        {c.location?.address && (
                            <Box display="flex" alignItems="center" gap={0.4}>
                                <LocationIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                                <Typography sx={{ fontSize: 11, color: 'text.disabled',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
                                    {c.location.address}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Right: status + time */}
                <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.8} flexShrink={0}>
                    <StatusBadge status={c.status} />
                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                        {safeDist(c.createdAt)}
                    </Typography>
                </Box>
            </Box>
        </motion.div>
    );
};

// ── Case Card (grid view) ─────────────────────────────────────────────────────
const CaseCard: React.FC<{ c: Case; index: number; onClick: () => void }> = ({ c, index, onClick }) => {
    const color    = STATUS_META[c.status]?.color || '#fff';
    const catColor = CRIME_TYPE_COLORS[c.category] || '#546E7A';
    const reporter = userName(c.filedBy);
    const suspect  = suspectName(c.suspect);
    const hasSuspect = c.suspect && typeof c.suspect === 'object' && 'name' in (c.suspect as object);
    const dangerColor = hasSuspect ? DANGER_COLORS[suspectDanger(c.suspect)] || '#FF5722' : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ y: -6, scale: 1.02 }}
            style={{ cursor: 'pointer' }}
            onClick={onClick}
        >
            <Box sx={{
                ...glass, height: '100%', overflow: 'hidden', position: 'relative',
                transition: 'all 0.3s ease',
                '&:hover': { border: `1px solid ${color}44`, boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 24px ${STATUS_META[c.status]?.glow}` },
            }}>
                {/* Top gradient bar */}
                <Box sx={{ height: 3, background: `linear-gradient(90deg, ${catColor}, ${color})` }} />
                {/* Glow blob */}
                <Box sx={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90,
                    borderRadius: '50%', background: `${catColor}0D`, filter: 'blur(24px)', pointerEvents: 'none' }} />

                <Box sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.2}>
                        <CrimeChip category={c.category} />
                        <StatusBadge status={c.status} />
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.8, lineHeight: 1.4,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {c.title}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1.5, lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {c.description}
                    </Typography>
                    <Divider sx={{ borderColor: BORDER, mb: 1.5 }} />

                    {/* Reporter */}
                    <Box display="flex" alignItems="center" gap={0.8} mb={0.8}>
                        <Avatar sx={{ width: 20, height: 20, bgcolor: '#1565C0', fontSize: 10, fontWeight: 700 }}>
                            {reporter.charAt(0)}
                        </Avatar>
                        <Box>
                            <Typography sx={{ fontSize: 9, color: 'text.disabled', lineHeight: 1 }}>Reporter</Typography>
                            <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{reporter}</Typography>
                        </Box>
                    </Box>

                    {/* Suspect */}
                    {hasSuspect && (
                        <Box display="flex" alignItems="center" gap={0.8} mb={0.8}>
                            <Box sx={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                background: `${dangerColor}22`, border: `1px solid ${dangerColor}44`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <SuspectIcon sx={{ fontSize: 11, color: dangerColor }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 9, color: 'text.disabled', lineHeight: 1 }}>Suspect</Typography>
                                <Typography sx={{ fontSize: 11, fontWeight: 600, color: dangerColor }}>{suspect}</Typography>
                            </Box>
                        </Box>
                    )}

                    {c.location?.address && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <LocationIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                            <Typography sx={{ fontSize: 10, color: 'text.disabled',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.location.address}
                            </Typography>
                        </Box>
                    )}

                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={1.5} pt={1.2}
                        sx={{ borderTop: `1px solid ${BORDER}` }}>
                        {c.aiCategory ? (
                            <Chip icon={<AiIcon sx={{ fontSize: '10px !important' }} />}
                                label={`AI: ${Math.round((c.aiConfidence || 0) * 100)}%`} size="small"
                                sx={{ fontSize: 9, height: 18, bgcolor: 'rgba(156,39,176,0.1)', color: '#CE93D8',
                                    border: '1px solid rgba(156,39,176,0.25)', '& .MuiChip-icon': { fontSize: 10, ml: '4px' } }} />
                        ) : <Box />}
                        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                            {safeDist(c.createdAt)}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </motion.div>
    );
};

// ── Skeletons ─────────────────────────────────────────────────────────────────
const RowSkeleton = () => (
    <Box sx={{ ...glass, p: '14px 18px', mb: 1, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 2 }}>
        <Skeleton variant="rounded" width={38} height={38} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '10px', flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
            <Skeleton height={16} width="45%" sx={{ bgcolor: 'rgba(255,255,255,0.07)', mb: 0.5 }} />
            <Skeleton height={12} width="65%" sx={{ bgcolor: 'rgba(255,255,255,0.04)' }} />
        </Box>
        <Skeleton height={22} width={90} sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 8 }} />
    </Box>
);
const CardSkeleton = () => (
    <Box sx={{ ...glass, height: 210 }}>
        <Skeleton height={3} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
        <Box sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" mb={1.2}>
                <Skeleton width={65} height={20} sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 8 }} />
                <Skeleton width={80} height={20} sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 8 }} />
            </Box>
            <Skeleton height={16} sx={{ bgcolor: 'rgba(255,255,255,0.07)' }} />
            <Skeleton height={12} sx={{ bgcolor: 'rgba(255,255,255,0.05)', mt: 1 }} />
            <Skeleton height={12} width="80%" sx={{ bgcolor: 'rgba(255,255,255,0.04)', mt: 0.5 }} />
        </Box>
    </Box>
);

// ── Pagination ────────────────────────────────────────────────────────────────
const PillBtn: React.FC<{ label: string; active?: boolean; disabled?: boolean; onClick: () => void }> =
    ({ label, active, disabled, onClick }) => (
        <Box component="button" onClick={!disabled ? onClick : undefined} sx={{
            minWidth: 34, height: 34, borderRadius: '10px',
            border: `1px solid ${active ? '#FF1744' : BORDER}`,
            background: active ? 'rgba(255,23,68,0.2)' : G,
            color: active ? '#FF1744' : disabled ? 'text.disabled' : 'text.secondary',
            fontWeight: active ? 700 : 400, fontSize: 13, cursor: disabled ? 'default' : 'pointer',
            transition: 'all 0.2s',
            '&:hover': { background: !disabled && !active ? 'rgba(255,255,255,0.07)' : undefined },
        }}>
            {label}
        </Box>
    );

const PillPagination: React.FC<{ page: number; pages: number; total: number; onChange: (p: number) => void }> =
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
                    Page {page} of {pages} · {total} cases
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

// ── Case Detail Drawer ────────────────────────────────────────────────────────
const CaseDetailDrawer: React.FC<{
    caseId: string | null;
    officers: User[];
    onClose: () => void;
    onUpdated: () => void;
}> = ({ caseId, officers, onClose, onUpdated }) => {
    const queryClient = useQueryClient();
    const [newStatus, setNewStatus]   = useState<CaseStatus | ''>('');
    const [statusNote, setStatusNote] = useState('');
    const [officerId, setOfficerId]   = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['case-detail', caseId],
        queryFn: () => casesService.getById(caseId!),
        enabled: !!caseId,
    });
    const caseDoc: Case | null = (data?.data as any)?.case || null;

    const statusMutation = useMutation({
        mutationFn: ({ status, note }: { status: string; note: string }) =>
            casesService.updateStatus(caseId!, status, note),
        onSuccess: () => {
            toast.success('Status updated');
            queryClient.invalidateQueries({ queryKey: ['case-detail', caseId] });
            onUpdated(); setNewStatus(''); setStatusNote('');
        },
        onError: () => toast.error('Failed to update status'),
    });

    const assignMutation = useMutation({
        mutationFn: (oid: string) => casesService.assignOfficer(caseId!, oid),
        onSuccess: () => {
            toast.success('Officer assigned');
            queryClient.invalidateQueries({ queryKey: ['case-detail', caseId] });
            onUpdated(); setOfficerId('');
        },
        onError: () => toast.error('Failed to assign officer'),
    });

    const color = caseDoc ? STATUS_META[caseDoc.status]?.color : '#fff';
    const catColor = caseDoc ? CRIME_TYPE_COLORS[caseDoc.category] || '#546E7A' : '#546E7A';
    const reporter  = caseDoc ? userName(caseDoc.filedBy) : '—';
    const suspect   = caseDoc?.suspect;
    const hasSuspect = suspect && typeof suspect === 'object' && 'name' in (suspect as object);
    const suspectColor = hasSuspect ? DANGER_COLORS[(suspect as any).dangerLevel] || '#FF5722' : null;

    return (
        <Drawer anchor="right" open={!!caseId} onClose={onClose} PaperProps={{
            sx: {
                width: { xs: '100vw', sm: 500 },
                background: `linear-gradient(180deg, ${DARK_BG2} 0%, rgba(10,14,26,0.99) 100%)`,
                backdropFilter: 'blur(30px)',
                borderLeft: `1px solid ${BORDER}`,
                overflowY: 'auto',
            },
        }}>
            {isLoading && <LinearProgress sx={{ '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #FF9800, #FF1744)' } }} />}

            {/* Drawer Header */}
            <Box sx={{ p: 3, borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, zIndex: 1,
                background: `linear-gradient(180deg, ${DARK_BG2} 0%, transparent 100%)`, backdropFilter: 'blur(20px)' }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1} mr={1}>
                        {caseDoc ? (
                            <>
                                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                    <CrimeChip category={caseDoc.category} />
                                    <StatusBadge status={caseDoc.status} />
                                </Box>
                                <Typography sx={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>
                                    {caseDoc.title}
                                </Typography>
                                <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>
                                    Filed {safeDist(caseDoc.createdAt)}
                                </Typography>
                            </>
                        ) : <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Case Details</Typography>}
                    </Box>
                    <IconButton onClick={onClose} size="small" sx={{
                        color: 'text.secondary', border: `1px solid ${BORDER}`, flexShrink: 0,
                        '&:hover': { color: '#FF1744', borderColor: '#FF174444' },
                    }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Box>

            {caseDoc && (
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Accent gradient */}
                    <Box sx={{ height: '2px', background: `linear-gradient(90deg, ${catColor}, ${color}, transparent)`, borderRadius: 1 }} />

                    {/* Description */}
                    <Box sx={{ ...glass, p: 2, borderRadius: '12px' }}>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 1, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>Description</Typography>
                        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.6 }}>{caseDoc.description}</Typography>
                    </Box>

                    {/* Reporter + Suspect */}
                    <Box display="flex" gap={1.5}>
                        <Box sx={{ ...glass, p: 2, flex: 1, borderRadius: '12px' }}>
                            <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 1, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>Reported By</Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: '#1565C0', fontSize: 14, fontWeight: 700 }}>
                                    {reporter.charAt(0)}
                                </Avatar>
                                <Box>
                                    <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{reporter}</Typography>
                                    {userPhone(caseDoc.filedBy) && (
                                        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{userPhone(caseDoc.filedBy)}</Typography>
                                    )}
                                </Box>
                            </Box>
                        </Box>
                        {hasSuspect && (
                            <Box sx={{ ...glass, p: 2, flex: 1, borderRadius: '12px', border: `1px solid ${suspectColor}22` }}>
                                <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 1, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>Suspect</Typography>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                        background: `${suspectColor}22`, border: `1px solid ${suspectColor}44`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <SuspectIcon sx={{ fontSize: 16, color: suspectColor }} />
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: suspectColor }}>
                                            {(suspect as any).name}
                                        </Typography>
                                        <Typography sx={{ fontSize: 10, color: suspectColor + 'AA', fontWeight: 600 }}>
                                            {(suspect as any).dangerLevel} RISK
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        )}
                    </Box>

                    {/* Case info */}
                    <Box sx={{ ...glass, p: 2, borderRadius: '12px' }}>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 1.5, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>Case Information</Typography>
                        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1.5}>
                            {[
                                { label: 'Filed', value: safeFmt(caseDoc.createdAt, 'dd MMM yyyy') },
                                { label: 'Updated', value: safeFmt(caseDoc.updatedAt, 'dd MMM yyyy') },
                                { label: 'Category', value: caseDoc.category },
                                { label: 'Location', value: caseDoc.location?.address || '—' },
                            ].map(({ label, value }) => (
                                <Box key={label}>
                                    <Typography sx={{ fontSize: 9, color: 'text.disabled', mb: 0.3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
                                    <Typography sx={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</Typography>
                                </Box>
                            ))}
                        </Box>
                        {caseDoc.assignedOfficer && typeof caseDoc.assignedOfficer === 'object' && (
                            <Box mt={1.5} pt={1.5} sx={{ borderTop: `1px solid ${BORDER}` }}>
                                <Typography sx={{ fontSize: 9, color: 'text.disabled', mb: 0.8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Assigned Officer</Typography>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: 'rgba(0,176,255,0.15)',
                                        border: '1px solid rgba(0,176,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <PoliceIcon sx={{ fontSize: 14, color: '#00B0FF' }} />
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{userName(caseDoc.assignedOfficer)}</Typography>
                                        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                                            {(caseDoc.assignedOfficer as any).badgeId} · {(caseDoc.assignedOfficer as any).station}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        )}
                        {caseDoc.aiCategory && (
                            <Box mt={1.5} pt={1.5} sx={{ borderTop: `1px solid ${BORDER}` }}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <AiIcon sx={{ fontSize: 14, color: '#CE93D8' }} />
                                    <Typography sx={{ fontSize: 11, color: '#CE93D8' }}>
                                        AI: {caseDoc.aiCategory} · {Math.round((caseDoc.aiConfidence || 0) * 100)}% confidence
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>

                    {/* Timeline */}
                    {caseDoc.timeline && caseDoc.timeline.length > 0 && (
                        <Box sx={{ ...glass, p: 2, borderRadius: '12px' }}>
                            <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 1.5, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>Activity Timeline</Typography>
                            {[...caseDoc.timeline].reverse().map((entry: any, idx: number) => {
                                const m = STATUS_META[(entry.status as CaseStatus)] || STATUS_META.PENDING;
                                return (
                                    <Box key={idx} display="flex" gap={1.5} mb={idx < caseDoc.timeline.length - 1 ? 1.5 : 0}>
                                        <Box display="flex" flexDirection="column" alignItems="center">
                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: m.color, boxShadow: `0 0 6px ${m.glow}`, flexShrink: 0, mt: 0.5 }} />
                                            {idx < caseDoc.timeline.length - 1 && (
                                                <Box sx={{ width: 1, flex: 1, bgcolor: `${m.color}22`, mt: 0.5 }} />
                                            )}
                                        </Box>
                                        <Box sx={{ flex: 1, pb: 1 }}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: m.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                    {entry.status}
                                                </Typography>
                                                <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>
                                                    {safeFmt(entry.timestamp, 'dd MMM · HH:mm')}
                                                </Typography>
                                            </Box>
                                            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.3 }}>{entry.note}</Typography>
                                            {entry.updatedBy?.name && (
                                                <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.2 }}>by {entry.updatedBy.name}</Typography>
                                            )}
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    )}

                    {/* Update Status */}
                    <Box sx={{ ...glass, p: 2, borderRadius: '12px', border: `1px solid rgba(255,152,0,0.15)` }}>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 1.5, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>Update Status</Typography>
                        <FormControl fullWidth size="small" sx={{ mb: 1.5,
                            '& .MuiOutlinedInput-root': { background: G,
                                '& fieldset': { borderColor: BORDER },
                                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                '&.Mui-focused fieldset': { borderColor: '#FF9800' } } }}>
                            <InputLabel sx={{ fontSize: 12 }}>New Status</InputLabel>
                            <Select value={newStatus} label="New Status" onChange={(e) => setNewStatus(e.target.value as CaseStatus)}>
                                {STATUSES.map((s) => (
                                    <MenuItem key={s} value={s} sx={{ fontSize: 12 }}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <DotIcon sx={{ fontSize: 10, color: STATUS_META[s].color }} />
                                            {STATUS_META[s].label}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField fullWidth size="small" multiline rows={2} placeholder="Add a note (optional)…"
                            value={statusNote} onChange={(e) => setStatusNote(e.target.value)}
                            sx={{ mb: 1.5,
                                '& .MuiOutlinedInput-root': { background: G, fontSize: 12,
                                    '& fieldset': { borderColor: BORDER },
                                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                    '&.Mui-focused fieldset': { borderColor: '#FF9800' } } }} />
                        <Button fullWidth variant="contained" disabled={!newStatus || statusMutation.isPending}
                            onClick={() => newStatus && statusMutation.mutate({ status: newStatus, note: statusNote })}
                            startIcon={<UpdateIcon />}
                            sx={{ background: 'linear-gradient(135deg, #FF9800, #FF6D00)', fontWeight: 700, fontSize: 12,
                                textTransform: 'none', borderRadius: '10px',
                                '&:hover': { background: 'linear-gradient(135deg, #FFA726, #FF8F00)' },
                                '&:disabled': { opacity: 0.4, background: 'linear-gradient(135deg, #FF9800, #FF6D00)' } }}>
                            {statusMutation.isPending ? 'Updating…' : 'Update Status'}
                        </Button>
                    </Box>

                    {/* Assign Officer */}
                    <Box sx={{ ...glass, p: 2, borderRadius: '12px', border: `1px solid rgba(0,176,255,0.15)` }}>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 1.5, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>Assign Officer</Typography>
                        <FormControl fullWidth size="small" sx={{ mb: 1.5,
                            '& .MuiOutlinedInput-root': { background: G,
                                '& fieldset': { borderColor: BORDER },
                                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                '&.Mui-focused fieldset': { borderColor: '#00B0FF' } } }}>
                            <InputLabel sx={{ fontSize: 12 }}>Select Officer</InputLabel>
                            <Select value={officerId} label="Select Officer" onChange={(e) => setOfficerId(e.target.value)}>
                                {officers.map((o) => (
                                    <MenuItem key={o._id} value={o._id} sx={{ fontSize: 12 }}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <PoliceIcon sx={{ fontSize: 14, color: '#00B0FF' }} />
                                            {o.name}{(o as any).badgeId ? ` · ${(o as any).badgeId}` : ''}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button fullWidth variant="contained" disabled={!officerId || assignMutation.isPending}
                            onClick={() => officerId && assignMutation.mutate(officerId)}
                            startIcon={<AssignIcon />}
                            sx={{ background: 'linear-gradient(135deg, #0091EA, #00B0FF)', fontWeight: 700, fontSize: 12,
                                textTransform: 'none', borderRadius: '10px',
                                '&:hover': { background: 'linear-gradient(135deg, #0277BD, #0091EA)' },
                                '&:disabled': { opacity: 0.4, background: 'linear-gradient(135deg, #0091EA, #00B0FF)' } }}>
                            {assignMutation.isPending ? 'Assigning…' : 'Assign Officer'}
                        </Button>
                    </Box>
                </Box>
            )}
        </Drawer>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const CasesPage: React.FC = () => {
    const [page, setPage]                 = useState(1);
    const [filterStatus, setFilterStatus] = useState<CaseStatus | ''>('');
    const [filterType, setFilterType]     = useState<CrimeType | ''>('');
    const [search, setSearch]             = useState('');
    const [searchInput, setSearchInput]   = useState('');
    const [viewMode, setViewMode]         = useState<'list' | 'grid'>('list');
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const LIMIT = 15;

    const commitSearch = useCallback(() => { setSearch(searchInput); setPage(1); }, [searchInput]);

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['cases', page, filterStatus, filterType, search],
        queryFn: () => casesService.getAll({
            page, limit: LIMIT,
            status: filterStatus || undefined,
            category: filterType || undefined,
            search: search || undefined,
        }),
        refetchInterval: 30_000,
    });

    const { data: officersData } = useQuery({
        queryKey: ['all-officers'],
        queryFn: () => policeService.getAll({ isActive: true, page: 1 }),
    });

    const sq0 = useQuery({ queryKey: ['cases-count', 'PENDING'],       queryFn: () => casesService.getAll({ status: 'PENDING',       limit: 1, page: 1 }), refetchInterval: 60_000 });
    const sq1 = useQuery({ queryKey: ['cases-count', 'INVESTIGATING'], queryFn: () => casesService.getAll({ status: 'INVESTIGATING', limit: 1, page: 1 }), refetchInterval: 60_000 });
    const sq2 = useQuery({ queryKey: ['cases-count', 'RESOLVED'],      queryFn: () => casesService.getAll({ status: 'RESOLVED',      limit: 1, page: 1 }), refetchInterval: 60_000 });
    const sq3 = useQuery({ queryKey: ['cases-count', 'CLOSED'],        queryFn: () => casesService.getAll({ status: 'CLOSED',        limit: 1, page: 1 }), refetchInterval: 60_000 });
    const statsQueries = [sq0, sq1, sq2, sq3];

    const cases: Case[]  = (data?.data as any)?.data?.cases  || [];
    const total: number  = (data?.data as any)?.data?.total  || 0;
    const pages: number  = (data?.data as any)?.data?.pages  || 1;
    const officers: User[] = (officersData?.data as any)?.officers || [];

    const resetFilters = () => { setFilterStatus(''); setFilterType(''); setSearch(''); setSearchInput(''); setPage(1); };
    const hasFilter = !!(filterStatus || filterType || search);

    return (
        <Box sx={{ minHeight: '100vh', pb: 4 }}>

            {/* ── Page Header ── */}
            <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Box sx={{
                            width: 44, height: 44, borderRadius: '13px',
                            background: 'linear-gradient(135deg, rgba(255,23,68,0.2), rgba(255,23,68,0.05))',
                            border: '1px solid rgba(255,23,68,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 20px rgba(255,23,68,0.1)',
                        }}>
                            <CaseIcon sx={{ color: '#FF1744', fontSize: 24 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1 }}>
                                Case Management
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {isFetching ? 'Refreshing…' : `${total} total cases · Active investigations`}
                            </Typography>
                        </Box>
                    </Box>
                    <Tooltip title="Refresh data">
                        <IconButton onClick={() => refetch()} size="small" sx={{
                            color: 'text.secondary', border: `1px solid ${BORDER}`, background: G,
                            '&:hover': { color: '#FF1744', borderColor: '#FF174444', background: 'rgba(255,23,68,0.08)' },
                        }}>
                            <motion.div animate={isFetching ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                                <RefreshIcon fontSize="small" />
                            </motion.div>
                        </IconButton>
                    </Tooltip>
                </Box>
            </motion.div>

            {/* ── Stat Cards ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                <Box display="flex" gap={2} mb={3} flexWrap="wrap">
                    {STATUSES.map((s, i) => {
                        const meta  = STATUS_META[s];
                        const count = (statsQueries[i].data?.data as any)?.data?.total ?? 0;
                        return (
                            <StatCard
                                key={s}
                                label={meta.label}
                                value={count}
                                color={meta.color}
                                glow={meta.glow}
                                Icon={meta.Icon}
                                active={filterStatus === s}
                                delay={0.1 + i * 0.07}
                                onClick={() => { setFilterStatus(filterStatus === s ? '' : s); setPage(1); }}
                            />
                        );
                    })}
                </Box>
            </motion.div>

            {/* ── Search + Filter Bar ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
                <Box sx={{ ...glass, p: 2, mb: 2.5, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField size="small" placeholder="Search cases by title or description…"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && commitSearch()}
                        sx={{ flex: 1, minWidth: 240,
                            '& .MuiOutlinedInput-root': { background: G, fontSize: 13,
                                '& fieldset': { borderColor: BORDER },
                                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.18)' },
                                '&.Mui-focused fieldset': { borderColor: '#FF1744', boxShadow: '0 0 0 3px rgba(255,23,68,0.08)' } } }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 17, color: 'text.disabled' }} />
                                </InputAdornment>
                            ),
                            endAdornment: searchInput && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>
                                        <CloseIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    {/* Crime type filter buttons */}
                    <Box display="flex" gap={0.7} flexWrap="wrap">
                        {CRIME_TYPES.map((t) => {
                            const c = CRIME_TYPE_COLORS[t];
                            const active = filterType === t;
                            return (
                                <Box key={t} component="button"
                                    onClick={() => { setFilterType(active ? '' : t); setPage(1); }}
                                    sx={{ px: 1.2, py: 0.4, borderRadius: '8px', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                                        bgcolor: active ? `${c}22` : G, color: active ? c : 'text.secondary',
                                        border: `1px solid ${active ? c + '55' : BORDER}`,
                                        transition: 'all 0.2s',
                                        '&:hover': { bgcolor: `${c}15`, color: c, borderColor: `${c}44` } }}>
                                    {t}
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
                                '&.Mui-selected': { bgcolor: 'rgba(255,23,68,0.12)', color: '#FF1744', borderColor: '#FF174433' } } }}>
                            <ToggleButton value="list"><ListIcon fontSize="small" /></ToggleButton>
                            <ToggleButton value="grid"><GridIcon fontSize="small" /></ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </Box>
            </motion.div>

            {/* ── Case List / Grid ── */}
            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {viewMode === 'list'
                            ? [...Array(8)].map((_, i) => <RowSkeleton key={i} />)
                            : <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 2 }}>
                                {[...Array(9)].map((_, i) => <CardSkeleton key={i} />)}
                            </Box>}
                    </motion.div>
                ) : cases.length === 0 ? (
                    <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <Box sx={{ ...glass, p: 8, textAlign: 'center' }}>
                            <FilterIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 2 }} />
                            <Typography fontWeight={700} fontSize={16}>No cases found</Typography>
                            <Typography variant="body2" color="text.secondary" mt={1}>
                                {hasFilter ? 'Try clearing filters or a different search term.' : 'No cases have been filed yet.'}
                            </Typography>
                            {hasFilter && (
                                <Box component="button" onClick={resetFilters} sx={{
                                    mt: 2, px: 3, py: 1, border: '1px solid rgba(255,23,68,0.4)',
                                    borderRadius: '10px', background: 'rgba(255,23,68,0.1)', color: '#FF1744',
                                    cursor: 'pointer', fontSize: 13, fontWeight: 700,
                                }}>Clear Filters</Box>
                            )}
                        </Box>
                    </motion.div>
                ) : viewMode === 'list' ? (
                    <motion.div key={`list-${page}-${filterStatus}-${filterType}-${search}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {cases.map((c, i) => (
                            <CaseRow key={c._id} c={c} index={i} onClick={() => setSelectedCaseId(c._id)} />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div key={`grid-${page}-${filterStatus}-${filterType}-${search}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 2 }}>
                            {cases.map((c, i) => (
                                <CaseCard key={c._id} c={c} index={i} onClick={() => setSelectedCaseId(c._id)} />
                            ))}
                        </Box>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Pagination ── */}
            {!isLoading && cases.length > 0 && (
                <PillPagination page={page} pages={pages} total={total} onChange={(p) => setPage(p)} />
            )}

            {/* ── Case Detail Drawer ── */}
            <CaseDetailDrawer
                caseId={selectedCaseId}
                officers={officers}
                onClose={() => setSelectedCaseId(null)}
                onUpdated={() => {
                    refetch();
                    sq0.refetch(); sq1.refetch(); sq2.refetch(); sq3.refetch();
                }}
            />
        </Box>
    );
};
