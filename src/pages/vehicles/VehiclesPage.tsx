// =============================================================================
// pages/vehicles/VehiclesPage.tsx  –  Vehicle Database with ANPR Scanner
// =============================================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Box, Typography, Avatar, Chip, TextField, InputAdornment,
    IconButton, Tooltip, Skeleton, Divider, Dialog, DialogTitle,
    DialogContent, DialogActions, Select, MenuItem, FormControl,
    InputLabel, Alert
} from '@mui/material';
import {
    Search as SearchIcon, Close as CloseIcon, Add as AddIcon, Edit as EditIcon,
    Refresh as RefreshIcon, FilterList as FilterIcon,
    Warning as WarningIcon, DirectionsCar as CarIcon,
    TwoWheeler as BikeIcon, LocalShipping as TruckIcon,
    DirectionsBus as BusIcon, QrCodeScanner as ScanIcon,
    CheckCircle as OkIcon, CloudUpload as UploadIcon,
    CameraAlt as CamIcon, ViewModule as GridViewIcon,
    ViewList as ListViewIcon, Security as SecurityIcon,
    GpsFixed as GpsIcon, LocalPolice as PoliceIcon
} from '@mui/icons-material';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehiclesService, aiService } from '../../services/api.service';
import { Vehicle, AnprResult } from '../../types';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

// ── Design tokens matching Dashboard & Criminals ──────────────────────────────
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

type VehicleStatus = 'CLEAR' | 'SUSPECTED' | 'STOLEN';

const STATUS_META: Record<VehicleStatus, { color: string; glow: string; label: string; icon: React.ReactNode }> = {
    CLEAR:     { color: '#00E676', glow: 'rgba(0,230,118,0.25)',  label: 'Clear',     icon: <OkIcon sx={{ fontSize: 12 }} /> },
    SUSPECTED: { color: '#FF9800', glow: 'rgba(255,152,0,0.25)',  label: 'Suspected', icon: <WarningIcon sx={{ fontSize: 12 }} /> },
    STOLEN:    { color: '#FF1744', glow: 'rgba(255,23,68,0.35)',  label: 'Stolen',    icon: <WarningIcon sx={{ fontSize: 12 }} /> },
};

const VEHICLE_TYPES = ['TWO_WHEELER','FOUR_WHEELER','TRUCK','BUS','OTHER'] as const;

const getStatus = (v: Vehicle): VehicleStatus => {
    if (v.isStolen) return 'STOLEN';
    if (v.isSuspected) return 'SUSPECTED';
    return 'CLEAR';
};

const typeLabel = (t: string) => {
    const m: Record<string, string> = { TWO_WHEELER: 'Two-Wheeler', FOUR_WHEELER: 'Four-Wheeler', TRUCK: 'Truck', BUS: 'Bus', OTHER: 'Other' };
    return m[t] ?? t;
};

const TypeIcon: React.FC<{ t: string; sx?: any }> = ({ t, sx }) => {
    switch (t) {
        case 'TWO_WHEELER': return <BikeIcon sx={sx} />;
        case 'TRUCK':       return <TruckIcon sx={sx} />;
        case 'BUS':         return <BusIcon sx={sx} />;
        default:            return <CarIcon sx={sx} />;
    }
};

const safeDist = (v: unknown) => { 
    if (!v) return '—';
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? '—' : formatDistanceToNow(d, { addSuffix: true }); 
};

// ── StatusBadge ───────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: VehicleStatus }> = ({ status }) => {
    const m = STATUS_META[status];
    return (
        <Chip
            icon={<Box sx={{ color: `${m.color} !important`, display: 'flex', alignItems: 'center' }}>{m.icon}</Box>}
            label={m.label}
            size="small"
            sx={{
                fontSize: 10, height: 22, fontWeight: 800,
                bgcolor: `${m.color}1A`, color: m.color,
                border: `1px solid ${m.color}44`,
                boxShadow: status === 'STOLEN' ? `0 0 10px ${m.glow}` : 'none',
            }}
        />
    );
};

// ── Animated counter ─────────────────────────────────────────────────────────
const AnimNum: React.FC<{ value: number; duration?: number }> = ({ value, duration = 1 }) => {
    const [n, setN] = useState(0);
    useEffect(() => {
        const ctrl = animate(0, value, { duration, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) });
        return ctrl.stop;
    }, [value, duration]);
    return <>{n.toLocaleString()}</>;
};

// ── Glassmorphism stat card ──────────────────────────────────────────────────
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
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
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

// ── Vehicle card row (list view) ─────────────────────────────────────────────
const VehicleCard: React.FC<{ v: Vehicle; index: number; onClick: () => void; selected: boolean }> = ({ v, index, onClick, selected }) => {
    const status = getStatus(v);
    const m = STATUS_META[status];
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
                        ? `linear-gradient(135deg, ${m.color}12 0%, ${DARK_BG2} 100%)`
                        : `linear-gradient(135deg, ${DARK_BG} 0%, ${DARK_BG2} 100%)`,
                    border: `1px solid ${selected ? `${m.color}55` : BORDER}`,
                    backdropFilter: 'blur(20px)',
                    boxShadow: selected ? `0 0 24px ${m.glow}` : '0 2px 12px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        border: `1px solid ${m.color}44`,
                        transform: 'translateX(4px)',
                        boxShadow: `0 4px 24px ${m.glow}`,
                    },
                }}
            >
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar
                        sx={{
                            width: 48, height: 48,
                            bgcolor: `${m.color}20`, color: m.color,
                            border: `2px solid ${m.color}44`,
                            boxShadow: `0 0 12px ${m.glow}`,
                        }}
                    >
                        <TypeIcon t={v.vehicleType} sx={{ fontSize: 24 }} />
                    </Avatar>
                </Box>
                <Box flex={1} minWidth={0}>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: 1 }}>
                        {v.plateNumber}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[v.ownerName, v.model, v.color].filter(Boolean).join(' · ')}
                    </Typography>
                </Box>
                <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.6} flexShrink={0}>
                    <StatusBadge status={status} />
                </Box>
            </Box>
        </motion.div>
    );
};

// ── Vehicle grid card ────────────────────────────────────────────────────────
const VehicleGridCard: React.FC<{ v: Vehicle; index: number; onClick: () => void; selected: boolean }> = ({ v, index, onClick, selected }) => {
    const status = getStatus(v);
    const m = STATUS_META[status];
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
                borderRadius: '16px', overflow: 'hidden', height: 200,
                position: 'relative', display: 'flex', flexDirection: 'column',
                border: `1px solid ${selected ? m.color : BORDER}`,
                boxShadow: selected
                    ? `0 0 0 2px ${m.color}, 0 12px 40px ${m.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`
                    : `0 4px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)`,
                background: `linear-gradient(160deg, #060A14 0%, ${m.color}0E 100%)`,
                transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
                '&:hover': { boxShadow: `0 0 0 1px ${m.color}88, 0 16px 48px ${m.glow}`, borderColor: `${m.color}88` },
            }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent 0%, ${m.color} 50%, transparent 100%)` }} />
                
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: `${m.color}15`, border: `1px solid ${m.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
                        <TypeIcon t={v.vehicleType} sx={{ fontSize: 22, color: m.color }} />
                    </Box>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 2 }}>
                        {v.plateNumber}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', mt: 0.5, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.ownerName}
                    </Typography>
                </Box>

                <Box sx={{ background: 'rgba(0,0,0,0.3)', p: '10px 12px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{typeLabel(v.vehicleType)}</Typography>
                    <StatusBadge status={status} />
                </Box>
                
                <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, bgcolor: m.color, boxShadow: `0 0 16px ${m.glow}`, borderRadius: '0 0 16px 16px' }} />

                {selected && <Box sx={{ position: 'absolute', inset: 0, borderRadius: '16px', boxShadow: `inset 0 0 28px ${m.glow}`, pointerEvents: 'none' }} />}
            </Box>
        </motion.div>
    );
};

// ── ANPR Scanner Panel ───────────────────────────────────────────────────────
const AnprScannerPanel: React.FC = () => {
    const [file, setFile]         = useState<File | null>(null);
    const [preview, setPreview]   = useState<string>('');
    const [result, setResult]     = useState<AnprResult | null>(null);
    const [dbVehicle, setDbVehicle] = useState<Vehicle | null>(null);
    const [dbLookupDone, setDbLookupDone] = useState(false);
    const fileRef                 = useRef<HTMLInputElement>(null);

    const scanMutation = useMutation({
        mutationFn: () => aiService.detectPlate(file!),
        onSuccess: async (res) => {
            const data = res.data;
            setResult(data);
            setDbVehicle(null);
            setDbLookupDone(false);

            if (data.plateNumber) {
                toast.success(`Plate detected: ${data.plateNumber}`);
                try {
                    const lookup = await vehiclesService.getByPlate(data.plateNumber);
                    setDbVehicle((lookup.data as any)?.vehicle ?? null);
                } catch {
                    setDbVehicle(null);
                } finally {
                    setDbLookupDone(true);
                }
            } else {
                setDbLookupDone(true);
                toast.error(data.message || 'No plate detected');
            }
        },
        onError: () => toast.error('ANPR scan failed'),
    });

    const handleFile = (f: File) => {
        setFile(f); setPreview(URL.createObjectURL(f)); setResult(null); setDbVehicle(null); setDbLookupDone(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f && f.type.startsWith('image/')) handleFile(f);
    };

    return (
        <Box sx={{
            ...glass, p: 3, position: 'relative', overflow: 'hidden',
            boxShadow: '0 0 0 1px rgba(0,176,255,0.12), 0 8px 40px rgba(0,0,0,0.4)',
        }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #00B0FF, transparent)' }} />
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 130, height: 130, borderRadius: '50%', background: 'rgba(0,176,255,0.06)', filter: 'blur(30px)', pointerEvents: 'none' }} />

            <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
                <Box sx={{
                    width: 38, height: 38, borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(0,176,255,0.22), rgba(0,176,255,0.08))',
                    border: '1px solid rgba(0,176,255,0.28)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    <ScanIcon sx={{ fontSize: 20, color: '#00B0FF' }} />
                </Box>
                <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 800 }}>ANPR Scanner</Typography>
                    <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.3 }}>Auto plate recognition</Typography>
                </Box>
            </Box>
            <Divider sx={{ borderColor: BORDER, mb: 2.5 }} />

            <Box
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                sx={{
                    border: `2px dashed ${preview ? 'rgba(0,176,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '12px', p: 2.5, textAlign: 'center', cursor: 'pointer', mb: 2,
                    minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                    bgcolor: preview ? 'rgba(0,176,255,0.06)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s',
                    '&:hover': { borderColor: '#00B0FF', bgcolor: 'rgba(0,176,255,0.05)' },
                }}
            >
                {preview ? (
                    <img src={preview} alt="Vehicle" style={{ maxHeight: 140, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }} />
                ) : (
                    <>
                        <UploadIcon sx={{ fontSize: 44, color: 'rgba(255,255,255,0.18)', mb: 1 }} />
                        <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Click or drag & drop vehicle image</Typography>
                        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', mt: 0.4 }}>JPG · PNG · WebP</Typography>
                    </>
                )}
            </Box>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

            {preview && (
                <Box display="flex" gap={1} mb={2}>
                    <Box component="button" onClick={() => { setFile(null); setPreview(''); setResult(null); setDbVehicle(null); setDbLookupDone(false); }}
                        sx={{ flex: 1, py: 1, border: `1px solid ${BORDER}`, borderRadius: '10px', bgcolor: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        Clear
                    </Box>
                    <motion.div style={{ flex: 2 }} whileTap={{ scale: 0.97 }}>
                        <Box component="button" onClick={() => { setResult(null); setDbVehicle(null); setDbLookupDone(false); scanMutation.mutate(); }} disabled={scanMutation.isPending} sx={{
                            width: '100%', py: 1, border: 'none', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #00B0FF, #0081CB)', color: '#fff',
                            fontWeight: 800, fontSize: 13, cursor: 'pointer',
                            boxShadow: '0 4px 18px rgba(0,176,255,0.45)',
                            opacity: scanMutation.isPending ? 0.7 : 1,
                        }}>
                            {scanMutation.isPending ? '⏳ Scanning…' : '⚡ Scan Plate'}
                        </Box>
                    </motion.div>
                </Box>
            )}

            {scanMutation.isPending && (
                <Box sx={{ height: 2, bgcolor: 'rgba(0,176,255,0.15)', borderRadius: 1, mb: 2, overflow: 'hidden' }}>
                    <motion.div style={{ height: '100%', background: '#00B0FF', borderRadius: 4 }} animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} />
                </Box>
            )}

            {result && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {result.plateNumber ? (
                            <Box sx={{ bgcolor: 'rgba(0,0,0,0.4)', borderRadius: 3, p: 2, border: `1px solid ${BORDER}`, textAlign: 'center' }}>
                                <Typography variant="caption" color="rgba(255,255,255,0.4)" display="block" mb={0.5}>Detected Plate</Typography>
                                <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 20, color: 'white', letterSpacing: 3 }}>
                                    {result.plateNumber}
                                </Typography>
                                <Typography variant="caption" color="rgba(255,255,255,0.4)">
                                    Confidence: {(result.confidence * 100).toFixed(1)}%
                                </Typography>
                            </Box>
                        ) : (
                            <Alert severity="warning" sx={{ bgcolor: 'rgba(255,152,0,0.1)', color: '#FF9800', border: '1px solid rgba(255,152,0,0.3)', borderRadius: 2, '.MuiAlert-icon': { color: '#FF9800' } }}>
                                {result.message || 'No plate detected in image'}
                            </Alert>
                        )}

                        {result.plateNumber && !dbLookupDone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: G, borderRadius: 2, border: `1px solid ${BORDER}` }}>
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'flex' }}>
                                    <RefreshIcon sx={{ fontSize: 16, color: '#00B0FF' }} />
                                </motion.div>
                                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Checking vehicle database...</Typography>
                            </Box>
                        )}

                        {dbLookupDone && result.plateNumber && (
                            dbVehicle ? (
                                <Box sx={{ borderRadius: 3, border: `1px solid ${STATUS_META[getStatus(dbVehicle)].color}44`, bgcolor: `${STATUS_META[getStatus(dbVehicle)].color}11`, p: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                        {STATUS_META[getStatus(dbVehicle)].icon}
                                        <Typography fontWeight={700} fontSize={13} color={STATUS_META[getStatus(dbVehicle)].color}>
                                            {dbVehicle.isStolen ? 'STOLEN VEHICLE — Alert!' : dbVehicle.isSuspected ? 'SUSPECTED VEHICLE' : 'Vehicle is CLEAR'}
                                        </Typography>
                                    </Box>
                                    <Divider sx={{ borderColor: `${STATUS_META[getStatus(dbVehicle)].color}22`, mb: 1.5 }} />
                                    {([['Owner', dbVehicle.ownerName], ['Phone', dbVehicle.ownerPhone ?? '—'], ['Type', typeLabel(dbVehicle.vehicleType)], ['Model', dbVehicle.model], ['Color', dbVehicle.color]] as const).map(([k, val]) => (
                                        <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{k}</Typography>
                                            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{val}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Alert severity="info" sx={{ bgcolor: 'rgba(0,176,255,0.1)', color: '#00B0FF', border: '1px solid rgba(0,176,255,0.3)', borderRadius: 2, fontSize: 12, '.MuiAlert-icon': { color: '#00B0FF' } }}>
                                    Plate <strong>{result.plateNumber}</strong> not found in database.
                                </Alert>
                            )
                        )}
                    </Box>
                </motion.div>
            )}
        </Box>
    );
};

// ── Vehicle Detail Panel ──────────────────────────────────────────────────────
const VehicleDetailPanel: React.FC<{
    vehicle: Vehicle;
    onClose: () => void;
    onUpdate: (updated: Vehicle) => void;
    onEditReq: (v: Vehicle) => void;
}> = ({ vehicle: v, onClose, onUpdate, onEditReq }) => {
    const qc = useQueryClient();
    const status = getStatus(v);
    const m = STATUS_META[status];

    const toggleFlag = useMutation({
        mutationFn: (args: { field: 'isStolen' | 'isSuspected', val: boolean }) => 
            args.field === 'isStolen' ? vehiclesService.flagStolen(v._id, args.val) : vehiclesService.update(v._id, { isSuspected: args.val }),
        onSuccess: () => {
            toast.success('Status updated');
            qc.invalidateQueries({ queryKey: ['vehicles'] });
            onClose(); // In a real app we'd fetch the single updated entity, or rely on refetch
        },
        onError: () => toast.error('Failed to update status'),
    });

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}>
            <Box sx={{ ...glass, p: 3, overflow: 'hidden', position: 'relative' }}>
                {/* Header background pattern */}
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: `linear-gradient(180deg, ${m.color}15 0%, transparent 100%)`, pointerEvents: 'none' }} />
                
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3} position="relative">
                    <Box display="flex" gap={2} alignItems="center">
                        <Avatar sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: `${m.color}22`, color: m.color, border: `2px solid ${m.color}44` }}>
                            <TypeIcon t={v.vehicleType} sx={{ fontSize: 28 }} />
                        </Avatar>
                        <Box>
                            <Typography sx={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>{v.plateNumber}</Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Added {safeDist(v.createdAt)}</Typography>
                        </Box>
                    </Box>
                    <IconButton size="small" onClick={onClose} sx={{ bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}><CloseIcon fontSize="small" /></IconButton>
                </Box>

                <Box mb={2.5}><StatusBadge status={status} /></Box>

                <Divider sx={{ borderColor: BORDER, mb: 2 }} />

                <Box display="flex" flexDirection="column" gap={1.5} mb={3}>
                    {([['Owner', v.ownerName, <PoliceIcon sx={{fontSize:16}}/>], ['Phone', v.ownerPhone || '—', <GpsIcon sx={{fontSize:16}}/>], ['Type', typeLabel(v.vehicleType), <CarIcon sx={{fontSize:16}}/>], ['Model', v.model, null], ['Color', v.color, null]] as const).map(([label, val, icon], i) => (
                        <Box key={i} display="flex" alignItems="center" gap={1.5}>
                            <Box sx={{ width: 24, display: 'flex', justifyContent: 'center', color: 'text.disabled' }}>{icon || <Box sx={{width:6, height:6, borderRadius:'50%', bgcolor:'text.disabled'}}/>}</Box>
                            <Box>
                                <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{val}</Typography>
                            </Box>
                        </Box>
                    ))}
                </Box>

                <Divider sx={{ borderColor: BORDER, mb: 2 }} />

                <Box display="flex" flexDirection="column" gap={1}>
                    <motion.div whileTap={{ scale: 0.98 }}>
                        <Box component="button" onClick={() => onEditReq(v)} sx={{ width: '100%', py: 1.2, border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: 'transparent', color: 'text.secondary', fontWeight: 600, fontSize: 12, cursor: 'pointer', '&:hover': { borderColor: '#00B0FF', color: '#00B0FF', bgcolor: 'rgba(0,176,255,0.05)' } }}>
                            ✏ Edit Details
                        </Box>
                    </motion.div>
                    
                    <Box display="flex" gap={1}>
                        <motion.div whileTap={{ scale: 0.98 }} style={{ flex: 1 }}>
                            <Box component="button" disabled={toggleFlag.isPending} onClick={() => toggleFlag.mutate({ field: 'isStolen', val: !v.isStolen })} sx={{ width: '100%', py: 1.2, border: `1px solid ${v.isStolen ? '#00E676' : '#FF1744'}55`, borderRadius: 2, bgcolor: `${v.isStolen ? '#00E676' : '#FF1744'}11`, color: v.isStolen ? '#00E676' : '#FF1744', fontWeight: 700, fontSize: 11, cursor: 'pointer', '&:hover': { bgcolor: `${v.isStolen ? '#00E676' : '#FF1744'}22` } }}>
                                {v.isStolen ? '✓ Clear Stolen' : '⚠ Mark Stolen'}
                            </Box>
                        </motion.div>
                        <motion.div whileTap={{ scale: 0.98 }} style={{ flex: 1 }}>
                            <Box component="button" disabled={toggleFlag.isPending} onClick={() => toggleFlag.mutate({ field: 'isSuspected', val: !v.isSuspected })} sx={{ width: '100%', py: 1.2, border: `1px solid ${v.isSuspected ? '#00E676' : '#FF9800'}55`, borderRadius: 2, bgcolor: `${v.isSuspected ? '#00E676' : '#FF9800'}11`, color: v.isSuspected ? '#00E676' : '#FF9800', fontWeight: 700, fontSize: 11, cursor: 'pointer', '&:hover': { bgcolor: `${v.isSuspected ? '#00E676' : '#FF9800'}22` } }}>
                                {v.isSuspected ? '✓ Clear Suspect' : '⚠ Mark Suspect'}
                            </Box>
                        </motion.div>
                    </Box>
                </Box>
            </Box>
        </motion.div>
    );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const RowSkeleton: React.FC = () => (
    <Box sx={{ ...glass, p: 2, mb: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Skeleton variant="circular" width={46} height={46} sx={{ bgcolor: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
        <Box flex={1}><Skeleton width="45%" height={16} sx={{ bgcolor: 'rgba(255,255,255,0.07)', mb: 0.5 }} /><Skeleton width="70%" height={12} sx={{ bgcolor: 'rgba(255,255,255,0.04)' }} /></Box>
        <Skeleton width={64} height={22} sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 20 }} />
    </Box>
);

// ── Pill button ───────────────────────────────────────────────────────────────
const PillBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; color?: string }> = ({ active, onClick, children, color = '#00B0FF' }) => (
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

// ── Add/Edit Dialog ───────────────────────────────────────────────────────────
const EMPTY_FORM = { plateNumber: '', ownerName: '', ownerPhone: '', vehicleType: 'FOUR_WHEELER', model: '', color: '' };
const VehicleFormDialog: React.FC<{ open: boolean; existing: Vehicle | null; onClose: () => void }> = ({ open, existing, onClose }) => {
    const qc = useQueryClient();
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setForm(existing ? { plateNumber: existing.plateNumber, ownerName: existing.ownerName, ownerPhone: existing.ownerPhone ?? '', vehicleType: existing.vehicleType, model: existing.model, color: existing.color } : { ...EMPTY_FORM });
            setError('');
        }
    }, [existing, open]);

    const inp = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

    const mutation = useMutation({
        mutationFn: () => existing ? vehiclesService.update(existing._id, form) : vehiclesService.create(form),
        onSuccess: () => {
            toast.success(existing ? 'Vehicle updated' : 'Vehicle added');
            qc.invalidateQueries({ queryKey: ['vehicles'] });
            onClose();
        },
        onError: (e: any) => setError(e?.response?.data?.message || 'Failed to save record'),
    });

    const inputSx = {
        '& .MuiOutlinedInput-root': {
            background: 'rgba(255,255,255,0.03)', fontSize: 13,
            '& fieldset': { borderColor: BORDER },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
            '&.Mui-focused fieldset': { borderColor: '#00B0FF' },
        },
        '& .MuiInputLabel-root': { fontSize: 13 },
        '& .MuiInputLabel-root.Mui-focused': { color: '#00B0FF' },
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#0D1120', border: `1px solid ${BORDER}`, borderRadius: 3 } }}>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Box display="flex" alignItems="center" gap={1}>{existing ? <EditIcon sx={{ color: '#00B0FF' }} /> : <AddIcon sx={{ color: '#00B0FF' }} />} {existing ? 'Edit Vehicle' : 'New Vehicle Record'}</Box>
                <IconButton size="small" onClick={onClose} sx={{ color: 'text.disabled' }}><CloseIcon fontSize="small" /></IconButton>
            </DialogTitle>
            <Divider sx={{ borderColor: BORDER }} />
            <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {error && <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,23,68,0.1)', border: '1px solid rgba(255,23,68,0.3)', color: '#FF1744', fontSize: 13 }}>{error}</Box>}
                
                <TextField label="Plate Number *" fullWidth size="small" value={form.plateNumber} onChange={inp('plateNumber')} disabled={!!existing} placeholder="e.g. MH12AB3456" inputProps={{ style: { fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2 } }} sx={inputSx} />
                <TextField label="Owner Name *" fullWidth size="small" value={form.ownerName} onChange={inp('ownerName')} sx={inputSx} />
                <TextField label="Owner Phone" fullWidth size="small" value={form.ownerPhone} onChange={inp('ownerPhone')} sx={inputSx} />
                
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <FormControl size="small" sx={inputSx}>
                        <InputLabel>Vehicle Type</InputLabel>
                        <Select label="Vehicle Type" value={form.vehicleType} onChange={(e) => setForm(f => ({ ...f, vehicleType: e.target.value }))}>
                            {VEHICLE_TYPES.map(t => <MenuItem key={t} value={t}>{typeLabel(t)}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField label="Color" fullWidth size="small" value={form.color} onChange={inp('color')} sx={inputSx} />
                </Box>
                <TextField label="Model / Make" fullWidth size="small" value={form.model} onChange={inp('model')} sx={inputSx} />
            </DialogContent>
            <Divider sx={{ borderColor: BORDER }} />
            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Box component="button" onClick={onClose} sx={{ px: 3, py: 1, border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: 'transparent', color: 'text.secondary', cursor: 'pointer', fontSize: 13 }}>Cancel</Box>
                <motion.div whileTap={{ scale: 0.97 }}>
                    <Box component="button" onClick={() => mutation.mutate()} disabled={!form.plateNumber || !form.ownerName || mutation.isPending} sx={{
                        px: 3, py: 1, border: 'none', borderRadius: 2,
                        background: (!form.plateNumber || !form.ownerName || mutation.isPending) ? 'rgba(0,176,255,0.3)' : 'linear-gradient(135deg,#00B0FF,#0081CB)',
                        color: '#fff', fontWeight: 800, fontSize: 13,
                        cursor: (form.plateNumber && form.ownerName) ? 'pointer' : 'default',
                        boxShadow: (form.plateNumber && form.ownerName) ? '0 4px 16px rgba(0,176,255,0.4)' : 'none',
                    }}>
                        {mutation.isPending ? 'Saving…' : (existing ? 'Save Changes' : '+ Add Record')}
                    </Box>
                </motion.div>
            </DialogActions>
        </Dialog>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const VehiclesPage: React.FC = () => {
    const [page, setPage]               = useState(1);
    const [search, setSearch]           = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [filterStatus, setFilterStatus] = useState<VehicleStatus | ''>('');
    const [selected, setSelected]       = useState<Vehicle | null>(null);
    const [formOpen, setFormOpen]       = useState(false);
    const [editTarget, setEditTarget]   = useState<Vehicle | null>(null);
    const [view, setView]               = useState<'list' | 'grid'>('grid');
    const LIMIT = 20;

    const commitSearch = useCallback(() => { setSearch(searchInput); setPage(1); }, [searchInput]);

    const queryParams = { page, limit: LIMIT, search: search || undefined, ...(filterStatus === 'STOLEN' && { isStolen: true }), ...(filterStatus === 'SUSPECTED' && { isSuspected: true }) };

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['vehicles', queryParams],
        queryFn: () => vehiclesService.getAll(queryParams as any),
        refetchInterval: 60_000,
    });

    const { data: allData } = useQuery({
        queryKey: ['vehicles', 'stats'],
        queryFn: () => vehiclesService.getAll({}),
        staleTime: 60_000,
    });

    const rawVehicles: Vehicle[] = (data?.data as any)?.vehicles || [];
    const total: number          = (data?.data as any)?.total || 0;
    const pages: number          = (data?.data as any)?.pages || 1;

    // Filters handled mostly by API, except for "CLEAR" which we mimic locally if not strictly defined in backend query params
    const vehicles = rawVehicles.filter(v => {
        if (filterStatus === 'CLEAR' && (v.isStolen || v.isSuspected)) return false;
        return true;
    });

    const allVehicles: Vehicle[] = (allData?.data as any)?.vehicles ?? [];
    const totalAll     = (allData?.data as any)?.total ?? 0;
    const stolenCnt    = allVehicles.filter(v => v.isStolen).length;
    const suspectedCnt = allVehicles.filter(v => v.isSuspected).length;

    return (
        <Box>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
                    <Box>
                        <Typography sx={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}>Vehicle Database</Typography>
                        <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.3 }}>{totalAll} records · ANPR Scanner integrated</Typography>
                    </Box>
                    <Box display="flex" gap={1.5} alignItems="center">
                        <Tooltip title="Refresh">
                            <IconButton size="small" onClick={() => refetch()} sx={{
                                border: `1px solid ${BORDER}`, background: G, color: 'text.secondary',
                                '&:hover': { color: '#00B0FF', borderColor: 'rgba(0,176,255,0.4)' },
                            }}>
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <motion.div whileTap={{ scale: 0.97 }}>
                            <Box component="button" onClick={() => { setEditTarget(null); setFormOpen(true); }} sx={{
                                display: 'flex', alignItems: 'center', gap: 0.8,
                                px: 2.5, py: 1, border: 'none', borderRadius: 2,
                                background: 'linear-gradient(135deg,#00B0FF,#0081CB)',
                                color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                                boxShadow: '0 4px 20px rgba(0,176,255,0.4)',
                            }}>
                                <AddIcon sx={{ fontSize: 17 }} /> Add Vehicle
                            </Box>
                        </motion.div>
                    </Box>
                </Box>
            </motion.div>

            {/* Stat cards */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2, mb: 3 }}>
                    <StatCard label="Total Vehicles" value={totalAll}     icon={<CarIcon />}     color="#00B0FF" delay={0}    />
                    <StatCard label="Stolen Alert"   value={stolenCnt}    icon={<WarningIcon />} color="#FF1744" delay={0.07} sub="high priority" />
                    <StatCard label="Suspected"      value={suspectedCnt} icon={<WarningIcon />} color="#FF9800" delay={0.14} sub="monitoring" />
                    <StatCard label="Active Types"   value={new Set(allVehicles.map(v => v.vehicleType)).size} icon={<GridViewIcon />} color="#00E676" delay={0.21} sub="categories" />
                </Box>
            </motion.div>

            {/* Two-column layout */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 340px' }, gap: 3, alignItems: 'start' }}>

                {/* LEFT: list/grid */}
                <Box>
                    {/* Search + view toggle bar */}
                    <Box sx={{ ...glass, p: 2, mb: 2 }}>
                        <Box display="flex" gap={1.5} mb={1.5}>
                            <TextField
                                placeholder="Search plate or owner…"
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
                                        '&.Mui-focused fieldset': { borderColor: '#00B0FF' },
                                    },
                                }}
                            />
                            <motion.div whileTap={{ scale: 0.97 }}>
                                <Box component="button" onClick={commitSearch} sx={{
                                    px: 2.5, border: `1px solid rgba(0,176,255,0.4)`, borderRadius: 2,
                                    bgcolor: 'rgba(0,176,255,0.1)', color: '#00B0FF', fontWeight: 700, fontSize: 13, cursor: 'pointer', height: '100%',
                                }}>Search</Box>
                            </motion.div>
                            {/* View toggle */}
                            <Box sx={{ display: 'flex', border: `1px solid ${BORDER}`, borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                                <Tooltip title="Grid view">
                                    <IconButton size="small" onClick={() => setView('grid')} sx={{
                                        borderRadius: 0, px: 1.5,
                                        bgcolor: view === 'grid' ? 'rgba(0,176,255,0.15)' : 'transparent',
                                        color: view === 'grid' ? '#00B0FF' : 'text.disabled',
                                        '&:hover': { bgcolor: 'rgba(0,176,255,0.1)', color: '#00B0FF' },
                                    }}>
                                        <GridViewIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Tooltip>
                                <Box sx={{ width: 1, bgcolor: BORDER }} />
                                <Tooltip title="List view">
                                    <IconButton size="small" onClick={() => setView('list')} sx={{
                                        borderRadius: 0, px: 1.5,
                                        bgcolor: view === 'list' ? 'rgba(0,176,255,0.15)' : 'transparent',
                                        color: view === 'list' ? '#00B0FF' : 'text.disabled',
                                        '&:hover': { bgcolor: 'rgba(0,176,255,0.1)', color: '#00B0FF' },
                                    }}>
                                        <ListViewIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                        <Box display="flex" gap={0.8} flexWrap="wrap" alignItems="center">
                            <FilterIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                            <PillBtn active={filterStatus === ''} onClick={() => { setFilterStatus(''); setPage(1); }}>All</PillBtn>
                            <PillBtn active={filterStatus === 'STOLEN'} onClick={() => { setFilterStatus(filterStatus === 'STOLEN' ? '' : 'STOLEN'); setPage(1); }} color={STATUS_META.STOLEN.color}>Stolen</PillBtn>
                            <PillBtn active={filterStatus === 'SUSPECTED'} onClick={() => { setFilterStatus(filterStatus === 'SUSPECTED' ? '' : 'SUSPECTED'); setPage(1); }} color={STATUS_META.SUSPECTED.color}>Suspected</PillBtn>
                            <PillBtn active={filterStatus === 'CLEAR'} onClick={() => { setFilterStatus(filterStatus === 'CLEAR' ? '' : 'CLEAR'); setPage(1); }} color={STATUS_META.CLEAR.color}>Clear</PillBtn>
                        </Box>
                    </Box>

                    {/* Progress bar */}
                    {(isLoading || isFetching) && (
                        <Box sx={{ height: 2, bgcolor: 'rgba(0,176,255,0.15)', borderRadius: 1, mb: 1, overflow: 'hidden' }}>
                            <motion.div style={{ height: '100%', background: '#00B0FF', borderRadius: 4 }}
                                animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} />
                        </Box>
                    )}

                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <Box key="sk">{Array.from({ length: 7 }).map((_, i) => <RowSkeleton key={i} />)}</Box>
                        ) : vehicles.length === 0 ? (
                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <Box sx={{ ...glass, textAlign: 'center', py: 8 }}>
                                    <CarIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 2 }} />
                                    <Typography fontSize={15} fontWeight={700}>No vehicles found</Typography>
                                    <Typography fontSize={13} color="text.secondary" mt={0.5}>Try adjusting your search or filters</Typography>
                                </Box>
                            </motion.div>
                        ) : view === 'grid' ? (
                            <Box key="grid" sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2.5 }}>
                                {vehicles.map((v, i) => (
                                    <VehicleGridCard
                                        key={v._id} v={v} index={i}
                                        selected={selected?._id === v._id}
                                        onClick={() => setSelected(selected?._id === v._id ? null : v)}
                                    />
                                ))}
                            </Box>
                        ) : (
                            <Box key="list">
                                {vehicles.map((v, i) => (
                                    <VehicleCard
                                        key={v._id} v={v} index={i}
                                        selected={selected?._id === v._id}
                                        onClick={() => setSelected(selected?._id === v._id ? null : v)}
                                    />
                                ))}
                            </Box>
                        )}
                    </AnimatePresence>

                    <Pagination page={page} pages={pages} total={total} onChange={(p) => { setPage(p); setSelected(null); }} />
                </Box>

                {/* RIGHT: detail / ANPR panel */}
                <Box>
                    <AnimatePresence mode="wait">
                        {selected ? (
                            <VehicleDetailPanel 
                                key={selected._id} 
                                vehicle={selected} 
                                onClose={() => setSelected(null)} 
                                onUpdate={(updated) => setSelected(updated)} 
                                onEditReq={(v) => { setEditTarget(v); setFormOpen(true); }}
                            />
                        ) : (
                            <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <AnprScannerPanel />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Box>
            </Box>

            <VehicleFormDialog open={formOpen} existing={editTarget} onClose={() => setFormOpen(false)} />
        </Box>
    );
};

export default VehiclesPage;