// =============================================================================
// pages/sos/SosMonitorPage.tsx - Real-time SOS Alert Monitor (Redesigned)
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Grid, Typography, Chip, Button, Avatar, Divider,
    Skeleton, Dialog, DialogTitle, DialogContent, DialogActions,
    Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import {
    Warning as SosIcon,
    LocationOn as LocationIcon,
    LocalPolice as OfficerIcon,
    CheckCircle as ResolvedIcon,
    RadioButtonChecked as LiveDotIcon,
    Close as CloseIcon,
    Send as DispatchIcon,
    MyLocation as CenterIcon,
    DirectionsCar as PcrVanIcon,
    AccountBalance as StationIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api';
import { sosService, policeService, pcrService } from '../../services/api.service';
import { useSocket } from '../../context/SocketContext';
import { SosLog, User, SosNewEvent, PcrLocationEvent } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.2090 }; // Delhi

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
    ACTIVE:     { label: 'Active',     color: '#FF1744', bg: 'rgba(255,23,68,0.12)',  border: 'rgba(255,23,68,0.3)'  },
    RESPONDED:  { label: 'Responded',  color: '#FFD600', bg: 'rgba(255,214,0,0.12)', border: 'rgba(255,214,0,0.3)'  },
    RESOLVED:   { label: 'Resolved',   color: '#00E676', bg: 'rgba(0,230,118,0.12)', border: 'rgba(0,230,118,0.3)'  },
    FALSE_ALARM:{ label: 'False Alarm',color: '#40C4FF', bg: 'rgba(64,196,255,0.12)',border: 'rgba(64,196,255,0.3)' },
};

const DARK_MAP_STYLE = [
    { elementType: 'geometry',                stylers: [{ color: '#0a0e1a' }] },
    { elementType: 'labels.text.stroke',      stylers: [{ color: '#0a0e1a' }] },
    { elementType: 'labels.text.fill',        stylers: [{ color: '#7a89a8' }] },
    { featureType: 'road',                    elementType: 'geometry',     stylers: [{ color: '#141b2e' }] },
    { featureType: 'road',                    elementType: 'geometry.stroke', stylers: [{ color: '#0d1526' }] },
    { featureType: 'road',                    elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
    { featureType: 'road.highway',            elementType: 'geometry',     stylers: [{ color: '#1e2940' }] },
    { featureType: 'water',                   elementType: 'geometry',     stylers: [{ color: '#06080f' }] },
    { featureType: 'poi',                     stylers: [{ visibility: 'off' }] },
    { featureType: 'transit',                 elementType: 'geometry',     stylers: [{ color: '#0f1621' }] },
    { featureType: 'administrative',          elementType: 'geometry',     stylers: [{ color: '#1a2338' }] },
    { featureType: 'administrative.country',  elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#c4c4c4' }] },
];

// ── Static police station markers ────────────────────────────────────────────
const POLICE_STATIONS = [
    { id: 'ps1', name: 'Connaught Place PS',   lat: 28.6315, lng: 77.2167, address: '2, Sansad Marg, Connaught Place, New Delhi - 110001' },
    { id: 'ps2', name: 'Parliament Street PS', lat: 28.6270, lng: 77.2114, address: 'Parliament Street, New Delhi - 110001' },
    { id: 'ps3', name: 'Chanakyapuri PS',      lat: 28.5997, lng: 77.1854, address: 'Shanti Path, Chanakyapuri, New Delhi - 110021' },
    { id: 'ps4', name: 'Saket PS',             lat: 28.5244, lng: 77.2060, address: 'Press Enclave Road, Saket, New Delhi - 110017' },
    { id: 'ps5', name: 'Rohini PS',            lat: 28.7470, lng: 77.0670, address: 'Sector-9, Rohini, New Delhi - 110085' },
    { id: 'ps6', name: 'Janakpuri PS',         lat: 28.6220, lng: 77.0900, address: 'District Centre, Janakpuri, New Delhi - 110058' },
    { id: 'ps7', name: 'Laxmi Nagar PS',       lat: 28.6286, lng: 77.2775, address: 'Vikas Marg, Laxmi Nagar, New Delhi - 110092' },
    { id: 'ps8', name: 'Dwarka Sector-23 PS',  lat: 28.5829, lng: 77.0512, address: 'Sector 23, Dwarka, New Delhi - 110077' },
];

// ── Live map entry interfaces ─────────────────────────────────────────────────
interface OfficerLocEntry { lat: number; lng: number; name: string; badgeId: string; station: string; rank: string; status: string; }
interface PcrLocEntry    { lat: number; lng: number; name: string; station: string; plateNo: string; status: string; }


// ── Stable map config (outside component, no google.* refs at module level) ──
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const MAP_OPTIONS = {
    styles: DARK_MAP_STYLE,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    scrollwheel: true,
    gestureHandling: 'greedy',
};

// ── Sample SOS alerts (shown when backend is offline / demo mode) ────────
const DEMO_SOS: Array<{ _id: string; lat: number; lng: number; status: string; address: string; name: string }> = [
    { _id: 'demo-sos-1', lat: 28.6280, lng: 77.2350, status: 'ACTIVE',      address: 'India Gate, New Delhi',        name: 'Amit Sharma'    },
    { _id: 'demo-sos-2', lat: 28.6550, lng: 77.2300, status: 'RESPONDED',   address: 'Civil Lines, New Delhi',       name: 'Sunita Verma'   },
    { _id: 'demo-sos-3', lat: 28.5970, lng: 77.2260, status: 'ACTIVE',      address: 'Lodi Road, New Delhi',         name: 'Ravi Patel'     },
    { _id: 'demo-sos-4', lat: 28.5680, lng: 77.2900, status: 'RESOLVED',    address: 'Okhla Phase-2, New Delhi',     name: 'Neha Singh'     },
    { _id: 'demo-sos-5', lat: 28.6830, lng: 77.1500, status: 'FALSE_ALARM', address: 'Punjabi Bagh, New Delhi',      name: 'Deepak Rawat'   },
    { _id: 'demo-sos-6', lat: 28.6090, lng: 77.0730, status: 'RESPONDED',   address: 'Dwarka Sector 10, New Delhi',  name: 'Pooja Mehta'    },
];

// ── Shared glass style ────────────────────────────────────────────────────────
const glass = (border = 'rgba(255,255,255,0.07)') => ({
    borderRadius: '20px',
    background: 'linear-gradient(135deg, rgba(20,27,46,0.95), rgba(14,20,36,0.98))',
    border: `1px solid ${border}`,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
});

// ── Section label ─────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Typography variant="caption" sx={{
        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px',
        color: 'rgba(255,255,255,0.3)', fontSize: 10, display: 'block', mb: 1,
    }}>
        {children}
    </Typography>
);

// ── Mini stat ─────────────────────────────────────────────────────────────────
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

// ── Alert row ─────────────────────────────────────────────────────────────────
interface AlertRowProps { sos: SosLog; selected: boolean; onClick: () => void; onDispatch: () => void; }
const AlertRow: React.FC<AlertRowProps> = ({ sos, selected, onClick, onDispatch }) => {
    const citizen = sos.triggeredBy as User;
    const respondingOfficer = sos.respondingOfficer && typeof sos.respondingOfficer === 'object' ? sos.respondingOfficer as User : null;
    const meta = STATUS_META[sos.status] || STATUS_META.RESOLVED;
    const isActive = sos.status === 'ACTIVE';
    return (
        <motion.div layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Box onClick={onClick} sx={{
                px: 2, py: 1.5, cursor: 'pointer',
                borderLeft: `3px solid ${selected ? meta.color : 'transparent'}`,
                background: selected ? `${meta.color}08` : isActive ? 'rgba(255,23,68,0.04)' : 'transparent',
                transition: 'all 0.2s ease',
                '&:hover': { background: `${meta.color}10`, borderLeftColor: meta.color },
                display: 'flex', alignItems: 'center', gap: 1.5,
            }}>
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar sx={{ width: 38, height: 38, bgcolor: `${meta.color}22`, border: `1.5px solid ${meta.color}40`, fontSize: 14, color: meta.color, fontWeight: 700 }}>
                        {citizen?.name?.[0]?.toUpperCase() || '?'}
                    </Avatar>
                    {isActive && <Box sx={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: '50%', background: '#FF1744', border: '2px solid #0a0e1a', animation: 'sosRing 1.5s ease-out infinite' }} />}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {citizen?.name || 'Unknown'}
                        </Typography>
                        <Chip label={meta.label} size="small" sx={{ height: 17, fontSize: 9, fontWeight: 700, bgcolor: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, px: 0 }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <LocationIcon sx={{ fontSize: 11, flexShrink: 0 }} />
                        {sos.address || `${sos.location?.coordinates[1]?.toFixed(3)}, ${sos.location?.coordinates[0]?.toFixed(3)}`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
                        {formatDistanceToNow(new Date(sos.createdAt), { addSuffix: true })}
                    </Typography>
                    {respondingOfficer && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.4, px: 0.8, py: 0.3, borderRadius: '5px', bgcolor: 'rgba(124,77,255,0.1)', border: '1px solid rgba(124,77,255,0.25)', width: 'fit-content' }}>
                            <OfficerIcon sx={{ fontSize: 9, color: '#7C4DFF' }} />
                            <Typography variant="caption" sx={{ color: '#7C4DFF', fontSize: 9.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                {respondingOfficer.name}{respondingOfficer.badgeId ? ` · ${respondingOfficer.badgeId}` : ''}
                            </Typography>
                        </Box>
                    )}
                </Box>
                {isActive && (
                    <Button size="small" onClick={(e) => { e.stopPropagation(); onDispatch(); }}
                        startIcon={<DispatchIcon sx={{ fontSize: '12px !important' }} />}
                        sx={{ minWidth: 'auto', px: 1.2, py: 0.4, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', background: 'linear-gradient(135deg, #FF1744, #C62828)', color: '#fff', borderRadius: '8px', flexShrink: 0, '&:hover': { background: 'linear-gradient(135deg, #FF4060, #D32F2F)' } }}>
                        Dispatch
                    </Button>
                )}
            </Box>
        </motion.div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const SosMonitorPage: React.FC = () => {
    const { socket } = useSocket();
    const queryClient = useQueryClient();
    const mapRef = useRef<google.maps.Map | null>(null);

    const [selectedSos, setSelectedSos] = useState<SosLog | null>(null);
    const [dispatchOpen, setDispatchOpen] = useState(false);
    const [selectedOfficerId, setSelectedOfficerId] = useState('');
    const [liveAlerts, setLiveAlerts] = useState<SosNewEvent[]>([]);
    const [filter, setFilter] = useState<string>('ALL');
    const [officerLocs, setOfficerLocs] = useState<Map<string, OfficerLocEntry>>(() => new Map());
    const [pcrLocs, setPcrLocs] = useState<Map<string, PcrLocEntry>>(() => new Map());
    const [hoveredMarker, setHoveredMarker] = useState<{ type: string; id: string } | null>(null);

    const { isLoaded } = useJsApiLoader({ googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || '' });

    const { data: sosData, isLoading } = useQuery({
        queryKey: ['sos-logs'],
        queryFn: () => sosService.getAll({ limit: 100 }),
        refetchInterval: 15_000,
    });
    const { data: officersData } = useQuery({
        queryKey: ['officers-available'],
        queryFn: () => policeService.getAll({ isActive: true }),
    });

    // Fetch officer live locations from backend once on mount
    const { data: officerLocData } = useQuery({
        queryKey: ['officers-locations'],
        queryFn: () => policeService.getAll({ isActive: true }),
        staleTime: 30_000,
    });

    // Fetch PCR van locations from backend once on mount
    const { data: pcrLocData } = useQuery({
        queryKey: ['pcr-vans-map'],
        queryFn: () => pcrService.getAll({ isVisible: true }),
        staleTime: 30_000,
    });

    // Populate officerLocs map from backend data
    useEffect(() => {
        const list: any[] = (officerLocData?.data as any)?.officers || [];
        if (!list.length) return;
        setOfficerLocs((prev) => {
            const next = new Map(prev);
            list.forEach((o: any) => {
                if (o.currentLocation?.coordinates?.length === 2) {
                    const [lng, lat] = o.currentLocation.coordinates;
                    next.set(o._id, {
                        lat, lng,
                        name: o.name,
                        badgeId: o.badgeId || '',
                        station: o.station || '',
                        rank: o.rank || '',
                        status: o.isOnDuty ? 'On Duty' : 'Off Duty',
                    });
                }
            });
            return next;
        });
    }, [officerLocData]);

    // Populate pcrLocs map from backend data
    useEffect(() => {
        const list: any[] = (pcrLocData?.data as any)?.vans || [];
        if (!list.length) return;
        setPcrLocs((prev) => {
            const next = new Map(prev);
            list.forEach((v: any) => {
                if (v.location?.coordinates?.length === 2) {
                    const [lng, lat] = v.location.coordinates;
                    next.set(v._id, {
                        lat, lng,
                        name: v.vehicleName,
                        station: v.station || '',
                        plateNo: v.plateNo,
                        status: v.status,
                    });
                }
            });
            return next;
        });
    }, [pcrLocData]);

    const dispatchMutation = useMutation({
        mutationFn: ({ sosId, officerId }: { sosId: string; officerId: string }) =>
            sosService.dispatch(sosId, officerId),
        onSuccess: () => {
            toast.success('Officer dispatched successfully!');
            queryClient.invalidateQueries({ queryKey: ['sos-logs'] });
            setDispatchOpen(false);
            setSelectedOfficerId('');
        },
        onError: () => toast.error('Dispatch failed. Try again.'),
    });

    useEffect(() => {
        if (!socket) return;
        const handle = (event: SosNewEvent) => {
            setLiveAlerts((prev) => [event, ...prev.slice(0, 4)]);
            queryClient.invalidateQueries({ queryKey: ['sos-logs'] });
            toast.error(`🚨 New SOS from ${event.citizen.name}`, { duration: 6000 });
        };
        socket.on('sos_alert', handle);
        return () => { socket.off('sos_alert', handle); };
    }, [socket, queryClient]);

    const sosList: SosLog[] = (sosData?.data as any)?.data || [];
    const officers: User[] = (officersData?.data as any)?.officers || [];

    // Real-time officer & PCR location updates via socket
    useEffect(() => {
        if (!socket) return;
        const handleOfficerLoc = (ev: { officerId: string; latitude: number; longitude: number }) => {
            setOfficerLocs((prev) => {
                const next = new Map(prev);
                const existing = next.get(ev.officerId);
                next.set(ev.officerId, {
                    lat: ev.latitude,
                    lng: ev.longitude,
                    name: existing?.name || 'Officer',
                    badgeId: existing?.badgeId || '',
                    station: existing?.station || '',
                    rank: existing?.rank || '',
                    status: existing?.status || 'On Duty',
                });
                return next;
            });
        };
        const handlePcrLoc = (ev: PcrLocationEvent) => {
            setPcrLocs((prev) => {
                const next = new Map(prev);
                const existing = next.get(ev.officerId);
                next.set(ev.officerId, {
                    lat: ev.latitude,
                    lng: ev.longitude,
                    name: existing?.name || 'PCR Van',
                    station: existing?.station || '',
                    plateNo: existing?.plateNo || '',
                    status: ev.status,
                });
                return next;
            });
        };
        socket.on('officer_location_update', handleOfficerLoc);
        socket.on('pcr_location_update', handlePcrLoc);
        return () => {
            socket.off('officer_location_update', handleOfficerLoc);
            socket.off('pcr_location_update', handlePcrLoc);
        };
    }, [socket]);
    const filtered = filter === 'ALL' ? sosList : sosList.filter((s) => s.status === filter);

    const counts = {
        active:    sosList.filter((s) => s.status === 'ACTIVE').length,
        responded: sosList.filter((s) => s.status === 'RESPONDED').length,
        resolved:  sosList.filter((s) => s.status === 'RESOLVED').length,
        false:     sosList.filter((s) => s.status === 'FALSE_ALARM').length,
    };

    const markers = sosList.filter((s) => s.location?.coordinates).map((s) => ({
        id: s._id, lat: s.location.coordinates[1], lng: s.location.coordinates[0], status: s.status, data: s,
    }));

    // Merge live SOS markers with demo data (demo only shown when no real data exists)
    const sosMarkers = markers.length > 0 ? markers : DEMO_SOS.map((d) => ({
        id: d._id, lat: d.lat, lng: d.lng, status: d.status, data: null as unknown as SosLog,
        demoName: d.name, demoAddress: d.address,
    }));

    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        map.setCenter(DEFAULT_CENTER);
        map.setZoom(11);
    }, []);

    const centerOnActive = () => {
        const active = sosMarkers.find((m) => m.status === 'ACTIVE');
        if (active && mapRef.current) { mapRef.current.panTo({ lat: active.lat, lng: active.lng }); mapRef.current.setZoom(14); }
    };

    const handleSelectSos = (sos: SosLog) => {
        setSelectedSos(sos);
        if (sos.location?.coordinates && mapRef.current) {
            mapRef.current.panTo({ lat: sos.location.coordinates[1], lng: sos.location.coordinates[0] });
            mapRef.current.setZoom(15);
        }
    };

    return (
        <Box sx={{ pb: 4 }}>
            <style>{`
                @keyframes sosRing  { 0%{box-shadow:0 0 0 0 rgba(255,23,68,.7)} 100%{box-shadow:0 0 0 9px rgba(255,23,68,0)} }
                @keyframes sosGlow  { 0%,100%{box-shadow:0 0 8px 2px rgba(255,23,68,.5)} 50%{box-shadow:0 0 18px 5px rgba(255,23,68,.8)} }
                @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:.3} }
            `}</style>

            {/* ── Header ────────────────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#FF1744', animation: 'sosRing 1.5s ease-out infinite', boxShadow: '0 0 8px #FF1744' }} />
                            <Typography variant="caption" sx={{ color: '#FF1744', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', fontSize: 10 }}>
                                Live Monitoring
                            </Typography>
                        </Box>
                        <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1 }}>SOS Monitor</Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>
                            {counts.active > 0 ? `${counts.active} active alert${counts.active > 1 ? 's' : ''} require attention` : 'All clear — no active alerts'} · Auto-refreshes every 15s
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {(['ALL', 'ACTIVE', 'RESPONDED', 'RESOLVED'] as const).map((f) => {
                            const isSel = filter === f;
                            const meta = f !== 'ALL' ? STATUS_META[f] : null;
                            const count = f === 'ALL' ? sosList.length : sosList.filter((s) => s.status === f).length;
                            return (
                                <Chip key={f} label={`${f === 'ALL' ? 'All' : meta?.label ?? f} (${count})`}
                                    onClick={() => setFilter(f)} size="small"
                                    sx={{ height: 28, fontWeight: 700, fontSize: 11, cursor: 'pointer',
                                        bgcolor: isSel ? (meta ? meta.bg : 'rgba(255,255,255,0.12)') : 'rgba(255,255,255,0.04)',
                                        color: isSel ? (meta ? meta.color : '#fff') : 'rgba(255,255,255,0.4)',
                                        border: `1px solid ${isSel ? (meta ? meta.border : 'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.08)'}`,
                                    }} />
                            );
                        })}
                    </Box>
                </Box>
            </motion.div>

            {/* ── Mini Stats ────────────────────────────────────────────────── */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, sm: 3 }}><MiniStat label="Active"     value={counts.active}    color="#FF1744" delay={0}    /></Grid>
                <Grid size={{ xs: 6, sm: 3 }}><MiniStat label="Responded"  value={counts.responded} color="#FFD600" delay={0.06} /></Grid>
                <Grid size={{ xs: 6, sm: 3 }}><MiniStat label="Resolved"   value={counts.resolved}  color="#00E676" delay={0.12} /></Grid>
                <Grid size={{ xs: 6, sm: 3 }}><MiniStat label="False Alarm" value={counts.false}    color="#40C4FF" delay={0.18} /></Grid>
            </Grid>

            {/* ── Live alert ticker ─────────────────────────────────────────── */}
            <AnimatePresence>
                {liveAlerts.map((alert) => (
                    <motion.div key={alert.sosId} initial={{ opacity: 0, y: -14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.3 }}>
                        <Box sx={{ mb: 1.5, px: 2.5, py: 1.5, borderRadius: '14px', background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.3)', display: 'flex', alignItems: 'center', gap: 2, animation: 'sosGlow 1.5s ease-in-out 3' }}>
                            <SosIcon sx={{ color: '#FF1744', fontSize: 20, flexShrink: 0, animation: 'blink 0.8s ease-in-out infinite' }} />
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={{ fontWeight: 700, color: '#FF1744', fontSize: 13 }}>NEW SOS ALERT</Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                    {alert.citizen.name} · {alert.address || 'Location unknown'}
                                </Typography>
                            </Box>
                            <Button size="small" variant="outlined"
                                sx={{ borderColor: '#FF1744', color: '#FF1744', fontSize: 11, height: 26, '&:hover': { bgcolor: 'rgba(255,23,68,0.1)' } }}
                                onClick={() => { const f = sosList.find((s) => s._id === alert.sosId); if (f) handleSelectSos(f); }}>
                                View
                            </Button>
                            <CloseIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', '&:hover': { color: '#fff' } }}
                                onClick={() => setLiveAlerts((p) => p.filter((a) => a.sosId !== alert.sosId))} />
                        </Box>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* ── Map + Queue ────────────────────────────────────────────────── */}
            <Grid container spacing={2.5} sx={{ alignItems: 'stretch' }}>

                {/* Map */}
                <Grid size={{ xs: 12, lg: 8 }}>
                    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} style={{ height: '100%' }}>
                        <Box sx={{ ...glass('rgba(255,23,68,0.15)'), height: '100%', minHeight: 620, display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #FF1744, transparent)' }} />

                            {/* Map header */}
                            <Box sx={{ px: 3, pt: 2.5, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                <Box>
                                    <SectionLabel>Geospatial Intelligence</SectionLabel>
                                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1, color: '#fff' }}>Live Location Map</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 1.5, py: 0.6, borderRadius: '8px', bgcolor: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)' }}>
                                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#00E676', animation: 'blink 2s ease-in-out infinite' }} />
                                        <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 700, fontSize: 10 }}>GPS Active</Typography>
                                    </Box>
                                    <Button size="small" onClick={centerOnActive}
                                        startIcon={<CenterIcon sx={{ fontSize: '14px !important' }} />}
                                        sx={{ height: 30, fontSize: 11, fontWeight: 600, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                                        Focus Active
                                    </Button>
                                </Box>
                            </Box>

                            {/* Map */}
                            <Box sx={{ flex: 1, px: 2.5, pb: 0, minHeight: 0 }}>
                                {isLoaded ? (
                                    <Box sx={{ height: '100%', minHeight: 480, borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <GoogleMap
                                            mapContainerStyle={MAP_CONTAINER_STYLE}
                                            onLoad={onMapLoad}
                                            options={MAP_OPTIONS}
                                        >
                                            {sosMarkers.map((m) => {
                                                const meta = STATUS_META[m.status] || STATUS_META.RESOLVED;
                                                const isActive = m.status === 'ACTIVE';
                                                const isSel = m.data && selectedSos?._id === m.id;
                                                return (
                                                    <OverlayView key={m.id} position={{ lat: m.lat, lng: m.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                                                        getPixelPositionOffset={(w) => ({ x: -(w / 2), y: -(isSel ? 36 : 28) - 6 })}>
                                                        <Box onClick={() => m.data && handleSelectSos(m.data)} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                                                            {isActive && (
                                                                <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 42, height: 42, borderRadius: '50%', border: `2px solid ${meta.color}`, animation: 'sosRing 1.5s ease-out infinite', pointerEvents: 'none' }} />
                                                            )}
                                                            <Box sx={{ width: isSel ? 36 : 28, height: isSel ? 36 : 28, borderRadius: '50% 50% 50% 0', background: `linear-gradient(135deg, ${meta.color}, ${meta.color}aa)`, border: `2.5px solid ${isSel ? '#fff' : meta.color}`, boxShadow: `0 0 ${isActive ? '16px 4px' : '8px 2px'} ${meta.color}80`, transform: 'rotate(-45deg)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <SosIcon sx={{ fontSize: isSel ? 16 : 12, color: '#fff', transform: 'rotate(45deg)' }} />
                                                            </Box>
                                                        </Box>
                                                    </OverlayView>
                                                );
                                            })}
                                            {/* ── Officer live-location pins ── */}
                                            {Array.from(officerLocs.entries()).map(([oid, loc]) => {
                                                const isHov = hoveredMarker?.type === 'officer' && hoveredMarker.id === oid;
                                                const statusColor = loc.status === 'Responding' ? '#FF1744' : loc.status === 'On Patrol' ? '#00E676' : '#FFD600';
                                                return (
                                                    <OverlayView key={`off-${oid}`} position={{ lat: loc.lat, lng: loc.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                                                        getPixelPositionOffset={() => ({ x: -13, y: -32 })}>
                                                        <Box
                                                            onMouseEnter={() => setHoveredMarker({ type: 'officer', id: oid })}
                                                            onMouseLeave={() => setHoveredMarker(null)}
                                                            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', position: 'relative' }}
                                                        >
                                                            {isHov && (
                                                                <Box sx={{ position: 'absolute', bottom: '110%', width: 175, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(14,20,36,0.96)', border: '1px solid rgba(124,77,255,0.45)', boxShadow: '0 4px 20px rgba(0,0,0,0.6)', zIndex: 1000, pointerEvents: 'none' }}>
                                                                    <Typography sx={{ color: '#7C4DFF', fontWeight: 700, fontSize: 12, mb: 0.3, whiteSpace: 'nowrap' }}>{loc.name}</Typography>
                                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', display: 'block', fontSize: 10 }}>{loc.rank}</Typography>
                                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontSize: 10 }}>Badge: {loc.badgeId || 'N/A'}</Typography>
                                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Station: {loc.station || 'N/A'}</Typography>
                                                                    <Typography variant="caption" sx={{ color: statusColor, display: 'block', fontSize: 10, mt: 0.4, fontWeight: 600 }}>● {loc.status}</Typography>
                                                                </Box>
                                                            )}
                                                            <Box sx={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#7C4DFF,#5E35B1)', border: '2.5px solid rgba(124,77,255,0.7)', boxShadow: '0 0 10px rgba(124,77,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <OfficerIcon sx={{ fontSize: 13, color: '#fff' }} />
                                                            </Box>
                                                            <Box sx={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid #7C4DFF' }} />
                                                        </Box>
                                                    </OverlayView>
                                                );
                                            })}

                                            {/* ── PCR van pins ── */}
                                            {Array.from(pcrLocs.entries()).map(([vid, v]) => {
                                                const isHov = hoveredMarker?.type === 'pcr' && hoveredMarker.id === vid;
                                                const sc = v.status === 'Available' ? '#00E676' : v.status === 'Busy' ? '#FFD600' : '#40C4FF';
                                                return (
                                                    <OverlayView key={`pcr-${vid}`} position={{ lat: v.lat, lng: v.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                                                        getPixelPositionOffset={() => ({ x: -14, y: -26 })}>
                                                        <Box
                                                            onMouseEnter={() => setHoveredMarker({ type: 'pcr', id: vid })}
                                                            onMouseLeave={() => setHoveredMarker(null)}
                                                            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', position: 'relative' }}
                                                        >
                                                            {isHov && (
                                                                <Box sx={{ position: 'absolute', bottom: '110%', width: 175, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(14,20,36,0.96)', border: '1px solid rgba(64,196,255,0.45)', boxShadow: '0 4px 20px rgba(0,0,0,0.6)', zIndex: 1000, pointerEvents: 'none' }}>
                                                                    <Typography sx={{ color: '#40C4FF', fontWeight: 700, fontSize: 12, mb: 0.3, whiteSpace: 'nowrap' }}>{v.name}</Typography>
                                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Station: {v.station || 'N/A'}</Typography>
                                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: 10 }}>Plate: {v.plateNo || 'N/A'}</Typography>
                                                                    <Typography variant="caption" sx={{ color: sc, display: 'block', fontSize: 10, mt: 0.4, fontWeight: 600 }}>● {v.status}</Typography>
                                                                </Box>
                                                            )}
                                                            <Box sx={{ width: 28, height: 20, borderRadius: '5px', background: 'linear-gradient(135deg,#40C4FF,#0097A7)', border: '2px solid rgba(64,196,255,0.55)', boxShadow: '0 0 10px rgba(64,196,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <PcrVanIcon sx={{ fontSize: 12, color: '#fff' }} />
                                                            </Box>
                                                            <Box sx={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #40C4FF' }} />
                                                        </Box>
                                                    </OverlayView>
                                                );
                                            })}

                                            {/* ── Police station pins ── */}
                                            {POLICE_STATIONS.map((ps) => {
                                                const isHov = hoveredMarker?.type === 'station' && hoveredMarker.id === ps.id;
                                                return (
                                                    <OverlayView key={`ps-${ps.id}`} position={{ lat: ps.lat, lng: ps.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                                                        getPixelPositionOffset={() => ({ x: -12, y: -30 })}>
                                                        <Box
                                                            onMouseEnter={() => setHoveredMarker({ type: 'station', id: ps.id })}
                                                            onMouseLeave={() => setHoveredMarker(null)}
                                                            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', position: 'relative' }}
                                                        >
                                                            {isHov && (
                                                                <Box sx={{ position: 'absolute', bottom: '110%', width: 170, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(14,20,36,0.96)', border: '1px solid rgba(255,214,0,0.45)', boxShadow: '0 4px 20px rgba(0,0,0,0.6)', zIndex: 1000, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                                                                    <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 12, mb: 0.3 }}>{ps.name}</Typography>
                                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontSize: 10 }}>{ps.address}</Typography>
                                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', display: 'block', fontSize: 10, mt: 0.3 }}>Police Station</Typography>
                                                                </Box>
                                                            )}
                                                            <Box sx={{ width: 24, height: 24, borderRadius: '5px 5px 0 0', background: 'linear-gradient(135deg,#FFD600,#F9A825)', border: '2px solid rgba(255,214,0,0.55)', boxShadow: '0 0 10px rgba(255,214,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <StationIcon sx={{ fontSize: 12, color: '#333' }} />
                                                            </Box>
                                                            <Box sx={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #FFD600' }} />
                                                        </Box>
                                                    </OverlayView>
                                                );
                                            })}                                        </GoogleMap>
                                    </Box>
                                ) : (
                                    <Skeleton variant="rectangular" sx={{ height: 480, borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.04)' }} />
                                )}
                            </Box>

                            {/* Legend */}
                            <Box sx={{ px: 3, py: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
                                {Object.values(STATUS_META).map((v) => (
                                    <Box key={v.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: v.color, boxShadow: `0 0 5px ${v.color}` }} />
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{v.label}</Typography>
                                    </Box>
                                ))}
                                <Box sx={{ width: '1px', height: 16, bgcolor: 'rgba(255,255,255,0.1)' }} />
                                {[
                                    { color: '#7C4DFF', label: 'Officer',        shape: '50%' },
                                    { color: '#40C4FF', label: 'PCR Van',         shape: '4px' },
                                    { color: '#FFD600', label: 'Police Station',  shape: '4px 4px 0 0' },
                                ].map((item) => (
                                    <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                        <Box sx={{ width: 8, height: 8, borderRadius: item.shape, bgcolor: item.color, boxShadow: `0 0 5px ${item.color}` }} />
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{item.label}</Typography>
                                    </Box>
                                ))}
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, ml: 'auto' }}>
                                    Scroll to zoom · Hover pins for details · Drag to pan
                                </Typography>
                            </Box>
                        </Box>
                    </motion.div>
                </Grid>

                {/* Alert Queue */}
                <Grid size={{ xs: 12, lg: 4 }}>
                    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.28 }} style={{ height: '100%' }}>
                        <Box sx={{ ...glass('rgba(255,255,255,0.07)'), height: '100%', minHeight: 620, display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />

                            <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                                <SectionLabel>Emergency Queue</SectionLabel>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', lineHeight: 1 }}>Alert Queue</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                        <LiveDotIcon sx={{ fontSize: 10, color: '#FF1744', animation: 'blink 1.2s ease-in-out infinite' }} />
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                                            {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>

                            <Box sx={{ flex: 1, overflow: 'auto', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 4 } }}>
                                {isLoading
                                    ? [...Array(6)].map((_, i) => (
                                        <Box key={i} sx={{ px: 2, py: 1.5, display: 'flex', gap: 1.5 }}>
                                            <Skeleton variant="circular" width={38} height={38} sx={{ bgcolor: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                                            <Box sx={{ flex: 1 }}>
                                                <Skeleton width="55%" height={14} sx={{ bgcolor: 'rgba(255,255,255,0.05)', mb: 0.5 }} />
                                                <Skeleton width="85%" height={11} sx={{ bgcolor: 'rgba(255,255,255,0.04)' }} />
                                            </Box>
                                        </Box>
                                    ))
                                    : filtered.length === 0
                                        ? (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 2, opacity: 0.5 }}>
                                                <ResolvedIcon sx={{ fontSize: 48, color: '#00E676' }} />
                                                <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>No alerts in this category</Typography>
                                            </Box>
                                        )
                                        : (
                                            <AnimatePresence>
                                                {filtered.map((sos, i) => (
                                                    <React.Fragment key={sos._id}>
                                                        <AlertRow sos={sos} selected={selectedSos?._id === sos._id} onClick={() => handleSelectSos(sos)} onDispatch={() => { setSelectedSos(sos); setDispatchOpen(true); }} />
                                                        {i < filtered.length - 1 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)' }} />}
                                                    </React.Fragment>
                                                ))}
                                            </AnimatePresence>
                                        )
                                }
                            </Box>

                            {/* Selected footer */}
                            <AnimatePresence>
                                {selectedSos && (
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.3 }}>
                                        <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', p: 2, flexShrink: 0 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: 10 }}>Selected Alert</Typography>
                                                <CloseIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', '&:hover': { color: '#fff' } }} onClick={() => setSelectedSos(null)} />
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                                <Avatar sx={{ width: 36, height: 36, bgcolor: `${STATUS_META[selectedSos.status]?.color || '#FF1744'}22`, border: `1.5px solid ${STATUS_META[selectedSos.status]?.color || '#FF1744'}40`, fontSize: 13, color: STATUS_META[selectedSos.status]?.color || '#FF1744', fontWeight: 700, flexShrink: 0 }}>
                                                    {(selectedSos.triggeredBy as User)?.name?.[0]?.toUpperCase() || '?'}
                                                </Avatar>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>{(selectedSos.triggeredBy as User)?.name || 'Unknown'}</Typography>
                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {selectedSos.address || `${selectedSos.location?.coordinates[1]?.toFixed(5)}, ${selectedSos.location?.coordinates[0]?.toFixed(5)}`}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
                                                        {formatDistanceToNow(new Date(selectedSos.createdAt), { addSuffix: true })}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            {selectedSos.status === 'ACTIVE' && (
                                                <Button fullWidth variant="contained" size="small" startIcon={<DispatchIcon />}
                                                    onClick={() => setDispatchOpen(true)}
                                                    sx={{ mt: 1.5, fontWeight: 700, background: 'linear-gradient(135deg, #FF1744, #C62828)', '&:hover': { background: 'linear-gradient(135deg, #FF4060, #D32F2F)' } }}>
                                                    Dispatch Officer
                                                </Button>
                                            )}
                                        </Box>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Box>
                    </motion.div>
                </Grid>
            </Grid>

            {/* ── Dispatch Dialog ────────────────────────────────────────────── */}
            <Dialog open={dispatchOpen} onClose={() => { setDispatchOpen(false); setSelectedOfficerId(''); }} maxWidth="sm" fullWidth
                PaperProps={{ sx: { background: 'linear-gradient(135deg, rgba(20,27,46,0.98), rgba(14,20,36,0.99))', border: '1px solid rgba(255,23,68,0.2)', borderRadius: '20px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(255,23,68,0.12)', border: '1px solid rgba(255,23,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <OfficerIcon sx={{ color: '#FF1744', fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontWeight: 800, lineHeight: 1.1 }}>Dispatch Officer</Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>Assign nearest available officer</Typography>
                        </Box>
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ pt: 2 }}>
                    {selectedSos && (
                        <Box sx={{ mb: 2.5, p: 2, borderRadius: '12px', bgcolor: 'rgba(255,23,68,0.06)', border: '1px solid rgba(255,23,68,0.15)' }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: 10 }}>Alert Details</Typography>
                            <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{(selectedSos.triggeredBy as User)?.name || 'Unknown'}</Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <LocationIcon sx={{ fontSize: 12 }} />
                                {selectedSos.address || `${selectedSos.location?.coordinates[1]?.toFixed(4)}, ${selectedSos.location?.coordinates[0]?.toFixed(4)}`}
                            </Typography>
                        </Box>
                    )}
                    <FormControl fullWidth>
                        <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Select Officer</InputLabel>
                        <Select value={selectedOfficerId} label="Select Officer" onChange={(e) => setSelectedOfficerId(e.target.value)}
                            sx={{ borderRadius: '12px', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.12)' } }}>
                            {officers.length === 0
                                ? <MenuItem disabled><Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>No officers available</Typography></MenuItem>
                                : officers.map((o) => (
                                    <MenuItem key={o._id} value={o._id}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ width: 30, height: 30, bgcolor: 'rgba(124,77,255,0.2)', fontSize: 12, color: '#7C4DFF', fontWeight: 700 }}>{o.name?.[0]}</Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>{o.name}</Typography>
                                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>{o.badgeId} · {o.station}</Typography>
                                            </Box>
                                        </Box>
                                    </MenuItem>
                                ))
                            }
                        </Select>
                    </FormControl>
                </DialogContent>

                <DialogActions sx={{ p: '12px 24px 20px', gap: 1 }}>
                    <Button onClick={() => { setDispatchOpen(false); setSelectedOfficerId(''); }} sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff' } }}>Cancel</Button>
                    <Button variant="contained" startIcon={<DispatchIcon />}
                        disabled={!selectedOfficerId || dispatchMutation.isPending}
                        onClick={() => { if (selectedSos && selectedOfficerId) dispatchMutation.mutate({ sosId: selectedSos._id, officerId: selectedOfficerId }); }}
                        sx={{ px: 3, fontWeight: 700, background: 'linear-gradient(135deg, #FF1744, #C62828)', '&:hover': { background: 'linear-gradient(135deg, #FF4060, #D32F2F)' } }}>
                        {dispatchMutation.isPending ? 'Dispatching…' : 'Dispatch Officer'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
