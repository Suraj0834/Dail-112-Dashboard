// =============================================================================
// pages/criminals/CriminalsPage.tsx — Criminal Database — fully redesigned
// =============================================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Box, Typography, Avatar, Chip, TextField, InputAdornment,
    IconButton, Tooltip, Skeleton, Divider, Dialog, DialogTitle,
    DialogContent, DialogActions, Select, MenuItem, FormControl,
    InputLabel,
} from '@mui/material';
import {
    Search as SearchIcon, Close as CloseIcon, Add as AddIcon,
    Refresh as RefreshIcon, FilterList as FilterIcon,
    Warning as WarrantIcon, Face as FaceIcon, Upload as UploadIcon,
    SmartToy as AiIcon, Person as PersonIcon,
    LocationOn as LocationIcon, History as HistoryIcon,
    Shield as ShieldIcon, Error as CriticalIcon,
    ViewModule as GridViewIcon, ViewList as ListViewIcon, CameraAlt as CameraIcon,
    Fingerprint as FingerprintIcon, Security as SecurityIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { criminalsService, aiService } from '../../services/api.service';
import { Criminal, DangerLevel, FaceRecognitionResult } from '../../types';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

// ── Design tokens matching Dashboard ─────────────────────────────────────────
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

const DANGER_META: Record<DangerLevel, { color: string; glow: string; label: string; icon: React.ReactNode }> = {
    LOW:      { color: '#00E676', glow: 'rgba(0,230,118,0.25)',  label: 'Low',      icon: <ShieldIcon sx={{ fontSize: 12 }} /> },
    MEDIUM:   { color: '#FF9800', glow: 'rgba(255,152,0,0.25)',  label: 'Medium',   icon: <WarrantIcon sx={{ fontSize: 12 }} /> },
    HIGH:     { color: '#FF5722', glow: 'rgba(255,87,34,0.25)',  label: 'High',     icon: <CriticalIcon sx={{ fontSize: 12 }} /> },
    CRITICAL: { color: '#FF1744', glow: 'rgba(255,23,68,0.35)',  label: 'Critical', icon: <CriticalIcon sx={{ fontSize: 12 }} /> },
};

const DANGER_LEVELS: DangerLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const safeDate = (v: unknown): Date | null => {
    if (!v) return null;
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? null : d;
};
const safeFmt  = (v: unknown, fmt: string) => { const d = safeDate(v); return d ? format(d, fmt) : '—'; };
const safeDist = (v: unknown) => { const d = safeDate(v); return d ? formatDistanceToNow(d, { addSuffix: true }) : '—'; };

// ── DangerBadge ───────────────────────────────────────────────────────────────
const DangerBadge: React.FC<{ level: DangerLevel }> = ({ level }) => {
    const m = DANGER_META[level];
    return (
        <Chip
            icon={<Box sx={{ color: `${m.color} !important`, display: 'flex', alignItems: 'center' }}>{m.icon}</Box>}
            label={m.label}
            size="small"
            sx={{
                fontSize: 10, height: 22, fontWeight: 800,
                bgcolor: `${m.color}1A`, color: m.color,
                border: `1px solid ${m.color}44`,
                boxShadow: level === 'CRITICAL' ? `0 0 10px ${m.glow}` : 'none',
            }}
        />
    );
};

// ── Animated counter (matches dashboard pattern) ─────────────────────────────
const AnimNum: React.FC<{ value: number; duration?: number }> = ({ value, duration = 1 }) => {
    const [n, setN] = useState(0);
    useEffect(() => {
        const ctrl = animate(0, value, { duration, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) });
        return ctrl.stop;
    }, [value, duration]);
    return <>{n.toLocaleString()}</>;
};

// ── Glassmorphism stat card (dashboard style with glow + top accent) ──────────
interface StatCardProps { label: string; value: number; icon: React.ReactNode; color: string; sub?: string; delay?: number }
const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, sub, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
        whileHover={{ y: -5, scale: 1.02 }}
        style={{ height: '100%' }}
    >
        <Box sx={{
            height: '100%', borderRadius: '16px', position: 'relative', overflow: 'hidden',
            background: `linear-gradient(135deg, ${DARK_BG} 0%, ${DARK_BG2} 100%)`,
            border: `1px solid ${color}28`,
            boxShadow: `0 0 0 1px ${color}14, 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`,
            backdropFilter: 'blur(20px)',
            transition: 'box-shadow 0.3s ease',
            '&:hover': { boxShadow: `0 0 0 1px ${color}50, 0 20px 48px rgba(0,0,0,0.5), 0 0 32px ${color}18` },
        }}>
            {/* Top accent line */}
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
            {/* Glow blob */}
            <Box sx={{ position: 'absolute', top: -40, right: -40, width: 110, height: 110, borderRadius: '50%', background: `${color}10`, filter: 'blur(28px)', pointerEvents: 'none' }} />
            <Box sx={{ p: '18px 22px 16px' }}>
                <Box sx={{ mb: 1.8 }}>
                    <Box sx={{
                        width: 44, height: 44, borderRadius: '13px',
                        background: `linear-gradient(135deg, ${color}22, ${color}0E)`,
                        border: `1px solid ${color}28`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        '& svg': { fontSize: 22, color },
                    }}>
                        {icon}
                    </Box>
                </Box>
                <Typography sx={{ fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px', color: '#fff' }}>
                    <AnimNum value={value} />
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontSize: 10, display: 'block', mt: 0.5 }}>
                    {label}
                </Typography>
                {sub && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.28)', fontSize: 10 }}>{sub}</Typography>}
            </Box>
        </Box>
    </motion.div>
);

// ── API base URL helper ───────────────────────────────────────────────────────
const API = 'http://localhost:5001';
const photoUrl = (p?: string) => p ? `${API}${p}` : undefined;

// ── Criminal card row (list view) ─────────────────────────────────────────────
const CriminalCard: React.FC<{ c: Criminal; index: number; onClick: () => void; selected: boolean }> = ({ c, index, onClick, selected }) => {
    const dm = DANGER_META[c.dangerLevel];
    return (
        <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02, duration: 0.3 }}
        >
            <Box
                onClick={onClick}
                sx={{
                    mb: 1.5, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 2,
                    borderRadius: '14px', p: '12px 16px',
                    background: selected
                        ? `linear-gradient(135deg, ${dm.color}12 0%, ${DARK_BG2} 100%)`
                        : `linear-gradient(135deg, ${DARK_BG} 0%, ${DARK_BG2} 100%)`,
                    border: `1px solid ${selected ? `${dm.color}55` : BORDER}`,
                    backdropFilter: 'blur(20px)',
                    boxShadow: selected ? `0 0 24px ${dm.glow}` : '0 2px 12px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        border: `1px solid ${dm.color}44`,
                        transform: 'translateX(4px)',
                        boxShadow: `0 4px 24px ${dm.glow}`,
                    },
                }}
            >
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar
                        src={photoUrl(c.photo)}
                        sx={{
                            width: 48, height: 48,
                            bgcolor: `${dm.color}20`, color: dm.color,
                            fontWeight: 900, fontSize: 18,
                            border: `2px solid ${dm.color}44`,
                            boxShadow: `0 0 12px ${dm.glow}`,
                        }}
                    >
                        {c.name[0]}
                    </Avatar>
                    {c.warrantStatus && (
                        <Box sx={{
                            position: 'absolute', bottom: -2, right: -2,
                            width: 13, height: 13, borderRadius: '50%',
                            bgcolor: '#FF1744', border: '2px solid #0A0E1A',
                            boxShadow: '0 0 8px rgba(255,23,68,0.9)',
                        }} />
                    )}
                </Box>
                <Box flex={1} minWidth={0}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[c.age ? `Age ${c.age}` : '', c.gender, c.lastKnownAddress].filter(Boolean).join(' · ')}
                    </Typography>
                </Box>
                <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.6} flexShrink={0}>
                    <DangerBadge level={c.dangerLevel} />
                    {c.warrantStatus && (
                        <Chip label="Warrant" size="small" sx={{ fontSize: 9, height: 17, bgcolor: 'rgba(255,23,68,0.12)', color: '#FF1744', border: '1px solid rgba(255,23,68,0.3)' }} />
                    )}
                </Box>
                <Box sx={{
                    px: 1.5, py: 1, borderRadius: '10px', flexShrink: 0, textAlign: 'center', minWidth: 46,
                    background: `${dm.color}12`, border: `1px solid ${dm.color}25`,
                }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 900, color: dm.color, lineHeight: 1 }}>{c.crimeHistory?.length || 0}</Typography>
                    <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 }}>cases</Typography>
                </Box>
            </Box>
        </motion.div>
    );
};

// ── Criminal grid card (dashboard design language) ───────────────────────────
const CriminalGridCard: React.FC<{ c: Criminal; index: number; onClick: () => void; selected: boolean }> = ({ c, index, onClick, selected }) => {
    const dm = DANGER_META[c.dangerLevel];
    return (
        <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.03, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ y: -6, scale: 1.02 }}
            style={{ cursor: 'pointer' }}
            onClick={onClick}
        >
            <Box sx={{
                borderRadius: '16px', overflow: 'hidden', height: 270,
                position: 'relative',
                border: `1px solid ${selected ? dm.color : BORDER}`,
                boxShadow: selected
                    ? `0 0 0 2px ${dm.color}, 0 12px 40px ${dm.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`
                    : `0 4px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)`,
                background: `linear-gradient(160deg, #060A14 0%, ${dm.color}0E 100%)`,
                transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
                '&:hover': {
                    boxShadow: `0 0 0 1px ${dm.color}88, 0 16px 48px ${dm.glow}`,
                    borderColor: `${dm.color}88`,
                    '& .mug-photo': { transform: 'scale(1.08)' },
                },
            }}>
                {/* Photo */}
                {c.photo ? (
                    <Box
                        component="img"
                        className="mug-photo"
                        src={photoUrl(c.photo)}
                        alt={c.name}
                        sx={{
                            position: 'absolute', inset: 0,
                            width: '100%', height: '100%',
                            objectFit: 'cover', objectPosition: 'center top',
                            transition: 'transform 0.4s ease',
                        }}
                    />
                ) : (
                    <Box sx={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: `linear-gradient(160deg, #080D1A 0%, ${dm.color}16 100%)`,
                    }}>
                        <Typography sx={{ fontSize: 80, fontWeight: 900, color: `${dm.color}22`, lineHeight: 1, userSelect: 'none' }}>
                            {c.name[0]?.toUpperCase()}
                        </Typography>
                        <Box sx={{ mt: 1, width: 36, height: 36, borderRadius: '50%', bgcolor: `${dm.color}12`, border: `1px solid ${dm.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CameraIcon sx={{ fontSize: 18, color: `${dm.color}45` }} />
                        </Box>
                    </Box>
                )}

                {/* Bottom gradient fade */}
                <Box sx={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '62%',
                    background: 'linear-gradient(to top, rgba(5,8,18,0.98) 0%, rgba(5,8,18,0.72) 45%, transparent 100%)',
                    pointerEvents: 'none',
                }} />

                {/* Top accent line */}
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent 0%, ${dm.color} 50%, transparent 100%)` }} />

                {/* Warrant badge */}
                {c.warrantStatus && (
                    <Box sx={{
                        position: 'absolute', top: 10, right: 10,
                        bgcolor: '#FF1744', borderRadius: '6px', px: 1, py: 0.3,
                        fontSize: 9, fontWeight: 900, color: '#fff', letterSpacing: 0.8, lineHeight: 1.5,
                        boxShadow: '0 0 12px rgba(255,23,68,0.8)',
                    }}>WARRANT</Box>
                )}

                {/* AI dot */}
                {c.hasEmbedding && (
                    <Tooltip title="AI Face Indexed">
                        <Box sx={{
                            position: 'absolute', top: 10, left: 10,
                            width: 10, height: 10, borderRadius: '50%',
                            bgcolor: '#AA00FF', boxShadow: '0 0 10px rgba(170,0,255,1)',
                        }} />
                    </Tooltip>
                )}

                {/* Name + info */}
                <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: '10px 12px 12px' }}>
                    <Typography sx={{
                        fontSize: 13, fontWeight: 800, color: '#fff',
                        textShadow: '0 1px 8px rgba(0,0,0,1)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        mb: 0.7, letterSpacing: 0.1,
                    }}>
                        {c.name}
                    </Typography>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <DangerBadge level={c.dangerLevel} />
                        <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', borderRadius: '6px', px: 0.9, py: 0.2, border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', lineHeight: 1 }}>
                                {c.crimeHistory?.length || 0} case{c.crimeHistory?.length !== 1 ? 's' : ''}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Bottom danger strip */}
                <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, bgcolor: dm.color, boxShadow: `0 0 16px ${dm.glow}`, borderRadius: '0 0 16px 16px' }} />

                {/* Selected glow */}
                {selected && (
                    <Box sx={{ position: 'absolute', inset: 0, borderRadius: '16px', boxShadow: `inset 0 0 28px ${dm.glow}`, pointerEvents: 'none' }} />
                )}
            </Box>
        </motion.div>
    );
};

// ── Face Recognition Panel ────────────────────────────────────────────────────
const FaceRecognitionPanel: React.FC = () => {
    const [file, setFile]         = useState<File | null>(null);
    const [preview, setPreview]   = useState<string>('');
    const [result, setResult]     = useState<FaceRecognitionResult | null>(null);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const fileRef                 = useRef<HTMLInputElement>(null);

    const mutation = useMutation({
        mutationFn: () => aiService.recognizeFace(file!),
        onSuccess: (res) => {
            const data = res.data as any;
            setErrorMsg('');
            if (data?.success === false) {
                setErrorMsg(data.message || 'Recognition failed');
            } else {
                setResult(data);
            }
        },
        onError: (e: any) => {
            const msg = e?.response?.data?.message || e?.response?.data?.detail || e?.message || 'Face recognition request failed';
            setErrorMsg(msg);
            toast.error(msg);
        },
    });

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f); setPreview(URL.createObjectURL(f)); setResult(null); setErrorMsg('');
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (!f || !f.type.startsWith('image/')) return;
        setFile(f); setPreview(URL.createObjectURL(f)); setResult(null); setErrorMsg('');
    };

    return (
        <Box sx={{
            ...glass, p: 3, position: 'relative', overflow: 'hidden',
            boxShadow: '0 0 0 1px rgba(170,0,255,0.12), 0 8px 40px rgba(0,0,0,0.4)',
        }}>
            {/* Top accent */}
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #AA00FF, transparent)' }} />
            {/* Glow blob */}
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 130, height: 130, borderRadius: '50%', background: 'rgba(170,0,255,0.06)', filter: 'blur(30px)', pointerEvents: 'none' }} />

            <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
                <Box sx={{
                    width: 38, height: 38, borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(170,0,255,0.22), rgba(170,0,255,0.08))',
                    border: '1px solid rgba(170,0,255,0.28)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    <AiIcon sx={{ fontSize: 20, color: '#AA00FF' }} />
                </Box>
                <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 800 }}>AI Face Recognition</Typography>
                    <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.3 }}>DeepFace neural matching · drag & drop</Typography>
                </Box>
            </Box>
            <Divider sx={{ borderColor: BORDER, mb: 2.5 }} />

            <Box
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                sx={{
                    border: `2px dashed ${preview ? 'rgba(170,0,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '12px', p: 2.5, textAlign: 'center', cursor: 'pointer', mb: 2,
                    minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                    bgcolor: preview ? 'rgba(170,0,255,0.06)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s',
                    '&:hover': { borderColor: '#AA00FF', bgcolor: 'rgba(170,0,255,0.05)' },
                }}
            >
                {preview ? (
                    <img src={preview} alt="Face" style={{ maxHeight: 140, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }} />
                ) : (
                    <>
                        <FaceIcon sx={{ fontSize: 44, color: 'rgba(255,255,255,0.18)', mb: 1 }} />
                        <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Click or drag & drop a face image</Typography>
                        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', mt: 0.4 }}>JPG · PNG · WebP · max 8 MB</Typography>
                    </>
                )}
            </Box>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />

            {preview && (
                <Box display="flex" gap={1} mb={2}>
                    <Box component="button" onClick={() => { setFile(null); setPreview(''); setResult(null); setErrorMsg(''); }}
                        sx={{ flex: 1, py: 1, border: `1px solid ${BORDER}`, borderRadius: '10px', bgcolor: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        Clear
                    </Box>
                    <motion.div style={{ flex: 2 }} whileTap={{ scale: 0.97 }}>
                        <Box component="button" onClick={() => { setResult(null); setErrorMsg(''); mutation.mutate(); }} disabled={mutation.isPending} sx={{
                            width: '100%', py: 1, border: 'none', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #AA00FF, #7B00D4)', color: '#fff',
                            fontWeight: 800, fontSize: 13, cursor: 'pointer',
                            boxShadow: '0 4px 18px rgba(170,0,255,0.45)',
                            opacity: mutation.isPending ? 0.7 : 1,
                        }}>
                            {mutation.isPending ? '⏳ Scanning…' : '⚡ Run Recognition'}
                        </Box>
                    </motion.div>
                </Box>
            )}

            {/* Scanning progress bar */}
            {mutation.isPending && (
                <Box sx={{ height: 2, bgcolor: 'rgba(170,0,255,0.15)', borderRadius: 1, mb: 2, overflow: 'hidden' }}>
                    <motion.div style={{ height: '100%', background: '#AA00FF', borderRadius: 4 }}
                        animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} />
                </Box>
            )}

            {/* Error */}
            {errorMsg && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                    <Box sx={{ p: 2, borderRadius: '10px', bgcolor: 'rgba(255,152,0,0.08)', border: '1px solid rgba(255,152,0,0.3)', mb: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#FF9800', mb: 0.3 }}>⚠ Recognition Error</Typography>
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{errorMsg}</Typography>
                    </Box>
                </motion.div>
            )}

            {/* Result */}
            {result && !errorMsg && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <Box sx={{
                        p: 2, borderRadius: '10px',
                        bgcolor: result.match ? 'rgba(255,23,68,0.08)' : 'rgba(0,230,118,0.06)',
                        border: `1px solid ${result.match ? 'rgba(255,23,68,0.35)' : 'rgba(0,230,118,0.25)'}`,
                    }}>
                        {result.match ? (
                            <>
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#FF1744', mb: 1 }}>🚨 Criminal Match Found!</Typography>
                                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Name: <Box component="span" sx={{ color: '#fff', fontWeight: 700 }}>{result.name}</Box></Typography>
                                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Confidence: <Box component="span" sx={{ color: '#FF9800', fontWeight: 700 }}>{(result.confidence * 100).toFixed(1)}%</Box></Typography>
                                {result.dangerLevel && (
                                    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Danger: <Box component="span" sx={{ color: DANGER_META[result.dangerLevel as DangerLevel]?.color ?? '#FF1744', fontWeight: 700 }}>{result.dangerLevel}</Box></Typography>
                                )}
                                {result.crimeHistory?.length > 0 && (
                                    <Box mt={1}>
                                        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>Known Offenses</Typography>
                                        {result.crimeHistory.slice(0, 3).map((h: string, i: number) => (
                                            <Typography key={i} sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>• {h}</Typography>
                                        ))}
                                    </Box>
                                )}
                            </>
                        ) : (
                            <>
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#00E676', mb: 0.5 }}>✓ No Criminal Match</Typography>
                                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{(result as any).message || 'Person not found in criminal database'}</Typography>
                                {result.confidence > 0 && (
                                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', mt: 0.5 }}>Best similarity: {(result.confidence * 100).toFixed(1)}%</Typography>
                                )}
                            </>
                        )}
                    </Box>
                </motion.div>
            )}
        </Box>
    );
};

// ── Criminal Detail Panel ─────────────────────────────────────────────────────
const CriminalDetailPanel: React.FC<{
    criminal: Criminal;
    onClose: () => void;
    onUpdate: (updated: Criminal) => void;
}> = ({ criminal: c, onClose, onUpdate }) => {
    const qc = useQueryClient();
    const dm = DANGER_META[c.dangerLevel];
    const photoRef = useRef<HTMLInputElement>(null);

    // ── Edit state ──────────────────────────────────────────────────────────
    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        name: c.name, age: String(c.age || ''), gender: c.gender || 'Male',
        dangerLevel: c.dangerLevel, lastKnownAddress: c.lastKnownAddress || '',
        warrantStatus: c.warrantStatus, isActive: c.isActive !== false,
    });
    const editInp = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setEditForm(f => ({ ...f, [k]: e.target.value }));

    const editMutation = useMutation({
        mutationFn: () => criminalsService.update(c._id, {
            ...editForm,
            age: editForm.age ? Number(editForm.age) : undefined,
        }),
        onSuccess: (res: any) => {
            const updated = res?.data?.criminal || res?.data;
            toast.success('Record updated');
            qc.invalidateQueries({ queryKey: ['criminals'] });
            if (updated) onUpdate(updated);
            setEditOpen(false);
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || 'Update failed'),
    });

    // ── Photo update ────────────────────────────────────────────────────────
    const photoMutation = useMutation({
        mutationFn: (file: File) => criminalsService.updatePhoto(c._id, file),
        onSuccess: (res: any) => {
            const updated = res?.data?.criminal || res?.data;
            const msg = res?.data?.message || 'Photo updated';
            toast.success(msg);
            qc.invalidateQueries({ queryKey: ['criminals'] });
            if (updated) onUpdate(updated);
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || 'Photo update failed'),
    });

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) photoMutation.mutate(f);
        e.target.value = '';
    };

    // ── Reindex ─────────────────────────────────────────────────────────────
    const reindexMutation = useMutation({
        mutationFn: () => criminalsService.reindex(c._id),
        onSuccess: (res: any) => {
            const updated = res?.data?.criminal || res?.data;
            toast.success(res?.data?.message || 'Re-indexed');
            qc.invalidateQueries({ queryKey: ['criminals'] });
            if (updated) onUpdate(updated);
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || 'Re-index failed'),
    });

    // ── Add offense state ───────────────────────────────────────────────────
    const [offenseOpen, setOffenseOpen] = useState(false);
    const [offense, setOffense]         = useState('');
    const [caseId, setCaseId]           = useState('');

    const offenseMutation = useMutation({
        mutationFn: () => criminalsService.addCrimeHistory(c._id, offense, caseId || undefined),
        onSuccess: (res: any) => {
            const updated = res?.data?.criminal || res?.data;
            toast.success('Offense added to record');
            qc.invalidateQueries({ queryKey: ['criminals'] });
            if (updated) onUpdate(updated);
            setOffenseOpen(false);
            setOffense(''); setCaseId('');
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to add offense'),
    });

    const inputSx = {
        '& .MuiOutlinedInput-root': {
            background: 'rgba(255,255,255,0.03)', fontSize: 13,
            '& fieldset': { borderColor: BORDER },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
            '&.Mui-focused fieldset': { borderColor: '#FF1744' },
        },
        '& .MuiInputLabel-root': { fontSize: 13 },
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}>
            <Box sx={{ ...glass, p: 3, overflow: 'hidden' }}>
                {/* ── Large mugshot photo header ── */}
                <Box
                    onClick={() => photoRef.current?.click()}
                    sx={{
                        mx: -3, mt: -3, mb: 2.5,
                        height: 230, overflow: 'hidden',
                        position: 'relative',
                        bgcolor: `${dm.color}0D`,
                        cursor: 'pointer',
                        '&:hover .dp-overlay': { opacity: 1 },
                    }}
                >
                    {c.photo ? (
                        <Box
                            component="img"
                            src={photoUrl(c.photo)}
                            alt={c.name}
                            onError={(e: any) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                        />
                    ) : (
                        <Box sx={{
                            width: '100%', height: '100%',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            background: `linear-gradient(160deg, #080C14 0%, ${dm.color}18 100%)`,
                        }}>
                            <Typography sx={{ fontSize: 80, fontWeight: 900, color: `${dm.color}20`, lineHeight: 1, userSelect: 'none' }}>{c.name[0]}</Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>No photo — click to upload</Typography>
                        </Box>
                    )}
                    {/* Bottom gradient */}
                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(transparent, rgba(0,0,0,0.92))', pointerEvents: 'none' }} />
                    {/* Hover upload overlay */}
                    <Box className="dp-overlay" sx={{
                        position: 'absolute', inset: 0,
                        bgcolor: 'rgba(0,0,0,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none',
                    }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <CameraIcon sx={{ fontSize: 32, color: '#fff' }} />
                            <Typography sx={{ fontSize: 12, color: '#fff', mt: 0.5, fontWeight: 600 }}>
                                {photoMutation.isPending ? 'Uploading…' : 'Update Photo'}
                            </Typography>
                        </Box>
                    </Box>
                    {/* Warrant overlay */}
                    {c.warrantStatus && (
                        <Box sx={{
                            position: 'absolute', top: 10, left: 10,
                            bgcolor: '#FF1744', borderRadius: 1, px: 1, py: 0.4,
                            fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: 0.6,
                            boxShadow: '0 0 10px rgba(255,23,68,0.7)',
                        }}>⚠ WARRANT</Box>
                    )}
                    {/* Danger strip */}
                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, bgcolor: dm.color, boxShadow: `0 0 14px ${dm.glow}` }} />
                    {/* Close button */}
                    <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        sx={{
                            position: 'absolute', top: 8, right: 8,
                            bgcolor: 'rgba(0,0,0,0.55)', color: '#fff',
                            '&:hover': { bgcolor: 'rgba(255,23,68,0.7)', color: '#fff' },
                            transition: 'all 0.15s',
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                    <input ref={photoRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
                </Box>

                {/* Header — name, badges, original close button hidden (now in photo) */}
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2.5}>
                    <Box display="flex" gap={2} alignItems="center">
                        <Box
                            onClick={() => photoRef.current?.click()}
                            sx={{
                                width: 48, height: 48, borderRadius: 2,
                                bgcolor: `${dm.color}22`, border: `2px solid ${dm.color}44`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', flexShrink: 0,
                                '&:hover': { border: `2px solid ${dm.color}99`, bgcolor: `${dm.color}33` },
                                transition: 'all 0.15s',
                            }}
                        >
                            <Typography sx={{ fontSize: 20, fontWeight: 900, color: dm.color }}>{ c.name[0] }</Typography>
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{c.name}</Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                                {[c.age ? `Age ${c.age}` : '', c.gender].filter(Boolean).join(' · ')}
                            </Typography>
                            <Box display="flex" gap={0.7} mt={0.6} flexWrap="wrap">
                                <DangerBadge level={c.dangerLevel} />
                                {c.warrantStatus && <Chip label="⚠ Warrant" size="small" sx={{ fontSize: 10, height: 20, bgcolor: 'rgba(255,23,68,0.15)', color: '#FF1744', border: '1px solid rgba(255,23,68,0.4)' }} />}
                                <Chip
                                    label={c.hasEmbedding ? '🔍 AI Indexed' : '○ Not Indexed'}
                                    size="small"
                                    sx={{
                                        fontSize: 10, height: 20, fontWeight: 700,
                                        bgcolor: c.hasEmbedding ? 'rgba(170,0,255,0.15)' : 'rgba(255,255,255,0.05)',
                                        color: c.hasEmbedding ? '#AA00FF' : 'text.disabled',
                                        border: `1px solid ${c.hasEmbedding ? 'rgba(170,0,255,0.4)' : BORDER}`,
                                    }}
                                />
                            </Box>
                        </Box>
                    </Box>
                </Box>

                <Divider sx={{ borderColor: BORDER, mb: 2 }} />

                {/* Not indexed warning */}
                {!c.hasEmbedding && c.photo && (
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,152,0,0.08)', border: '1px solid rgba(255,152,0,0.3)', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Typography sx={{ fontSize: 11, color: '#FF9800' }}>Photo exists but not yet indexed for AI recognition.</Typography>
                        <Box component="button" onClick={() => reindexMutation.mutate()} disabled={reindexMutation.isPending} sx={{
                            px: 1.5, py: 0.5, border: '1px solid rgba(255,152,0,0.5)', borderRadius: 1.5,
                            bgcolor: 'transparent', color: '#FF9800', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}>
                            {reindexMutation.isPending ? '⏳' : '⚡ Index Now'}
                        </Box>
                    </Box>
                )}

                {!c.hasEmbedding && !c.photo && (
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, mb: 2 }}>
                        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Click the avatar above to upload a photo — face will be auto-indexed for recognition.</Typography>
                    </Box>
                )}

                {c.lastKnownAddress && (
                    <Box display="flex" gap={1.5} mb={2} alignItems="flex-start">
                        <LocationIcon sx={{ fontSize: 16, color: 'text.disabled', mt: 0.2, flexShrink: 0 }} />
                        <Box>
                            <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.8 }}>Last Known Address</Typography>
                            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{c.lastKnownAddress}</Typography>
                        </Box>
                    </Box>
                )}

                {(c as any).description && (
                    <Box sx={{ ...glass, p: 2, borderRadius: 2, mb: 2 }}>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>Profile</Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.7 }}>{(c as any).description}</Typography>
                    </Box>
                )}

                <Box display="flex" gap={1} mb={2.5}>
                    {[
                        { v: c.crimeHistory?.length || 0, l: 'offenses', color: dm.color },
                        { v: c.warrantStatus ? '⚠ Active' : '✓ Clear', l: 'warrant', color: c.warrantStatus ? '#FF1744' : '#00E676' },
                        { v: c.isActive ? 'Active' : 'Closed', l: 'status', color: c.isActive ? '#00E676' : '#78909C' },
                    ].map(({ v, l, color }) => (
                        <Box key={l} sx={{ ...glass, flex: 1, p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                            <Typography sx={{ fontSize: typeof v === 'number' ? 20 : 11, fontWeight: 900, color, mt: typeof v === 'number' ? 0 : 0.5 }}>{v}</Typography>
                            <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase' }}>{l}</Typography>
                        </Box>
                    ))}
                </Box>

                {c.crimeHistory?.length > 0 && (
                    <>
                        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                            <HistoryIcon sx={{ fontSize: 14, color: '#FF1744' }} />
                            <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>Crime History</Typography>
                        </Box>
                        <Box sx={{ maxHeight: 220, overflowY: 'auto', pr: 0.5 }}>
                            {c.crimeHistory.map((h, i) => (
                                <Box key={i} sx={{ ...glass, p: 1.5, mb: 1, borderRadius: 2, borderLeft: `2px solid ${dm.color}66` }}>
                                    <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{h.offense}</Typography>
                                    {h.date && <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.3 }}>{safeFmt(h.date, 'dd MMM yyyy')} · {safeDist(h.date)}</Typography>}
                                    {(h as any).status && <Chip label={(h as any).status} size="small" sx={{ mt: 0.5, fontSize: 9, height: 16, bgcolor: 'rgba(255,255,255,0.06)', color: 'text.secondary' }} />}
                                </Box>
                            ))}
                        </Box>
                    </>
                )}

                {/* Action buttons */}
                <Box display="flex" gap={1} mt={2.5}>
                    <motion.div whileTap={{ scale: 0.97 }} style={{ flex: 1 }}>
                        <Box component="button" onClick={() => { setEditForm({ name: c.name, age: String(c.age || ''), gender: c.gender || 'Male', dangerLevel: c.dangerLevel, lastKnownAddress: c.lastKnownAddress || '', warrantStatus: c.warrantStatus, isActive: c.isActive !== false }); setEditOpen(true); }} sx={{
                            width: '100%', py: 1, border: `1px solid rgba(0,176,255,0.4)`, borderRadius: 2,
                            bgcolor: 'rgba(0,176,255,0.08)', color: '#00B0FF', fontWeight: 700, fontSize: 12,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5,
                            '&:hover': { bgcolor: 'rgba(0,176,255,0.15)' },
                        }}>
                            ✏ Edit Details
                        </Box>
                    </motion.div>
                    <motion.div whileTap={{ scale: 0.97 }} style={{ flex: 1 }}>
                        <Box component="button" onClick={() => setOffenseOpen(true)} sx={{
                            width: '100%', py: 1, border: `1px solid rgba(255,23,68,0.4)`, borderRadius: 2,
                            bgcolor: 'rgba(255,23,68,0.08)', color: '#FF1744', fontWeight: 700, fontSize: 12,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5,
                            '&:hover': { bgcolor: 'rgba(255,23,68,0.15)' },
                        }}>
                            + Add Offense
                        </Box>
                    </motion.div>
                </Box>

                <Divider sx={{ borderColor: BORDER, my: 2 }} />
                <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>ID: {c._id} · Added {safeDist(c.createdAt)}</Typography>
            </Box>

            {/* ── Edit Dialog ── */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#0D1120', border: `1px solid ${BORDER}`, borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                    <Box>✏ Edit Criminal Record</Box>
                    <IconButton size="small" onClick={() => setEditOpen(false)} sx={{ color: 'text.disabled' }}><CloseIcon fontSize="small" /></IconButton>
                </DialogTitle>
                <Divider sx={{ borderColor: BORDER }} />
                <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField label="Full Name *" fullWidth size="small" value={editForm.name} onChange={editInp('name')} sx={inputSx} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField label="Age" type="number" fullWidth size="small" value={editForm.age} onChange={editInp('age')} sx={inputSx} />
                        <FormControl size="small" sx={inputSx}>
                            <InputLabel>Gender</InputLabel>
                            <Select label="Gender" value={editForm.gender} onChange={(e) => setEditForm(f => ({ ...f, gender: e.target.value }))}>
                                {['Male','Female','Other'].map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Box>
                    <FormControl size="small" sx={inputSx}>
                        <InputLabel>Danger Level</InputLabel>
                        <Select label="Danger Level" value={editForm.dangerLevel} onChange={(e) => setEditForm(f => ({ ...f, dangerLevel: e.target.value as DangerLevel }))}>
                            {DANGER_LEVELS.map(l => <MenuItem key={l} value={l} sx={{ color: DANGER_META[l].color, fontWeight: 700 }}>{DANGER_META[l].label}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField label="Last Known Address" fullWidth size="small" multiline rows={2} value={editForm.lastKnownAddress} onChange={editInp('lastKnownAddress')} sx={inputSx} />
                    <Box display="flex" gap={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box component="button" onClick={() => setEditForm(f => ({ ...f, warrantStatus: !f.warrantStatus }))} sx={{
                                px: 2, py: 0.8, borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                border: `1px solid ${editForm.warrantStatus ? 'rgba(255,23,68,0.5)' : BORDER}`,
                                bgcolor: editForm.warrantStatus ? 'rgba(255,23,68,0.12)' : 'transparent',
                                color: editForm.warrantStatus ? '#FF1744' : 'text.secondary',
                                transition: 'all 0.15s',
                            }}>
                                {editForm.warrantStatus ? '⚠ Warrant Active' : '✓ No Warrant'}
                            </Box>
                        </Box>
                        <Box component="button" onClick={() => setEditForm(f => ({ ...f, isActive: !f.isActive }))} sx={{
                            px: 2, py: 0.8, borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            border: `1px solid ${editForm.isActive ? 'rgba(0,230,118,0.5)' : BORDER}`,
                            bgcolor: editForm.isActive ? 'rgba(0,230,118,0.1)' : 'transparent',
                            color: editForm.isActive ? '#00E676' : 'text.secondary',
                            transition: 'all 0.15s',
                        }}>
                            {editForm.isActive ? '● Active' : '○ Inactive'}
                        </Box>
                    </Box>
                </DialogContent>
                <Divider sx={{ borderColor: BORDER }} />
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Box component="button" onClick={() => setEditOpen(false)} sx={{ px: 3, py: 1, border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: 'transparent', color: 'text.secondary', cursor: 'pointer', fontSize: 13 }}>Cancel</Box>
                    <motion.div whileTap={{ scale: 0.97 }}>
                        <Box component="button" onClick={() => editMutation.mutate()} disabled={!editForm.name || editMutation.isPending} sx={{
                            px: 3, py: 1, border: 'none', borderRadius: 2,
                            background: editMutation.isPending ? 'rgba(0,176,255,0.3)' : 'linear-gradient(135deg,#0288D1,#01579B)',
                            color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(0,176,255,0.3)',
                            opacity: editMutation.isPending ? 0.7 : 1,
                        }}>
                            {editMutation.isPending ? 'Saving…' : 'Save Changes'}
                        </Box>
                    </motion.div>
                </DialogActions>
            </Dialog>

            {/* ── Add Offense Dialog ── */}
            <Dialog open={offenseOpen} onClose={() => setOffenseOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: '#0D1120', border: `1px solid ${BORDER}`, borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                    <Box>+ Add Offense</Box>
                    <IconButton size="small" onClick={() => setOffenseOpen(false)} sx={{ color: 'text.disabled' }}><CloseIcon fontSize="small" /></IconButton>
                </DialogTitle>
                <Divider sx={{ borderColor: BORDER }} />
                <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        Adding offense to: <Box component="span" sx={{ color: dm.color, fontWeight: 700 }}>{c.name}</Box>
                    </Typography>
                    <TextField
                        label="Offense / Crime Description *" fullWidth size="small" multiline rows={3}
                        value={offense} onChange={(e) => setOffense(e.target.value)}
                        placeholder="e.g. Armed robbery at New Delhi Market" sx={inputSx}
                    />
                    <TextField
                        label="Link to Case ID (optional)" fullWidth size="small"
                        value={caseId} onChange={(e) => setCaseId(e.target.value)}
                        placeholder="Leave blank if not linked" sx={inputSx}
                    />
                </DialogContent>
                <Divider sx={{ borderColor: BORDER }} />
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Box component="button" onClick={() => { setOffenseOpen(false); setOffense(''); setCaseId(''); }} sx={{ px: 3, py: 1, border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: 'transparent', color: 'text.secondary', cursor: 'pointer', fontSize: 13 }}>Cancel</Box>
                    <motion.div whileTap={{ scale: 0.97 }}>
                        <Box component="button" onClick={() => offenseMutation.mutate()} disabled={!offense.trim() || offenseMutation.isPending} sx={{
                            px: 3, py: 1, border: 'none', borderRadius: 2,
                            background: (!offense.trim() || offenseMutation.isPending) ? 'rgba(255,23,68,0.3)' : 'linear-gradient(135deg,#FF1744,#C62828)',
                            color: '#fff', fontWeight: 800, fontSize: 13,
                            cursor: offense.trim() ? 'pointer' : 'default',
                            boxShadow: offense.trim() ? '0 4px 16px rgba(255,23,68,0.4)' : 'none',
                        }}>
                            {offenseMutation.isPending ? 'Adding…' : '+ Add Offense'}
                        </Box>
                    </motion.div>
                </DialogActions>
            </Dialog>
        </motion.div>
    );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const RowSkeleton: React.FC = () => (
    <Box sx={{ ...glass, p: 2, mb: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Skeleton variant="circular" width={46} height={46} sx={{ bgcolor: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
        <Box flex={1}><Skeleton width="45%" height={16} sx={{ bgcolor: 'rgba(255,255,255,0.07)', mb: 0.5 }} /><Skeleton width="70%" height={12} sx={{ bgcolor: 'rgba(255,255,255,0.04)' }} /></Box>
        <Skeleton width={64} height={22} sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 20 }} />
        <Skeleton width={42} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }} />
    </Box>
);

// ── Pill button ───────────────────────────────────────────────────────────────
const PillBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; color?: string }> = ({ active, onClick, children, color = '#FF1744' }) => (
    <Box component="button" onClick={onClick} sx={{
        px: 2, py: 0.7, borderRadius: 20, fontSize: 12, fontWeight: active ? 800 : 400,
        border: `1px solid ${active ? color : BORDER}`,
        bgcolor: active ? `${color}22` : 'transparent', color: active ? color : 'text.secondary',
        cursor: 'pointer', transition: 'all 0.15s',
        '&:hover': { borderColor: color, color },
    }}>
        {children}
    </Box>
);

// ── Pagination ────────────────────────────────────────────────────────────────
const Pagination: React.FC<{ page: number; pages: number; total: number; onChange: (p: number) => void }> = ({ page, pages, total, onChange }) => {
    if (pages <= 1) return null;
    const nums = Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1);
    return (
        <Box display="flex" alignItems="center" justifyContent="space-between" mt={3} px={0.5}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{total} total records</Typography>
            <Box display="flex" gap={0.5} flexWrap="wrap">
                <PillBtn active={false} onClick={() => onChange(Math.max(1, page - 1))}>‹</PillBtn>
                {nums.map((n) => <PillBtn key={n} active={page === n} onClick={() => onChange(n)}>{n}</PillBtn>)}
                {pages > 7 && page < pages && <PillBtn active={false} onClick={() => onChange(pages)}>…{pages}</PillBtn>}
                <PillBtn active={false} onClick={() => onChange(Math.min(pages, page + 1))}>›</PillBtn>
            </Box>
        </Box>
    );
};

// ── Add Dialog ────────────────────────────────────────────────────────────────
const AddCriminalDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    const qc = useQueryClient();
    const photoRef = useRef<HTMLInputElement>(null);
    const [form, setForm] = useState({ name: '', age: '', gender: 'Male', dangerLevel: 'MEDIUM', lastKnownAddress: '', offense: '' });
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const inp = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

    const mutation = useMutation({
        mutationFn: () => {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, v));
            if (photoFile) fd.append('photo', photoFile);
            return criminalsService.create(fd);
        },
        onSuccess: () => {
            toast.success('Criminal record added');
            qc.invalidateQueries({ queryKey: ['criminals'] });
            onClose();
            setForm({ name: '', age: '', gender: 'Male', dangerLevel: 'MEDIUM', lastKnownAddress: '', offense: '' });
            setPhotoFile(null); setError('');
        },
        onError: (e: any) => setError(e?.response?.data?.message || 'Failed to add record'),
    });

    const inputSx = {
        '& .MuiOutlinedInput-root': {
            background: 'rgba(255,255,255,0.03)', fontSize: 13,
            '& fieldset': { borderColor: BORDER },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
            '&.Mui-focused fieldset': { borderColor: '#FF1744' },
        },
        '& .MuiInputLabel-root': { fontSize: 13 },
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#0D1120', border: `1px solid ${BORDER}`, borderRadius: 3 } }}>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Box display="flex" alignItems="center" gap={1}><AddIcon sx={{ color: '#FF1744' }} /> New Criminal Record</Box>
                <IconButton size="small" onClick={onClose} sx={{ color: 'text.disabled' }}><CloseIcon fontSize="small" /></IconButton>
            </DialogTitle>
            <Divider sx={{ borderColor: BORDER }} />
            <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {error && <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,23,68,0.1)', border: '1px solid rgba(255,23,68,0.3)', color: '#FF1744', fontSize: 13 }}>{error}</Box>}
                <TextField label="Full Name *" fullWidth size="small" value={form.name} onChange={inp('name')} sx={{ ...inputSx }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField label="Age" type="number" fullWidth size="small" value={form.age} onChange={inp('age')} sx={inputSx} />
                    <FormControl size="small" sx={inputSx}>
                        <InputLabel>Gender</InputLabel>
                        <Select label="Gender" value={form.gender} onChange={(e) => setForm(f => ({ ...f, gender: e.target.value }))}>
                            {['Male','Female','Other'].map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
                <FormControl size="small" sx={inputSx}>
                    <InputLabel>Danger Level</InputLabel>
                    <Select label="Danger Level" value={form.dangerLevel} onChange={(e) => setForm(f => ({ ...f, dangerLevel: e.target.value }))}>
                        {DANGER_LEVELS.map(l => <MenuItem key={l} value={l} sx={{ color: DANGER_META[l].color, fontWeight: 700 }}>{DANGER_META[l].label}</MenuItem>)}
                    </Select>
                </FormControl>
                <TextField label="Last Known Address" fullWidth size="small" multiline rows={2} value={form.lastKnownAddress} onChange={inp('lastKnownAddress')} sx={inputSx} />
                <TextField label="Known Offense" fullWidth size="small" value={form.offense} onChange={inp('offense')} sx={inputSx} />
                <Box component="button" onClick={() => photoRef.current?.click()} sx={{
                    py: 1.5, borderRadius: 2, border: `1px dashed ${photoFile ? 'rgba(255,23,68,0.5)' : BORDER}`,
                    bgcolor: 'transparent', color: photoFile ? '#FF1744' : 'text.secondary',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                }}>
                    <UploadIcon fontSize="small" /> {photoFile ? `📎 ${photoFile.name}` : 'Upload Photo (optional)'}
                </Box>
                <input ref={photoRef} type="file" accept="image/*" hidden onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
            </DialogContent>
            <Divider sx={{ borderColor: BORDER }} />
            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Box component="button" onClick={onClose} sx={{ px: 3, py: 1, border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: 'transparent', color: 'text.secondary', cursor: 'pointer', fontSize: 13 }}>Cancel</Box>
                <motion.div whileTap={{ scale: 0.97 }}>
                    <Box component="button" onClick={() => mutation.mutate()} disabled={!form.name || mutation.isPending} sx={{
                        px: 3, py: 1, border: 'none', borderRadius: 2,
                        background: (!form.name || mutation.isPending) ? 'rgba(255,23,68,0.3)' : 'linear-gradient(135deg,#FF1744,#C62828)',
                        color: '#fff', fontWeight: 800, fontSize: 13,
                        cursor: form.name ? 'pointer' : 'default',
                        boxShadow: form.name ? '0 4px 16px rgba(255,23,68,0.4)' : 'none',
                    }}>
                        {mutation.isPending ? 'Adding…' : '+ Add Record'}
                    </Box>
                </motion.div>
            </DialogActions>
        </Dialog>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const CriminalsPage: React.FC = () => {
    const [page, setPage]               = useState(1);
    const [search, setSearch]           = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [filterDanger, setFilterDanger] = useState<DangerLevel | ''>('');
    const [filterWarrant, setFilterWarrant] = useState(false);
    const [selected, setSelected]       = useState<Criminal | null>(null);
    const [addOpen, setAddOpen]         = useState(false);
    const [view, setView]               = useState<'list' | 'grid'>('grid');
    const LIMIT = 20;

    const commitSearch = useCallback(() => { setSearch(searchInput); setPage(1); }, [searchInput]);

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['criminals', page, search],
        queryFn: () => criminalsService.getAll({ page, limit: LIMIT, search: search || undefined } as any),
        refetchInterval: 60_000,
    });

    const rawCriminals: Criminal[] = (data?.data as any)?.criminals || [];
    const total: number            = (data?.data as any)?.total || 0;
    const pages: number            = (data?.data as any)?.pages || 1;

    // Client-side filter for danger + warrant
    const criminals = rawCriminals.filter(c => {
        if (filterDanger && c.dangerLevel !== filterDanger) return false;
        if (filterWarrant && !c.warrantStatus) return false;
        return true;
    });

    const criticalCount = rawCriminals.filter(c => c.dangerLevel === 'CRITICAL').length;
    const highCount     = rawCriminals.filter(c => c.dangerLevel === 'HIGH').length;
    const warrantCount  = rawCriminals.filter(c => c.warrantStatus).length;

    return (
        <Box>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
                    <Box>
                        <Typography sx={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}>Criminal Database</Typography>
                        <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>{total} records · AI-powered face recognition</Typography>
                    </Box>
                    <Box display="flex" gap={1.5} alignItems="center">
                        <Tooltip title="Refresh">
                            <IconButton size="small" onClick={() => refetch()} sx={{
                                border: `1px solid ${BORDER}`, background: G, color: 'text.secondary',
                                '&:hover': { color: '#FF1744', borderColor: 'rgba(255,23,68,0.4)' },
                            }}>
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <motion.div whileTap={{ scale: 0.97 }}>
                            <Box component="button" onClick={() => setAddOpen(true)} sx={{
                                display: 'flex', alignItems: 'center', gap: 0.8,
                                px: 2.5, py: 1, border: 'none', borderRadius: 2,
                                background: 'linear-gradient(135deg,#FF1744,#C62828)',
                                color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                                boxShadow: '0 4px 20px rgba(255,23,68,0.4)',
                            }}>
                                <AddIcon sx={{ fontSize: 17 }} /> Add Criminal
                            </Box>
                        </motion.div>
                    </Box>
                </Box>
            </motion.div>

            {/* Stat cards */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2, mb: 3 }}>
                    <StatCard label="Total Records"   value={total}         icon={<FingerprintIcon />} color="#00B0FF" delay={0}    />
                    <StatCard label="Critical"        value={criticalCount} icon={<CriticalIcon />}   color="#FF1744" delay={0.07} sub="high priority" />
                    <StatCard label="High Danger"     value={highCount}     icon={<SecurityIcon />}   color="#FF5722" delay={0.14} sub="this page" />
                    <StatCard label="Active Warrants" value={warrantCount}  icon={<WarrantIcon />}    color="#FF9800" delay={0.21} sub="this page" />
                </Box>
            </motion.div>

            {/* Two-column layout */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 340px' }, gap: 3, alignItems: 'start' }}>

                {/* LEFT: list */}
                <Box>
                    {/* Search + view toggle bar */}
                    <Box sx={{ ...glass, p: 2, mb: 2 }}>
                        <Box display="flex" gap={1.5} mb={1.5}>
                            <TextField
                                placeholder="Search by name…"
                                size="small" fullWidth
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && commitSearch()}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
                                    endAdornment: searchInput && (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>
                                                <CloseIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        background: 'rgba(255,255,255,0.03)', fontSize: 13,
                                        '& fieldset': { borderColor: BORDER },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                                        '&.Mui-focused fieldset': { borderColor: '#FF1744' },
                                    },
                                }}
                            />
                            <motion.div whileTap={{ scale: 0.97 }}>
                                <Box component="button" onClick={commitSearch} sx={{
                                    px: 2.5, border: `1px solid rgba(255,23,68,0.4)`, borderRadius: 2,
                                    bgcolor: 'rgba(255,23,68,0.1)', color: '#FF1744', fontWeight: 700, fontSize: 13, cursor: 'pointer', height: '100%',
                                }}>Search</Box>
                            </motion.div>
                            {/* View toggle */}
                            <Box sx={{ display: 'flex', border: `1px solid ${BORDER}`, borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                                <Tooltip title="Grid view">
                                    <IconButton size="small" onClick={() => setView('grid')} sx={{
                                        borderRadius: 0, px: 1.5,
                                        bgcolor: view === 'grid' ? 'rgba(255,23,68,0.15)' : 'transparent',
                                        color: view === 'grid' ? '#FF1744' : 'text.disabled',
                                        '&:hover': { bgcolor: 'rgba(255,23,68,0.1)', color: '#FF1744' },
                                    }}>
                                        <GridViewIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Tooltip>
                                <Box sx={{ width: 1, bgcolor: BORDER }} />
                                <Tooltip title="List view">
                                    <IconButton size="small" onClick={() => setView('list')} sx={{
                                        borderRadius: 0, px: 1.5,
                                        bgcolor: view === 'list' ? 'rgba(255,23,68,0.15)' : 'transparent',
                                        color: view === 'list' ? '#FF1744' : 'text.disabled',
                                        '&:hover': { bgcolor: 'rgba(255,23,68,0.1)', color: '#FF1744' },
                                    }}>
                                        <ListViewIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                        <Box display="flex" gap={0.8} flexWrap="wrap" alignItems="center">
                            <FilterIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                            <PillBtn active={filterDanger === '' && !filterWarrant} onClick={() => { setFilterDanger(''); setFilterWarrant(false); }}>All</PillBtn>
                            {DANGER_LEVELS.map(l => (
                                <PillBtn key={l} active={filterDanger === l} onClick={() => setFilterDanger(filterDanger === l ? '' : l)} color={DANGER_META[l].color}>
                                    {DANGER_META[l].label}
                                </PillBtn>
                            ))}
                            <PillBtn active={filterWarrant} onClick={() => setFilterWarrant(!filterWarrant)} color="#FF9800">⚠ Warrant</PillBtn>
                        </Box>
                    </Box>

                    {/* Progress bar */}
                    {(isLoading || isFetching) && (
                        <Box sx={{ height: 2, bgcolor: 'rgba(255,23,68,0.15)', borderRadius: 1, mb: 1, overflow: 'hidden' }}>
                            <motion.div style={{ height: '100%', background: '#FF1744', borderRadius: 4 }}
                                animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} />
                        </Box>
                    )}

                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <Box key="sk">{Array.from({ length: 7 }).map((_, i) => <RowSkeleton key={i} />)}</Box>
                        ) : criminals.length === 0 ? (
                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <Box sx={{ ...glass, textAlign: 'center', py: 8 }}>
                                    <PersonIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 2 }} />
                                    <Typography fontSize={15} fontWeight={700}>No records found</Typography>
                                    <Typography fontSize={13} color="text.secondary" mt={0.5}>Try adjusting your search or filters</Typography>
                                </Box>
                            </motion.div>
                        ) : view === 'grid' ? (
                            <Box key="grid" sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2.5 }}>
                                {criminals.map((c, i) => (
                                    <CriminalGridCard
                                        key={c._id} c={c} index={i}
                                        selected={selected?._id === c._id}
                                        onClick={() => setSelected(selected?._id === c._id ? null : c)}
                                    />
                                ))}
                            </Box>
                        ) : (
                            <Box key="list">
                                {criminals.map((c, i) => (
                                    <CriminalCard
                                        key={c._id} c={c} index={i}
                                        selected={selected?._id === c._id}
                                        onClick={() => setSelected(selected?._id === c._id ? null : c)}
                                    />
                                ))}
                            </Box>
                        )}
                    </AnimatePresence>

                    <Pagination page={page} pages={pages} total={total} onChange={(p) => { setPage(p); setSelected(null); }} />
                </Box>

                {/* RIGHT: detail / AI panel */}
                <Box>
                    <AnimatePresence mode="wait">
                        {selected ? (
                            <CriminalDetailPanel key={selected._id} criminal={selected} onClose={() => setSelected(null)} onUpdate={(updated) => setSelected(updated)} />
                        ) : (
                            <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <FaceRecognitionPanel />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Box>
            </Box>

            <AddCriminalDialog open={addOpen} onClose={() => setAddOpen(false)} />
        </Box>
    );
};
