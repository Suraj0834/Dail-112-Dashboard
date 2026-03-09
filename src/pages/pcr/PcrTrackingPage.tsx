// =============================================================================
// pages/pcr/PcrTrackingPage.tsx — PCR Van Live Map + Fleet Management
// Design matches SOS Monitor page (glassmorphism, dark map, same patterns)
// =============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Box, Grid, Typography, Chip, Avatar, Divider,
    TextField, InputAdornment, CircularProgress, IconButton, Tooltip,
    Button, Dialog, DialogTitle, DialogContent, DialogActions,
    Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel,
    Skeleton,
} from '@mui/material';
import {
    DirectionsCar as PcrIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    RadioButtonChecked as LiveDotIcon,
    AccountBalance as StationIcon,
    MyLocation as CenterIcon,
    Person as DriverIcon,
    PersonAdd as CoDriverIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api';
import { pcrService, policeService } from '../../services/api.service';
import { useSocket } from '../../context/SocketContext';
import type { PcrVan, User } from '../../types';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Map constants  (no google.* at module level)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.2090 }; // Delhi

const DARK_MAP_STYLE = [
    { elementType: 'geometry',                stylers: [{ color: '#0a0e1a' }] },
    { elementType: 'labels.text.stroke',      stylers: [{ color: '#0a0e1a' }] },
    { elementType: 'labels.text.fill',        stylers: [{ color: '#7a89a8' }] },
    { featureType: 'road',                    elementType: 'geometry',            stylers: [{ color: '#141b2e' }] },
    { featureType: 'road',                    elementType: 'geometry.stroke',     stylers: [{ color: '#0d1526' }] },
    { featureType: 'road',                    elementType: 'labels.text.fill',    stylers: [{ color: '#9ca5b3' }] },
    { featureType: 'road.highway',            elementType: 'geometry',            stylers: [{ color: '#1e2940' }] },
    { featureType: 'water',                   elementType: 'geometry',            stylers: [{ color: '#06080f' }] },
    { featureType: 'poi',                     stylers: [{ visibility: 'off' }] },
    { featureType: 'transit',                 elementType: 'geometry',            stylers: [{ color: '#0f1621' }] },
    { featureType: 'administrative',          elementType: 'geometry',            stylers: [{ color: '#1a2338' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill',   stylers: [{ color: '#c4c4c4' }] },
];

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const MAP_OPTIONS = {
    styles: DARK_MAP_STYLE,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    scrollwheel: true,
    gestureHandling: 'greedy' as const,
};

const POLICE_STATIONS = [
    { id: 'ps1', name: 'Connaught Place PS',   lat: 28.6315, lng: 77.2167, address: '2, Sansad Marg, CP, New Delhi' },
    { id: 'ps2', name: 'Parliament Street PS', lat: 28.6270, lng: 77.2114, address: 'Parliament Street, New Delhi' },
    { id: 'ps3', name: 'Chanakyapuri PS',      lat: 28.5997, lng: 77.1854, address: 'Shanti Path, Chanakyapuri' },
    { id: 'ps4', name: 'Saket PS',             lat: 28.5244, lng: 77.2060, address: 'Press Enclave Road, Saket' },
    { id: 'ps5', name: 'Rohini PS',            lat: 28.7470, lng: 77.0670, address: 'Sector-9, Rohini' },
    { id: 'ps6', name: 'Janakpuri PS',         lat: 28.6220, lng: 77.0900, address: 'District Centre, Janakpuri' },
    { id: 'ps7', name: 'Laxmi Nagar PS',       lat: 28.6286, lng: 77.2775, address: 'Vikas Marg, Laxmi Nagar' },
    { id: 'ps8', name: 'Dwarka Sector-23 PS',  lat: 28.5829, lng: 77.0512, address: 'Sector 23, Dwarka' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Status metadata
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_META: Record<PcrVan['status'], { label: string; color: string; bg: string; border: string }> = {
    Available:   { label: 'Available',   color: '#00E676', bg: 'rgba(0,230,118,0.12)',    border: 'rgba(0,230,118,0.3)'    },
    Busy:        { label: 'Busy',        color: '#FF6D00', bg: 'rgba(255,109,0,0.12)',   border: 'rgba(255,109,0,0.3)'    },
    'Off-Duty':  { label: 'Off-Duty',    color: '#9E9E9E', bg: 'rgba(158,158,158,0.12)', border: 'rgba(158,158,158,0.3)'  },
    Maintenance: { label: 'Maintenance', color: '#FFD600', bg: 'rgba(255,214,0,0.12)',   border: 'rgba(255,214,0,0.3)'    },
};

const STAT_CONFIGS = [
    { key: 'total',       label: 'Total Vans',  color: '#40C4FF' },
    { key: 'available',   label: 'Available',   color: '#00E676' },
    { key: 'busy',        label: 'Busy',        color: '#FF6D00' },
    { key: 'maintenance', label: 'Maintenance', color: '#FFD600' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers  (mirror SOS Monitor patterns)
// ─────────────────────────────────────────────────────────────────────────────

const glass = (border = 'rgba(255,255,255,0.07)') => ({
    borderRadius: '20px',
    background: 'linear-gradient(135deg, rgba(20,27,46,0.95), rgba(14,20,36,0.98))',
    border: `1px solid ${border}`,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
});

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Typography variant="caption" sx={{
        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px',
        color: 'rgba(255,255,255,0.3)', fontSize: 10, display: 'block', mb: 1,
    }}>
        {children}
    </Typography>
);

const MiniStat: React.FC<{ label: string; value: number; color: string; delay: number }> = ({ label, value, color, delay }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}>
        <Box sx={{
            ...glass(`${color}25`), px: 2.5, py: 2, textAlign: 'center',
            '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${color}, transparent)` },
        }}>
            <Typography sx={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color }}>{value}</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: 10 }}>{label}</Typography>
        </Box>
    </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Form data
// ─────────────────────────────────────────────────────────────────────────────

interface VanFormData {
    vehicleName: string;
    plateNo: string;
    model: string;
    color: string;
    station: string;
    driverId: string;
    coDriverId: string;
    status: PcrVan['status'];
    notes: string;
    isVisible: boolean;
}

const emptyForm = (): VanFormData => ({
    vehicleName: '', plateNo: '', model: '', color: 'White',
    station: '', driverId: '', coDriverId: '',
    status: 'Available', notes: '', isVisible: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// VanRow  (mirrors AlertRow from SOS Monitor)
// ─────────────────────────────────────────────────────────────────────────────

interface VanRowProps {
    van: PcrVan;
    selected: boolean;
    officers: User[];
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onStatusChange: (s: PcrVan['status']) => void;
}

const VanRow: React.FC<VanRowProps> = ({ van, selected, officers, onClick, onEdit, onDelete, onStatusChange }) => {
    const meta = STATUS_META[van.status];
    const driverUser  = typeof van.assignedOfficer === 'object' ? van.assignedOfficer as User : officers.find((o) => o._id === van.assignedOfficer) || null;
    const coDriverUser = typeof van.coDriver === 'object' ? van.coDriver as User : officers.find((o) => o._id === van.coDriver) || null;

    return (
        <motion.div layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Box onClick={onClick} sx={{
                px: 2, py: 1.5, cursor: 'pointer',
                borderLeft: `3px solid ${selected ? meta.color : 'transparent'}`,
                background: selected ? `${meta.color}08` : 'transparent',
                transition: 'all 0.2s ease',
                '&:hover': { background: `${meta.color}10`, borderLeftColor: meta.color },
                display: 'flex', alignItems: 'center', gap: 1.5,
            }}>
                {/* Vehicle avatar */}
                <Avatar sx={{ width: 38, height: 38, bgcolor: `${meta.color}22`, border: `1.5px solid ${meta.color}40`, color: meta.color, flexShrink: 0 }}>
                    <PcrIcon sx={{ fontSize: 18 }} />
                </Avatar>

                {/* Details */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {van.vehicleName}
                        </Typography>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#40C4FF', fontWeight: 600, flexShrink: 0 }}>{van.plateNo}</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, display: 'block' }}>
                        {van.station || 'No Station'}{van.model ? ` · ${van.model}` : ''}
                    </Typography>
                    {/* Driver + Co-driver */}
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                        {driverUser ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.8, py: 0.3, borderRadius: '5px', bgcolor: 'rgba(124,77,255,0.1)', border: '1px solid rgba(124,77,255,0.25)' }}>
                                <DriverIcon sx={{ fontSize: 9, color: '#7C4DFF' }} />
                                <Typography variant="caption" sx={{ color: '#7C4DFF', fontSize: 9.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    {driverUser.name}{driverUser.badgeId ? ` · ${driverUser.badgeId}` : ''}
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.8, py: 0.3, borderRadius: '5px', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <DriverIcon sx={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }} />
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 9.5 }}>No Driver</Typography>
                            </Box>
                        )}
                        {coDriverUser ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.8, py: 0.3, borderRadius: '5px', bgcolor: 'rgba(64,196,255,0.1)', border: '1px solid rgba(64,196,255,0.25)' }}>
                                <CoDriverIcon sx={{ fontSize: 9, color: '#40C4FF' }} />
                                <Typography variant="caption" sx={{ color: '#40C4FF', fontSize: 9.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    {coDriverUser.name}{coDriverUser.badgeId ? ` · ${coDriverUser.badgeId}` : ''}
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.8, py: 0.3, borderRadius: '5px', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <CoDriverIcon sx={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }} />
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 9.5 }}>No Co-Driver</Typography>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Status + Actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexShrink: 0 }}>
                    <FormControl size="small" variant="outlined" sx={{ minWidth: 105 }} onClick={(e) => e.stopPropagation()}>
                        <Select
                            value={van.status}
                            onChange={(e) => onStatusChange(e.target.value as PcrVan['status'])}
                            sx={{ height: 26, fontSize: '0.72rem', color: meta.color, '& .MuiOutlinedInput-notchedOutline': { borderColor: meta.border } }}
                        >
                            {(['Available', 'Busy', 'Off-Duty', 'Maintenance'] as const).map((s) => (
                                <MenuItem key={s} value={s} sx={{ fontSize: '0.75rem' }}>{s}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Tooltip title="Edit">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(); }} sx={{ color: '#40C4FF', p: 0.5 }}>
                            <EditIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(); }} sx={{ color: '#FF1744', p: 0.5 }}>
                            <DeleteIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
        </motion.div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Live location entry interfaces (used for map)
// ─────────────────────────────────────────────────────────────────────────────

interface PcrMapEntry { lat: number; lng: number; name: string; station: string; plateNo: string; status: PcrVan['status']; }

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const PcrTrackingPage: React.FC = () => {
    const qc = useQueryClient();
    const { socket } = useSocket();
    const mapRef = useRef<google.maps.Map | null>(null);

    // ── UI state ──────────────────────────────────────────────────────────────
    const [selectedVan, setSelectedVan] = useState<PcrVan | null>(null);
    const [hoveredMarker, setHoveredMarker] = useState<{ type: string; id: string } | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null);
    const [editTarget, setEditTarget] = useState<PcrVan | null>(null);
    const [form, setForm] = useState<VanFormData>(emptyForm());
    const [deleteTarget, setDeleteTarget] = useState<PcrVan | null>(null);
    const [pcrMapLocs, setPcrMapLocs] = useState<Map<string, PcrMapEntry>>(() => new Map());

    const { isLoaded } = useJsApiLoader({ googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || '' });

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: vanData, isLoading, isError } = useQuery({
        queryKey: ['pcr-vans'],
        queryFn: () => pcrService.getAll(),
        refetchInterval: 30_000,
    });

    const { data: officerData } = useQuery({
        queryKey: ['officers-all'],
        queryFn: () => policeService.getAll({ isActive: true }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vans: PcrVan[] = useMemo(() => (vanData?.data as any)?.vans ?? [], [vanData]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const officers: User[] = useMemo(() => (officerData?.data as any)?.officers ?? [], [officerData]);

    // Populate map from vans data
    useEffect(() => {
        setPcrMapLocs(() => {
            const next = new Map<string, PcrMapEntry>();
            vans.forEach((v) => {
                const coords = v.location?.coordinates;
                // Skip if no coords, wrong length, or null-island [0,0]
                if (!coords || coords.length !== 2) return;
                const [lng, lat] = coords;
                if (lng === 0 && lat === 0) return;
                // Show all vans with valid GPS — do NOT gate on isVisible so
                // admins always see every van's position on the map
                next.set(v._id, { lat, lng, name: v.vehicleName, station: v.station || '', plateNo: v.plateNo, status: v.status });
            });
            return next;
        });
    }, [vans]);

    // ── Socket ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;
        const handle = (ev: { vanId: string; latitude: number; longitude: number; status: PcrVan['status'] }) => {
            qc.invalidateQueries({ queryKey: ['pcr-vans'] });
            setPcrMapLocs((prev) => {
                const next = new Map(prev);
                const existing = next.get(ev.vanId);
                if (existing) next.set(ev.vanId, { ...existing, lat: ev.latitude, lng: ev.longitude, status: ev.status });
                return next;
            });
        };
        socket.on('pcr_location_update', handle);
        return () => { socket.off('pcr_location_update', handle); };
    }, [socket, qc]);

    // ── Map callbacks ─────────────────────────────────────────────────────────
    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        map.setCenter(DEFAULT_CENTER);
        map.setZoom(11);
    }, []);

    const centerOnSelected = () => {
        if (!selectedVan?.location?.coordinates) return;
        const [lng, lat] = selectedVan.location.coordinates;
        mapRef.current?.panTo({ lat, lng });
        mapRef.current?.setZoom(15);
    };

    // ── Mutations ─────────────────────────────────────────────────────────────
    const createMut = useMutation({
        mutationFn: (d: VanFormData) => pcrService.create({
            vehicleName: d.vehicleName, plateNo: d.plateNo, model: d.model || undefined,
            color: d.color || undefined, station: d.station || undefined,
            assignedOfficer: d.driverId || undefined, coDriver: d.coDriverId || undefined,
            status: d.status, notes: d.notes || undefined, isVisible: d.isVisible,
        }),
        onSuccess: () => { toast.success('PCR Van created'); qc.invalidateQueries({ queryKey: ['pcr-vans'] }); closeDialog(); },
        onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Create failed'),
    });

    const updateMut = useMutation({
        mutationFn: ({ id, d }: { id: string; d: VanFormData }) => pcrService.update(id, {
            vehicleName: d.vehicleName, plateNo: d.plateNo, model: d.model || undefined,
            color: d.color || undefined, station: d.station || undefined,
            assignedOfficer: d.driverId || null, coDriver: d.coDriverId || null,
            status: d.status, notes: d.notes || undefined, isVisible: d.isVisible,
        }),
        onSuccess: () => { toast.success('PCR Van updated'); qc.invalidateQueries({ queryKey: ['pcr-vans'] }); closeDialog(); },
        onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Update failed'),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => pcrService.delete(id),
        onSuccess: () => { toast.success('PCR Van deleted'); qc.invalidateQueries({ queryKey: ['pcr-vans'] }); setDeleteTarget(null); },
        onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Delete failed'),
    });

    const statusMut = useMutation({
        mutationFn: ({ id, s }: { id: string; s: PcrVan['status'] }) => pcrService.setStatus(id, s),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['pcr-vans'] }),
        onError: () => toast.error('Status update failed'),
    });

    // ── Dialog helpers ────────────────────────────────────────────────────────
    const openAdd = () => { setForm(emptyForm()); setEditTarget(null); setDialogMode('add'); };

    const openEdit = (van: PcrVan) => {
        const driverOid  = typeof van.assignedOfficer === 'object' && van.assignedOfficer ? (van.assignedOfficer as User)._id : (van.assignedOfficer as string) || '';
        const coDriverOid = typeof van.coDriver === 'object' && van.coDriver ? (van.coDriver as User)._id : (van.coDriver as string) || '';
        setForm({ vehicleName: van.vehicleName, plateNo: van.plateNo, model: van.model || '',
            color: van.color || 'White', station: van.station || '',
            driverId: driverOid, coDriverId: coDriverOid,
            status: van.status, notes: van.notes || '', isVisible: van.isVisible });
        setEditTarget(van);
        setDialogMode('edit');
    };

    const closeDialog = () => { setDialogMode(null); setEditTarget(null); };

    const handleSubmit = () => {
        if (!form.vehicleName.trim() || !form.plateNo.trim()) { toast.error('Vehicle name and plate no. are required'); return; }
        if (dialogMode === 'add') createMut.mutate(form);
        else if (dialogMode === 'edit' && editTarget) updateMut.mutate({ id: editTarget._id, d: form });
    };

    // ── Filtered + counted data ───────────────────────────────────────────────
    const filtered = useMemo(() => {
        let list = [...vans];
        if (statusFilter !== 'ALL') list = list.filter((v) => v.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((v) =>
                v.vehicleName.toLowerCase().includes(q) ||
                v.plateNo.toLowerCase().includes(q) ||
                (v.station || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [vans, search, statusFilter]);

    const counts = useMemo(() => ({
        total: vans.length,
        available: vans.filter((v) => v.status === 'Available').length,
        busy: vans.filter((v) => v.status === 'Busy').length,
        maintenance: vans.filter((v) => v.status === 'Maintenance').length,
    }), [vans]);

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <Box sx={{ '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }}>

            {/* ── Header ────────────────────────────────────────────────────── */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="h4" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PcrIcon sx={{ color: '#40C4FF', fontSize: 34 }} />
                        PCR Van Tracking
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Live map · Fleet management · Driver & co-driver assignment
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 1.5, py: 0.6, borderRadius: '8px', bgcolor: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)' }}>
                        <LiveDotIcon sx={{ fontSize: 10, color: '#00E676', animation: 'blink 1.5s ease-in-out infinite' }} />
                        <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 700, fontSize: 10 }}>LIVE</Typography>
                    </Box>
                    <Tooltip title="Refresh">
                        <IconButton size="small" onClick={() => qc.invalidateQueries({ queryKey: ['pcr-vans'] })}
                            sx={{ border: '1px solid rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                            <RefreshIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
                        sx={{ background: 'linear-gradient(135deg,#40C4FF,#7C4DFF)', fontWeight: 700 }}>
                        Add PCR Van
                    </Button>
                </Box>
            </Box>

            {/* ── Mini Stat Cards ───────────────────────────────────────────── */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {STAT_CONFIGS.map(({ key, label, color }, i) => (
                    <Grid key={key} size={{ xs: 6, md: 3 }}>
                        <MiniStat label={label} value={counts[key as keyof typeof counts]} color={color} delay={i * 0.08} />
                    </Grid>
                ))}
            </Grid>

            {/* ── Live Map ──────────────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
                <Box sx={{ ...glass('rgba(64,196,255,0.15)'), mb: 3, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #40C4FF, transparent)' }} />

                    {/* Map header */}
                    <Box sx={{ px: 3, pt: 2.5, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <Box>
                            <SectionLabel>Geospatial Fleet Intelligence</SectionLabel>
                            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1, color: '#fff' }}>Live Location Map</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 1.5, py: 0.6, borderRadius: '8px', bgcolor: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)' }}>
                                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#00E676', animation: 'blink 2s ease-in-out infinite' }} />
                                <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 700, fontSize: 10 }}>GPS Active</Typography>
                            </Box>
                            <Button size="small" onClick={centerOnSelected}
                                startIcon={<CenterIcon sx={{ fontSize: '14px !important' }} />}
                                sx={{ height: 30, fontSize: 11, fontWeight: 600, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                                Focus Selected
                            </Button>
                        </Box>
                    </Box>

                    {/* Map canvas */}
                    <Box sx={{ px: 2.5, pb: 0 }}>
                        {isError ? (
                            <Box sx={{ height: 520, borderRadius: '14px', border: '1px solid rgba(255,23,68,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, bgcolor: 'rgba(255,23,68,0.04)' }}>
                                <Typography sx={{ color: '#FF1744', fontWeight: 700, fontSize: 15 }}>Failed to load van data</Typography>
                                <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Check your connection and try refreshing</Typography>
                                <Button size="small" startIcon={<RefreshIcon />} onClick={() => qc.invalidateQueries({ queryKey: ['pcr-vans'] })}
                                    sx={{ mt: 1, color: '#FF1744', border: '1px solid rgba(255,23,68,0.3)', '&:hover': { bgcolor: 'rgba(255,23,68,0.08)' } }}>
                                    Retry
                                </Button>
                            </Box>
                    ) : isLoaded ? (
                            <Box sx={{ height: 520, borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
                                <GoogleMap mapContainerStyle={MAP_CONTAINER_STYLE} onLoad={onMapLoad} options={MAP_OPTIONS}>

                                    {/* PCR Van pins */}
                                    {Array.from(pcrMapLocs.entries()).map(([vid, v]) => {
                                        const isHov = hoveredMarker?.type === 'pcr' && hoveredMarker.id === vid;
                                        const isSel = selectedVan?._id === vid;
                                        const sc = STATUS_META[v.status]?.color || '#40C4FF';
                                        return (
                                            <OverlayView key={`pcr-${vid}`} position={{ lat: v.lat, lng: v.lng }}
                                                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                                                getPixelPositionOffset={() => ({ x: isSel ? -18 : -14, y: isSel ? -32 : -26 })}>
                                                <Box onMouseEnter={() => setHoveredMarker({ type: 'pcr', id: vid })}
                                                    onMouseLeave={() => setHoveredMarker(null)}
                                                    sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
                                                    {(isHov || isSel) && (
                                                        <Box sx={{ position: 'absolute', bottom: '110%', width: 185, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(14,20,36,0.96)', border: `1px solid ${sc}45`, boxShadow: '0 4px 20px rgba(0,0,0,0.6)', zIndex: 1000, pointerEvents: 'none' }}>
                                                            <Typography sx={{ color: sc, fontWeight: 700, fontSize: 12, mb: 0.3, whiteSpace: 'nowrap' }}>{v.name}</Typography>
                                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontSize: 10 }}>Plate: {v.plateNo}</Typography>
                                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Station: {v.station || 'N/A'}</Typography>
                                                            <Typography variant="caption" sx={{ color: sc, display: 'block', fontSize: 10, mt: 0.4, fontWeight: 600 }}>● {v.status}</Typography>
                                                        </Box>
                                                    )}
                                                    <Box sx={{ width: isSel ? 36 : 28, height: isSel ? 26 : 20, borderRadius: '5px', background: `linear-gradient(135deg,${sc},${sc}bb)`, border: `2.5px solid ${isSel ? '#fff' : sc}55`, boxShadow: `0 0 ${isSel ? '14px 4px' : '10px 2px'} ${sc}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                                        <PcrIcon sx={{ fontSize: isSel ? 16 : 12, color: '#fff' }} />
                                                    </Box>
                                                    <Box sx={{ width: 0, height: 0, borderLeft: `${isSel ? 7 : 6}px solid transparent`, borderRight: `${isSel ? 7 : 6}px solid transparent`, borderTop: `6px solid ${sc}` }} />
                                                </Box>
                                            </OverlayView>
                                        );
                                    })}

                                    {/* Police station pins */}
                                    {POLICE_STATIONS.map((ps) => {
                                        const isHov = hoveredMarker?.type === 'station' && hoveredMarker.id === ps.id;
                                        return (
                                            <OverlayView key={`ps-${ps.id}`} position={{ lat: ps.lat, lng: ps.lng }}
                                                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                                                getPixelPositionOffset={() => ({ x: -12, y: -30 })}>
                                                <Box onMouseEnter={() => setHoveredMarker({ type: 'station', id: ps.id })}
                                                    onMouseLeave={() => setHoveredMarker(null)}
                                                    sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
                                                    {isHov && (
                                                        <Box sx={{ position: 'absolute', bottom: '110%', width: 170, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(14,20,36,0.96)', border: '1px solid rgba(255,214,0,0.45)', boxShadow: '0 4px 20px rgba(0,0,0,0.6)', zIndex: 1000, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                                                            <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 12, mb: 0.3 }}>{ps.name}</Typography>
                                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontSize: 10 }}>{ps.address}</Typography>
                                                        </Box>
                                                    )}
                                                    <Box sx={{ width: 24, height: 24, borderRadius: '5px 5px 0 0', background: 'linear-gradient(135deg,#FFD600,#F9A825)', border: '2px solid rgba(255,214,0,0.55)', boxShadow: '0 0 10px rgba(255,214,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <StationIcon sx={{ fontSize: 12, color: '#333' }} />
                                                    </Box>
                                                    <Box sx={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #FFD600' }} />
                                                </Box>
                                            </OverlayView>
                                        );
                                    })}
                                </GoogleMap>
                                {/* No-GPS overlay — shown when map loaded but no vans have valid coordinates */}
                                {!isLoading && pcrMapLocs.size === 0 && (
                                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, pointerEvents: 'none', background: 'rgba(10,14,26,0.55)', backdropFilter: 'blur(2px)' }}>
                                        <PcrIcon sx={{ fontSize: 38, color: 'rgba(255,255,255,0.2)' }} />
                                        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 14 }}>No GPS data available</Typography>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Vans will appear once their location is reported</Typography>
                                    </Box>
                                )}
                            </Box>
                        ) : (
                            <Skeleton variant="rectangular" sx={{ height: 520, borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.04)' }} />
                        )}
                    </Box>

                    {/* Legend */}
                    <Box sx={{ px: 3, py: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
                        {Object.values(STATUS_META).map((m) => (
                            <Box key={m.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                <Box sx={{ width: 10, height: 7, borderRadius: '2px', bgcolor: m.color, boxShadow: `0 0 5px ${m.color}` }} />
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{m.label}</Typography>
                            </Box>
                        ))}
                        <Box sx={{ width: '1px', height: 16, bgcolor: 'rgba(255,255,255,0.1)' }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '4px 4px 0 0', bgcolor: '#FFD600', boxShadow: '0 0 5px #FFD600' }} />
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Police Station</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, ml: 'auto' }}>
                            Scroll to zoom · Hover pins for details · Drag to pan
                        </Typography>
                    </Box>
                </Box>
            </motion.div>

            {/* ── Fleet List ────────────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.32 }}>
                <Box sx={{ ...glass() }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />

                    {/* List header */}
                    <Box sx={{ px: 3, pt: 2.5, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', gap: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <Box>
                            <SectionLabel>Fleet Registry</SectionLabel>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', lineHeight: 1 }}>Vehicle List</Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                                    {filtered.length} of {vans.length} vehicles
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                            <TextField size="small" placeholder="Search van, plate, station…" value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment> } }}
                                sx={{ width: 230 }} />
                            <Box sx={{ display: 'flex', gap: 0.8 }}>
                                {['ALL', 'Available', 'Busy', 'Off-Duty', 'Maintenance'].map((s) => (
                                    <Chip key={s} label={s} size="small" onClick={() => setStatusFilter(s)} sx={{
                                        cursor: 'pointer', fontWeight: 600, fontSize: '0.68rem',
                                        ...(statusFilter === s
                                            ? { background: '#40C4FF22', border: '1px solid #40C4FF88', color: '#40C4FF' }
                                            : { border: '1px solid rgba(255,255,255,0.1)', color: 'text.secondary' }),
                                    }} />
                                ))}
                            </Box>
                        </Box>
                    </Box>

                    {/* List body */}
                    <Box sx={{ maxHeight: 480, overflow: 'auto', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 4 } }}>
                        {isLoading ? (
                            [...Array(6)].map((_, i) => (
                                <Box key={i} sx={{ px: 2, py: 1.5, display: 'flex', gap: 1.5 }}>
                                    <Skeleton variant="circular" width={38} height={38} sx={{ bgcolor: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                                    <Box sx={{ flex: 1 }}>
                                        <Skeleton width="45%" height={14} sx={{ bgcolor: 'rgba(255,255,255,0.05)', mb: 0.5 }} />
                                        <Skeleton width="75%" height={11} sx={{ bgcolor: 'rgba(255,255,255,0.04)' }} />
                                    </Box>
                                </Box>
                            ))
                        ) : filtered.length === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 2, opacity: 0.5 }}>
                                <PcrIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.1)' }} />
                                <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>No vehicles found</Typography>
                            </Box>
                        ) : (
                            <AnimatePresence>
                                {filtered.map((van, i) => (
                                    <React.Fragment key={van._id}>
                                        <VanRow
                                            van={van}
                                            selected={selectedVan?._id === van._id}
                                            officers={officers}
                                            onClick={() => setSelectedVan(prev => prev?._id === van._id ? null : van)}
                                            onEdit={() => openEdit(van)}
                                            onDelete={() => setDeleteTarget(van)}
                                            onStatusChange={(s) => statusMut.mutate({ id: van._id, s })}
                                        />
                                        {i < filtered.length - 1 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)', mx: 2 }} />}
                                    </React.Fragment>
                                ))}
                            </AnimatePresence>
                        )}
                    </Box>

                    {/* Selected van detail footer */}
                    <AnimatePresence>
                        {selectedVan && (() => {
                            const driverUser  = typeof selectedVan.assignedOfficer === 'object' ? selectedVan.assignedOfficer as User : officers.find((o) => o._id === selectedVan.assignedOfficer) || null;
                            const coDriverUser = typeof selectedVan.coDriver === 'object' ? selectedVan.coDriver as User : officers.find((o) => o._id === selectedVan.coDriver) || null;
                            const meta = STATUS_META[selectedVan.status];
                            return (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.3 }}>
                                    <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', p: 2, flexShrink: 0 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: 10 }}>Selected Vehicle</Typography>
                                            <CloseIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', '&:hover': { color: '#fff' } }} onClick={() => setSelectedVan(null)} />
                                        </Box>
                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 12, sm: 4 }}>
                                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                                    <Avatar sx={{ width: 40, height: 40, bgcolor: `${meta.color}22`, border: `1.5px solid ${meta.color}40`, color: meta.color }}>
                                                        <PcrIcon />
                                                    </Avatar>
                                                    <Box>
                                                        <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>{selectedVan.vehicleName}</Typography>
                                                        <Typography variant="caption" sx={{ color: '#40C4FF', fontFamily: 'monospace' }}>{selectedVan.plateNo}</Typography>
                                                        <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{selectedVan.station || 'No Station'}</Typography>
                                                    </Box>
                                                </Box>
                                            </Grid>
                                            <Grid size={{ xs: 6, sm: 3 }}>
                                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Driver</Typography>
                                                {driverUser ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                                        <Avatar sx={{ width: 24, height: 24, bgcolor: 'rgba(124,77,255,0.2)', fontSize: 10, color: '#7C4DFF', fontWeight: 700 }}>{driverUser.name?.[0]}</Avatar>
                                                        <Box>
                                                            <Typography sx={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{driverUser.name}</Typography>
                                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{driverUser.badgeId || ''}</Typography>
                                                        </Box>
                                                    </Box>
                                                ) : <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>Unassigned</Typography>}
                                            </Grid>
                                            <Grid size={{ xs: 6, sm: 3 }}>
                                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Co-Driver</Typography>
                                                {coDriverUser ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                                        <Avatar sx={{ width: 24, height: 24, bgcolor: 'rgba(64,196,255,0.2)', fontSize: 10, color: '#40C4FF', fontWeight: 700 }}>{coDriverUser.name?.[0]}</Avatar>
                                                        <Box>
                                                            <Typography sx={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{coDriverUser.name}</Typography>
                                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{coDriverUser.badgeId || ''}</Typography>
                                                        </Box>
                                                    </Box>
                                                ) : <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>Unassigned</Typography>}
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 2 }} sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                                                <Button size="small" variant="outlined" startIcon={<EditIcon sx={{ fontSize: '13px !important' }} />}
                                                    onClick={() => openEdit(selectedVan)}
                                                    sx={{ height: 30, fontSize: 11, fontWeight: 600, borderColor: '#40C4FF44', color: '#40C4FF', '&:hover': { borderColor: '#40C4FF', bgcolor: 'rgba(64,196,255,0.08)' } }}>
                                                    Edit
                                                </Button>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                </motion.div>
                            );
                        })()}
                    </AnimatePresence>
                </Box>
            </motion.div>

            {/* ── Add / Edit Dialog ─────────────────────────────────────────── */}
            <Dialog open={dialogMode !== null} onClose={closeDialog} maxWidth="sm" fullWidth
                PaperProps={{ sx: { background: 'linear-gradient(135deg, rgba(20,27,46,0.98), rgba(14,20,36,0.99))', border: '1px solid rgba(64,196,255,0.2)', borderRadius: '20px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' } }}>
                <DialogTitle sx={{ pb: 1, fontWeight: 800 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(64,196,255,0.12)', border: '1px solid rgba(64,196,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <PcrIcon sx={{ color: '#40C4FF', fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontWeight: 800, lineHeight: 1.1 }}>{dialogMode === 'add' ? 'Add New PCR Van' : 'Edit PCR Van'}</Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>Fill in vehicle details, driver & co-driver</Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent dividers sx={{ pt: 2 }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 7 }}>
                            <TextField label="Vehicle Name *" fullWidth size="small" value={form.vehicleName}
                                onChange={(e) => setForm({ ...form, vehicleName: e.target.value })} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 5 }}>
                            <TextField label="Plate No. *" fullWidth size="small" value={form.plateNo}
                                onChange={(e) => setForm({ ...form, plateNo: e.target.value.toUpperCase() })} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Model" fullWidth size="small" value={form.model}
                                onChange={(e) => setForm({ ...form, model: e.target.value })} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Color" fullWidth size="small" value={form.color}
                                onChange={(e) => setForm({ ...form, color: e.target.value })} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Station" fullWidth size="small" value={form.station}
                                onChange={(e) => setForm({ ...form, station: e.target.value })} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Driver (Assigned Officer)</InputLabel>
                                <Select value={form.driverId} label="Driver (Assigned Officer)"
                                    onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
                                    <MenuItem value=""><em>— Unassigned —</em></MenuItem>
                                    {officers.filter((o) => o._id !== form.coDriverId).map((o) => (
                                        <MenuItem key={o._id} value={o._id}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Avatar sx={{ width: 22, height: 22, bgcolor: 'rgba(124,77,255,0.2)', fontSize: 10, color: '#7C4DFF' }}>{o.name?.[0]}</Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontSize={13}>{o.name}</Typography>
                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{o.badgeId}</Typography>
                                                </Box>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Co-Driver</InputLabel>
                                <Select value={form.coDriverId} label="Co-Driver"
                                    onChange={(e) => setForm({ ...form, coDriverId: e.target.value })}>
                                    <MenuItem value=""><em>— Unassigned —</em></MenuItem>
                                    {officers.filter((o) => o._id !== form.driverId).map((o) => (
                                        <MenuItem key={o._id} value={o._id}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Avatar sx={{ width: 22, height: 22, bgcolor: 'rgba(64,196,255,0.2)', fontSize: 10, color: '#40C4FF' }}>{o.name?.[0]}</Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontSize={13}>{o.name}</Typography>
                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{o.badgeId}</Typography>
                                                </Box>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select value={form.status} label="Status"
                                    onChange={(e) => setForm({ ...form, status: e.target.value as PcrVan['status'] })}>
                                    {(['Available', 'Busy', 'Off-Duty', 'Maintenance'] as const).map((s) => (
                                        <MenuItem key={s} value={s}>{s}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControlLabel
                                control={
                                    <Switch checked={form.isVisible} onChange={(e) => setForm({ ...form, isVisible: e.target.checked })}
                                        sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#40C4FF' }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: '#40C4FF44' } }} />
                                }
                                label={<Typography variant="body2">Show on Live Map</Typography>}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField label="Notes" fullWidth size="small" multiline rows={2} value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: '12px 24px 20px', gap: 1 }}>
                    <Button onClick={closeDialog} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit}
                        disabled={createMut.isPending || updateMut.isPending}
                        sx={{ px: 3, fontWeight: 700, background: 'linear-gradient(135deg,#40C4FF,#7C4DFF)', '&:hover': { background: 'linear-gradient(135deg,#29B6F6,#651FFF)' } }}>
                        {(createMut.isPending || updateMut.isPending)
                            ? <CircularProgress size={18} sx={{ color: '#fff' }} />
                            : dialogMode === 'add' ? 'Create Van' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Delete Confirm Dialog ─────────────────────────────────────── */}
            <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth
                PaperProps={{ sx: { background: 'linear-gradient(135deg, rgba(20,27,46,0.98), rgba(14,20,36,0.99))', border: '1px solid rgba(255,23,68,0.2)', borderRadius: '20px' } }}>
                <DialogTitle sx={{ fontWeight: 700, color: '#FF1744' }}>Delete PCR Van</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete <strong>{deleteTarget?.vehicleName}</strong> ({deleteTarget?.plateNo})?
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: '12px 24px 20px', gap: 1 }}>
                    <Button onClick={() => setDeleteTarget(null)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancel</Button>
                    <Button variant="contained" color="error" disabled={deleteMut.isPending}
                        onClick={() => deleteTarget && deleteMut.mutate(deleteTarget._id)}>
                        {deleteMut.isPending ? <CircularProgress size={18} /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
