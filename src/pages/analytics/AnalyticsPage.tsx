// =============================================================================
// pages/analytics/AnalyticsPage.tsx  –  Crime Analytics Dashboard
// Dark glassmorphism · AI-powered insights · Range-aware charts
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Grid, Typography, Chip, Skeleton, Divider,
} from '@mui/material';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { GoogleMap, HeatmapLayer, useJsApiLoader } from '@react-google-maps/api';
import {
    Folder as CasesIcon,
    Warning as WarningIcon,
    CheckCircle as ResolvedIcon,
    Badge as OfficerIcon,
    PersonSearch as CriminalIcon,
    NotificationImportant as SosIcon,
    FiberManualRecord as DotIcon,
    Public as MapIcon,
    Timeline as TimelineIcon,
    DonutLarge as DonutIcon,
    BarChart as BarChartIcon,
    Radar as RadarIcon,
} from '@mui/icons-material';
import { motion, animate } from 'framer-motion';
import { dashboardService, aiService } from '../../services/api.service';
import { DashboardStats, Hotspot } from '../../types';

const HEATMAP_LIBS: ['visualization'] = ['visualization'];

// ── Design tokens matching Dashboard & Criminals ──────────────────────────────
const DARK_BG  = 'rgba(20,27,46,0.95)';
const DARK_BG2 = 'rgba(14,20,36,0.98)';
const BORDER   = 'rgba(255,255,255,0.08)';
const G        = 'rgba(255,255,255,0.04)';

const glass = {
    background: `linear-gradient(135deg, ${DARK_BG} 0%, ${DARK_BG2} 100%)`,
    backdropFilter: 'blur(20px)',
    border: `1px solid ${BORDER}`,
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
};

// Unified Palette
const COLORS = {
    ACCENT:  '#00B0FF', // Blue
    DANGER:  '#FF1744', // Red
    WARN:    '#FF9800', // Orange
    SUCCESS: '#00E676', // Green
    PURPLE:  '#AA00FF', // Purple
    PINK:    '#F50057', // Pink
};

// Recharts tooltip base style
const TT_STYLE = {
    background: DARK_BG2,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    color: 'white',
    fontSize: 12,
};

// ── Range options ─────────────────────────────────────────────────────────────
type Range = 'weeks' | 'months' | 'years' | 'lifetime';
const RANGE_OPTS: { label: string; value: Range }[] = [
    { label: 'Weeks',    value: 'weeks'    },
    { label: 'Months',   value: 'months'   },
    { label: 'Years',    value: 'years'    },
    { label: 'Lifetime', value: 'lifetime' },
];

// ── Animated counter ─────────────────────────────────────────────────────────
const AnimNum: React.FC<{ value: number; duration?: number; suffix?: string }> = ({ value, duration = 1, suffix = '' }) => {
    const [n, setN] = useState(0);
    useEffect(() => {
        const ctrl = animate(0, value, { duration, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) });
        return ctrl.stop;
    }, [value, duration]);
    return <>{n.toLocaleString()}{suffix}</>;
};

// ── Glassmorphism Stat Card ──────────────────────────────────────────────────
interface StatCardProps { label: string; value: number | string; icon: React.ReactNode; color: string; sub?: string; delay?: number }
const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, sub, delay = 0 }) => {
    const isNum = typeof value === 'number';
    const numVal = isNum ? value : parseInt((value as string).replace(/[^0-9]/g, ''), 10);
    const suffix = isNum ? '' : (value as string).replace(/[0-9]/g, '');

    return (
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
                        {isNaN(numVal) ? value : <AnimNum value={numVal} suffix={suffix} />}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', fontSize: 10, display: 'block', mt: 0.5 }}>
                        {label}
                    </Typography>
                    {sub && <Typography variant="caption" sx={{ color: color, fontWeight: 700, fontSize: 10 }}>{sub}</Typography>}
                </Box>
            </Box>
        </motion.div>
    );
};

// ── Glassmorphism Chart Panel ────────────────────────────────────────────────
interface ChartPanelProps { title: string; subtitle?: string; children: React.ReactNode; badge?: React.ReactNode; loading?: boolean; color: string; icon: React.ReactNode; delay?: number }
const ChartPanel: React.FC<ChartPanelProps> = ({ title, subtitle, children, badge, loading, color, icon, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
        style={{ height: '100%' }}
    >
        <Box sx={{
            ...glass, height: '100%', p: 3, position: 'relative', overflow: 'hidden',
            boxShadow: `0 0 0 1px ${color}10, 0 8px 32px rgba(0,0,0,0.4)`,
        }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
            <Box sx={{ position: 'absolute', top: -60, right: -60, width: 160, height: 160, borderRadius: '50%', background: `${color}08`, filter: 'blur(40px)', pointerEvents: 'none' }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, position: 'relative', zIndex: 1 }}>
                <Box display="flex" gap={1.5} alignItems="center">
                    <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: `linear-gradient(135deg, ${color}22, ${color}0A)`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {icon}
                    </Box>
                    <Box>
                        <Typography fontWeight={800} color="white" fontSize={15}>{title}</Typography>
                        {subtitle && <Typography variant="caption" color="rgba(255,255,255,0.4)" letterSpacing={0.3}>{subtitle}</Typography>}
                    </Box>
                </Box>
                {badge}
            </Box>
            
            {loading ? (
                <Skeleton variant="rectangular" height={240} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 3 }} />
            ) : (
                <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>
            )}
        </Box>
    </motion.div>
);

// ── Pill Button ───────────────────────────────────────────────────────────────
const PillBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; color?: string }> = ({ active, onClick, children, color = COLORS.ACCENT }) => (
    <Box component="button" onClick={onClick} sx={{
        px: 2.5, py: 0.8, borderRadius: 20, fontSize: 12, fontWeight: active ? 800 : 600,
        border: `1px solid ${active ? color : BORDER}`,
        bgcolor: active ? `${color}1A` : 'transparent', color: active ? color : 'rgba(255,255,255,0.5)',
        cursor: 'pointer', transition: 'all 0.2s',
        boxShadow: active ? `0 0 12px ${color}30` : 'none',
        '&:hover': { borderColor: color, color: color, bgcolor: `${color}0D` },
    }}>
        {children}
    </Box>
);

// Donut legend row
const DonutLegendRow: React.FC<{ color: string; label: string; count: number; total: number }> = ({ color, label, count, total }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, p: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}` }}>
        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color, flexShrink: 0, boxShadow: `0 0 8px ${color}66` }} />
        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', flex: 1, fontWeight: 600 }}>{label}</Typography>
        <Typography sx={{ fontSize: 13, color: 'white', fontWeight: 800 }}>{count}</Typography>
        <Typography sx={{ fontSize: 11, color: color, fontWeight: 700, width: 36, textAlign: 'right' }}>
            {total ? `${((count / total) * 100).toFixed(0)}%` : '—'}
        </Typography>
    </Box>
);

// =============================================================================
// Main AnalyticsPage
// =============================================================================
export const AnalyticsPage: React.FC = () => {
    const [range, setRange] = useState<Range>('months');

    // ── Queries ─────────────────────────────────────────────────────────────────
    const { data: statsResp } = useQuery({ queryKey: ['dashboard-stats'], queryFn: () => dashboardService.getStats(), staleTime: 60_000 });
    const { data: trendsResp, isLoading: trendsLoading } = useQuery({ queryKey: ['trends', range], queryFn: () => dashboardService.getMonthlyTrends(range) });
    const { data: distResp, isLoading: distLoading } = useQuery({ queryKey: ['crime-distribution', range], queryFn: () => dashboardService.getCrimeDistribution(range) });
    const { data: statusResp, isLoading: statusLoading } = useQuery({ queryKey: ['status-breakdown', range], queryFn: () => dashboardService.getStatusBreakdown(range) });
    const { data: dayResp, isLoading: dayLoading } = useQuery({ queryKey: ['day-breakdown', range], queryFn: () => dashboardService.getDayBreakdown(range) });
    const { data: hotspotsResp } = useQuery({ queryKey: ['ai-hotspots'], queryFn: () => aiService.getHotspots(), refetchInterval: 120_000 });

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || '',
        libraries: HEATMAP_LIBS,
    });

    // ── Data extraction ──────────────────────────────────────────────────────────
    const stats: DashboardStats | null = (statsResp?.data as any)?.data ?? null;
    const trends  = (trendsResp?.data as any)?.data  ?? [];
    const dist    = (distResp?.data as any)?.data    ?? [];
    const statusData: { status: string; count: number }[] = (statusResp?.data as any)?.data ?? [];
    const dayData: { day: string; incidents: number }[]    = (dayResp?.data as any)?.data    ?? [];
    const hotspots: Hotspot[] = (hotspotsResp?.data as any)?.hotspots ?? [];

    const statusTotal = statusData.reduce((s, x) => s + x.count, 0);
    const resolutionRate = stats ? Math.round((stats.resolvedThisMonth / Math.max(stats.casesThisMonth, 1)) * 100) : 0;

    const STATUS_COLORS: Record<string, string> = {
        PENDING:       COLORS.WARN,
        INVESTIGATING: COLORS.ACCENT,
        RESOLVED:      COLORS.SUCCESS,
        CLOSED:        'rgba(255,255,255,0.3)',
    };

    const DIST_COLORS = [COLORS.ACCENT, COLORS.DANGER, COLORS.WARN, COLORS.SUCCESS, COLORS.PURPLE, COLORS.PINK];

    // Heatmap points
    const heatmapPoints = isLoaded && hotspots.length > 0
        ? hotspots.map((h) => ({
            location: new window.google.maps.LatLng(h.latitude, h.longitude),
            weight: h.riskScore * 10,
        }))
        : [];

    return (
        <Box sx={{ minHeight: '100vh', pb: 6 }}>
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                        <Typography sx={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, color: '#fff' }}>Crime Analytics</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                            <DotIcon sx={{ fontSize: 10, color: COLORS.SUCCESS, animation: 'pulse 2s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />
                            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                                AI-powered insights · Data updated every 2 minutes
                            </Typography>
                        </Box>
                    </Box>

                    {/* Range Selector */}
                    <Box sx={{ ...glass, p: 0.8, display: 'flex', gap: 0.8, borderRadius: 20 }}>
                        {RANGE_OPTS.map(({ label, value }) => (
                            <PillBtn key={value} active={range === value} onClick={() => setRange(value)} color={COLORS.ACCENT}>
                                {label}
                            </PillBtn>
                        ))}
                    </Box>
                </Box>
            </motion.div>

            {/* ── KPI Cards ──────────────────────────────────────────────────── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(6,1fr)' }, gap: 2, mb: 3 }}>
                <StatCard label="Total Cases"       value={stats?.totalCases ?? 0}      icon={<CasesIcon />}    color={COLORS.ACCENT}  delay={0} />
                <StatCard label="Active Cases"      value={stats?.activeCases ?? 0}     icon={<WarningIcon />}  color={COLORS.DANGER}  delay={0.05} />
                <StatCard label="Resolution Rate"   value={`${resolutionRate}%`}        icon={<ResolvedIcon />} color={COLORS.SUCCESS} delay={0.1} sub="this month" />
                <StatCard label="SOS Today"         value={stats?.sosToday ?? 0}        icon={<SosIcon />}      color={COLORS.WARN}    delay={0.15} />
                <StatCard label="Officers on Duty"  value={stats?.policeOnDuty ?? 0}    icon={<OfficerIcon />}  color={COLORS.ACCENT}  delay={0.2} />
                <StatCard label="Criminals Tracked" value={stats?.totalCriminals ?? 0}  icon={<CriminalIcon />} color={COLORS.PURPLE}  delay={0.25} />
            </Box>

            {/* ── Row 1: Trends + Status Donut ───────────────────────────────── */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={8}>
                    <ChartPanel
                        title="Case Trends"
                        subtitle={`Filed vs. resolved — ${range} view`}
                        loading={trendsLoading}
                        color={COLORS.ACCENT}
                        icon={<TimelineIcon sx={{ color: COLORS.ACCENT, fontSize: 18 }} />}
                        delay={0.3}
                        badge={<Chip label="Live Data" size="small" sx={{ bgcolor: `${COLORS.SUCCESS}1A`, color: COLORS.SUCCESS, border: `1px solid ${COLORS.SUCCESS}44`, fontWeight: 800, fontSize: 10, height: 22 }} />}
                    >
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gFiled" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor={COLORS.ACCENT}  stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={COLORS.ACCENT}  stopOpacity={0}    />
                                    </linearGradient>
                                    <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor={COLORS.SUCCESS} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={COLORS.SUCCESS} stopOpacity={0}    />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                                <Tooltip contentStyle={TT_STYLE} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />
                                <Legend wrapperStyle={{ paddingTop: 20 }} formatter={(val) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600 }}>{val}</span>} />
                                <Area type="monotone" dataKey="cases"    fill="url(#gFiled)"    stroke={COLORS.ACCENT}  strokeWidth={3} name="Filed"    dot={{ r: 4, fill: DARK_BG2, stroke: COLORS.ACCENT, strokeWidth: 2 }} activeDot={{ r: 6, fill: COLORS.ACCENT, stroke: '#fff' }} />
                                <Area type="monotone" dataKey="resolved" fill="url(#gResolved)" stroke={COLORS.SUCCESS} strokeWidth={3} name="Resolved" dot={{ r: 4, fill: DARK_BG2, stroke: COLORS.SUCCESS, strokeWidth: 2 }} activeDot={{ r: 6, fill: COLORS.SUCCESS, stroke: '#fff' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartPanel>
                </Grid>

                <Grid item xs={12} md={4}>
                    <ChartPanel
                        title="Case Status"
                        subtitle={`Distribution — ${range} view`}
                        loading={statusLoading}
                        color={COLORS.WARN}
                        icon={<DonutIcon sx={{ color: COLORS.WARN, fontSize: 18 }} />}
                        delay={0.35}
                    >
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <ResponsiveContainer width="100%" height={170}>
                                <PieChart>
                                    <Pie
                                        data={statusData.length ? statusData : [{ status: 'No Data', count: 1 }]}
                                        dataKey="count" nameKey="status"
                                        cx="50%" cy="50%" innerRadius={55} outerRadius={75}
                                        paddingAngle={4} stroke="none"
                                    >
                                        {statusData.map((entry, i) => (
                                            <Cell key={i} fill={STATUS_COLORS[entry.status] ?? COLORS.ACCENT} style={{ filter: `drop-shadow(0px 0px 6px ${STATUS_COLORS[entry.status]}66)` }} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={TT_STYLE} itemStyle={{ fontWeight: 800 }} formatter={(val: number) => [val, 'Cases']} />
                                </PieChart>
                            </ResponsiveContainer>

                            <Box sx={{ width: '100%', mt: 2 }}>
                                {statusData.map((entry) => (
                                    <DonutLegendRow key={entry.status} color={STATUS_COLORS[entry.status] ?? COLORS.ACCENT} label={entry.status} count={entry.count} total={statusTotal} />
                                ))}
                                {statusData.length === 0 && <Typography variant="caption" color="rgba(255,255,255,0.3)" display="block" textAlign="center">No data for this range</Typography>}
                            </Box>
                        </Box>
                    </ChartPanel>
                </Grid>
            </Grid>

            {/* ── Row 2: Category Bar + Day-of-Week Radar ──────────────────── */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={7}>
                    <ChartPanel
                        title="Crime Category Distribution"
                        subtitle={`Incidents by category — ${range} view`}
                        loading={distLoading}
                        color={COLORS.PINK}
                        icon={<BarChartIcon sx={{ color: COLORS.PINK, fontSize: 18 }} />}
                        delay={0.4}
                    >
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={dist} margin={{ top: 10, right: 10, left: -20, bottom: 36 }}>
                                <defs>
                                    {dist.map((_: unknown, i: number) => (
                                        <linearGradient key={i} id={`bGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%"   stopColor={DIST_COLORS[i % DIST_COLORS.length]} stopOpacity={1}   />
                                            <stop offset="100%" stopColor={DIST_COLORS[i % DIST_COLORS.length]} stopOpacity={0.2} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                                <XAxis dataKey="type" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600 }} angle={-25} textAnchor="end" interval={0} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                                <Tooltip contentStyle={TT_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} itemStyle={{ fontWeight: 800 }} />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Incidents" barSize={32}>
                                    {dist.map((_: unknown, i: number) => <Cell key={i} fill={`url(#bGrad${i})`} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartPanel>
                </Grid>

                <Grid item xs={12} md={5}>
                    <ChartPanel
                        title="Day-of-Week Pattern"
                        subtitle="Incidents by day — identifies peak crime days"
                        loading={dayLoading}
                        color={COLORS.PURPLE}
                        icon={<RadarIcon sx={{ color: COLORS.PURPLE, fontSize: 18 }} />}
                        delay={0.45}
                        badge={<Chip label="Pattern" size="small" sx={{ bgcolor: `${COLORS.PURPLE}1A`, color: COLORS.PURPLE, border: `1px solid ${COLORS.PURPLE}44`, fontWeight: 800, fontSize: 10, height: 22 }} />}
                    >
                        <ResponsiveContainer width="100%" height={260}>
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={dayData}>
                                <PolarGrid stroke={BORDER} />
                                <PolarAngleAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700 }} />
                                <PolarRadiusAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} />
                                <Radar dataKey="incidents" stroke={COLORS.PURPLE} fill={COLORS.PURPLE} fillOpacity={0.3} strokeWidth={2} name="Incidents" dot={{ fill: COLORS.PURPLE, r: 4, stroke: '#fff', strokeWidth: 1 }} />
                                <Tooltip contentStyle={TT_STYLE} itemStyle={{ fontWeight: 800, color: COLORS.PURPLE }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </ChartPanel>
                </Grid>
            </Grid>

            {/* ── Row 3: AI Heatmap ──────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
                <Box sx={{ ...glass, p: 3, position: 'relative', overflow: 'hidden', boxShadow: `0 0 0 1px ${COLORS.ACCENT}10, 0 8px 32px rgba(0,0,0,0.4)` }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${COLORS.ACCENT}, transparent)` }} />
                    <Box sx={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 300, height: 100, borderRadius: '50%', background: `${COLORS.ACCENT}15`, filter: 'blur(50px)', pointerEvents: 'none' }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, position: 'relative', zIndex: 1 }}>
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                                <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: `linear-gradient(135deg, ${COLORS.ACCENT}22, ${COLORS.ACCENT}0A)`, border: `1px solid ${COLORS.ACCENT}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.ACCENT }}>
                                    <MapIcon fontSize="small" />
                                </Box>
                                <Typography fontWeight={800} color="white" fontSize={16}>AI Crime Hotspot Heatmap</Typography>
                            </Box>
                            <Typography variant="caption" color="rgba(255,255,255,0.45)" ml={6}>
                                KMeans clustering on {hotspots.length} incident clusters · Risk level: 0 (low) → 1.0 (critical)
                            </Typography>
                        </Box>
                        <Chip label="AI Predicted" size="small" sx={{ bgcolor: `${COLORS.PURPLE}1A`, color: COLORS.PURPLE, border: `1px solid ${COLORS.PURPLE}44`, fontWeight: 800, height: 22, fontSize: 10 }} />
                    </Box>

                    {isLoaded ? (
                        <Box sx={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
                            <GoogleMap
                                mapContainerStyle={{ width: '100%', height: '420px' }}
                                center={{ lat: 20.5937, lng: 78.9629 }}
                                zoom={5}
                                options={{
                                    mapTypeId: 'roadmap',
                                    disableDefaultUI: true,
                                    zoomControl: true,
                                    styles: [
                                        { elementType: 'geometry',            stylers: [{ color: '#0A0E1A' }] },
                                        { elementType: 'labels.text.fill',    stylers: [{ color: '#746855' }] },
                                        { elementType: 'labels.text.stroke',  stylers: [{ color: '#0A0E1A' }] },
                                        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#141b2d' }] },
                                        { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1e2a4a' }] },
                                        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#090d14' }] },
                                        { featureType: 'poi',   stylers: [{ visibility: 'off' }] },
                                    ],
                                }}
                            >
                                {heatmapPoints.length > 0 && <HeatmapLayer data={heatmapPoints} options={{ radius: 40, opacity: 0.8 }} />}
                            </GoogleMap>
                            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(to top, rgba(10,14,26,0.9), transparent)', pointerEvents: 'none' }} />
                        </Box>
                    ) : (
                        <Skeleton variant="rectangular" height={420} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 3 }} />
                    )}

                    {hotspots.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', mb: 1.5, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 700 }}>
                                Top Risk Clusters
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap' }}>
                                {hotspots.slice(0, 8).map((h, i) => {
                                    const risk = h.riskScore;
                                    const col = risk > 0.7 ? COLORS.DANGER : risk > 0.4 ? COLORS.WARN : COLORS.SUCCESS;
                                    return (
                                        <motion.div key={i} whileHover={{ y: -2 }}>
                                            <Chip
                                                size="small"
                                                label={`${h.area}: ${(risk * 100).toFixed(0)}% risk · ${h.crimeCount} incidents`}
                                                sx={{
                                                    bgcolor: `${col}15`, color: col, height: 26,
                                                    border: `1px solid ${col}44`, fontWeight: 700, fontSize: 11,
                                                    boxShadow: `0 2px 8px ${col}1A`,
                                                }}
                                            />
                                        </motion.div>
                                    );
                                })}
                            </Box>
                        </Box>
                    )}
                </Box>
            </motion.div>
        </Box>
    );
};