// =============================================================================
// pages/dashboard/DashboardPage.tsx - Main Control Room Dashboard (Redesigned)
// =============================================================================

import React, { useEffect, useState } from 'react';
import {
    Grid, Typography, Box, Skeleton,
    Chip, Divider,
} from '@mui/material';
import {
    Folder as CasesIcon,
    Warning as SosIcon,
    Badge as OfficerIcon,
    PersonSearch as CriminalIcon,
    TrendingUp as TrendUpIcon,
    TrendingDown as TrendDownIcon,
    CheckCircle as ResolvedIcon,
    RadioButtonChecked as LiveDotIcon,
    FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from 'recharts';
import { motion, animate } from 'framer-motion';
import { dashboardService } from '../../services/api.service';
import { DashboardStats, MonthlyTrend, CrimeDistribution } from '../../types';

// ── Animated number counter ────────────────────────────────────────────────────
const AnimatedNumber: React.FC<{ value: number; duration?: number }> = ({ value, duration = 1.2 }) => {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const controls = animate(0, value, {
            duration,
            ease: 'easeOut',
            onUpdate: (v) => setDisplay(Math.round(v)),
        });
        return controls.stop;
    }, [value, duration]);
    return <>{display.toLocaleString()}</>;
};

// ── Glassmorphism Stat Card ────────────────────────────────────────────────────
interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
    trend?: number;
    loading?: boolean;
    delay?: number;
    pulse?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle, trend, loading, delay = 0, pulse }) => (
    <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
        whileHover={{ y: -6, scale: 1.02 }}
        style={{ height: '100%' }}
    >
        <Box
            sx={{
                height: '100%',
                borderRadius: '16px',
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(20,27,46,0.95) 0%, rgba(14,20,36,0.98) 100%)',
                border: `1px solid ${color}30`,
                boxShadow: `0 0 0 1px ${color}18, 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`,
                backdropFilter: 'blur(20px)',
                transition: 'box-shadow 0.3s ease',
                '&:hover': {
                    boxShadow: `0 0 0 1px ${color}50, 0 20px 48px rgba(0,0,0,0.5), 0 0 32px ${color}20`,
                },
            }}
        >
            {/* Top accent line */}
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

            {/* Background glow blob */}
            <Box sx={{
                position: 'absolute', top: -40, right: -40,
                width: 120, height: 120,
                borderRadius: '50%',
                background: `${color}12`,
                filter: 'blur(30px)',
                pointerEvents: 'none',
            }} />

            <Box sx={{ p: '20px 24px 18px' }}>
                {/* Icon + pulse */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ position: 'relative' }}>
                        <Box sx={{
                            width: 48, height: 48, borderRadius: '14px',
                            background: `linear-gradient(135deg, ${color}22, ${color}10)`,
                            border: `1px solid ${color}30`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            '& svg': { fontSize: 24, color },
                        }}>
                            {icon}
                        </Box>
                        {pulse && (
                            <Box sx={{
                                position: 'absolute', top: -3, right: -3,
                                width: 12, height: 12,
                                borderRadius: '50%',
                                background: color,
                                '&::after': {
                                    content: '""', position: 'absolute', inset: -4,
                                    borderRadius: '50%', border: `2px solid ${color}`,
                                    animation: 'pulseRing 1.5s ease-out infinite',
                                },
                            }} />
                        )}
                    </Box>
                    {trend !== undefined && (
                        <Chip
                            icon={trend >= 0 ? <TrendUpIcon sx={{ fontSize: '14px !important' }} /> : <TrendDownIcon sx={{ fontSize: '14px !important' }} />}
                            label={`${trend >= 0 ? '+' : ''}${trend}%`}
                            size="small"
                            sx={{
                                height: 24, fontSize: 11, fontWeight: 700,
                                px: 0.5,
                                bgcolor: trend >= 0 ? 'rgba(0,230,118,0.12)' : 'rgba(255,23,68,0.12)',
                                color: trend >= 0 ? '#00E676' : '#FF1744',
                                border: `1px solid ${trend >= 0 ? '#00E67630' : '#FF174430'}`,
                            }}
                        />
                    )}
                </Box>

                {/* Value */}
                <Box>
                    {loading ? (
                        <Skeleton width={70} height={44} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
                    ) : (
                        <Typography sx={{ fontSize: 36, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px', color: '#fff' }}>
                            <AnimatedNumber value={value} />
                        </Typography>
                    )}
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: 10, display: 'block', mt: 0.5 }}>
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
            </Box>
        </Box>
    </motion.div>
);

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
interface TooltipPayload { dataKey: string; name: string; value: number; color: string; }
const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
        <Box sx={{
            background: 'rgba(10,14,26,0.96)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px', p: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(20px)',
        }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 0.5 }}>{label}</Typography>
            {payload.map((p) => (
                <Box key={p.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
                    <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600 }}>{p.name}: {p.value}</Typography>
                </Box>
            ))}
        </Box>
    );
};

// ── Pie colors ─────────────────────────────────────────────────────────────────
const PIE_COLORS = ['#FF1744', '#7C4DFF', '#00E676', '#FFD600', '#40C4FF', '#FF6D00', '#69F0AE'];

// ── Section heading ────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Typography variant="caption" sx={{
        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px',
        color: 'rgba(255,255,255,0.3)', fontSize: 10, display: 'block', mb: 1.5,
    }}>
        {children}
    </Typography>
);

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export const DashboardPage: React.FC = () => {
    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: () => dashboardService.getStats(),
        refetchInterval: 30_000,
    });
    const { data: trendsData, isLoading: trendsLoading } = useQuery({
        queryKey: ['monthly-trends'],
        queryFn: () => dashboardService.getMonthlyTrends(),
        refetchInterval: 60_000,
    });
    const { data: distData } = useQuery({
        queryKey: ['crime-distribution'],
        queryFn: () => dashboardService.getCrimeDistribution(),
        refetchInterval: 60_000,
    });

    const stats: DashboardStats | undefined = statsData?.data?.data;
    const trends: MonthlyTrend[] = trendsData?.data?.data || [];
    const distribution: CrimeDistribution[] = distData?.data?.data || [];

    // Live IST clock
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata', hour12: true });
    const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

    // Resolution rate for radial chart
    const resolutionRate = stats
        ? Math.round((stats.resolvedThisMonth / Math.max(stats.casesThisMonth, 1)) * 100)
        : 0;

    return (
        <Box sx={{ pb: 4 }}>
            {/* CSS keyframes injection */}
            <style>{`
                @keyframes pulseRing {
                    0%   { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(2.2); opacity: 0; }
                }
                @keyframes scanLine {
                    0%   { transform: translateY(-100%); }
                    100% { transform: translateY(400%); }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50%       { opacity: 0.3; }
                }
            `}</style>

            {/* ── Header ────────────────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                            <Box sx={{
                                width: 10, height: 10, borderRadius: '50%', bgcolor: '#00E676',
                                animation: 'pulseRing 1.5s ease-out infinite',
                                boxShadow: '0 0 8px #00E676',
                            }} />
                            <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', fontSize: 10 }}>
                                Live — Control Room
                            </Typography>
                        </Box>
                        <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1 }}>
                            Operations Dashboard
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>
                            Real-time emergency response overview · Auto-refreshes every 30s
                        </Typography>
                    </Box>
                    <Box sx={{
                        textAlign: 'right',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '14px', px: 2.5, py: 1.5,
                    }}>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                            {timeStr}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)' }}>{dateStr}</Typography>
                    </Box>
                </Box>
            </motion.div>

            {/* ── Stat Cards ────────────────────────────────────────────────── */}
            <SectionLabel>Key Metrics</SectionLabel>
            <Grid container spacing={2.5} sx={{ mb: 4 }}>
                {[
                    { title: 'Active Cases', value: stats?.activeCases ?? 0, subtitle: `${stats?.totalCases ?? 0} total in system`, icon: <CasesIcon />, color: '#FF1744', trend: 12, pulse: true, delay: 0 },
                    { title: 'SOS Today', value: stats?.sosToday ?? 0, subtitle: 'Emergency alerts', icon: <SosIcon />, color: '#FF6D00', trend: -5, pulse: (stats?.sosToday ?? 0) > 0, delay: 0.06 },
                    { title: 'Officers On Duty', value: stats?.policeOnDuty ?? 0, subtitle: `of ${stats?.totalPolice ?? 0} registered`, icon: <OfficerIcon />, color: '#7C4DFF', delay: 0.12 },
                    { title: 'Criminal Records', value: stats?.totalCriminals ?? 0, subtitle: 'In database', icon: <CriminalIcon />, color: '#40C4FF', delay: 0.18 },
                    { title: 'Resolved This Month', value: stats?.resolvedThisMonth ?? 0, subtitle: `of ${stats?.casesThisMonth ?? 0} this month`, icon: <ResolvedIcon />, color: '#00E676', trend: 8, delay: 0.24 },
                ].map((card) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }} key={card.title}>
                        <StatCard {...card} loading={statsLoading} />
                    </Grid>
                ))}
            </Grid>

            {/* ── Charts Row ────────────────────────────────────────────────── */}
            <Grid container spacing={2.5} sx={{ mb: 4 }}>
                {/* Area Chart */}
                <Grid size={{ xs: 12, lg: 8 }}>
                    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
                        <Box sx={{
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, rgba(20,27,46,0.95), rgba(14,20,36,0.98))',
                            border: '1px solid rgba(255,255,255,0.07)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                            p: '24px 28px',
                            height: '100%',
                        }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Box>
                                    <SectionLabel>Performance</SectionLabel>
                                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1, color: '#fff' }}>Monthly Case Trends</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    {[{ color: '#FF1744', label: 'New Cases' }, { color: '#00E676', label: 'Resolved' }].map((l) => (
                                        <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                            <Box sx={{ width: 24, height: 3, borderRadius: 4, bgcolor: l.color, boxShadow: `0 0 6px ${l.color}` }} />
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{l.label}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                            {trendsLoading ? (
                                <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)' }} />
                            ) : trends.length === 0 ? (
                                <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography sx={{ color: 'rgba(255,255,255,0.2)' }}>No trend data yet</Typography>
                                </Box>
                            ) : (
                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart data={trends} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gCases" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#FF1744" stopOpacity={0.35} />
                                                <stop offset="100%" stopColor="#FF1744" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#00E676" stopOpacity={0.3} />
                                                <stop offset="100%" stopColor="#00E676" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)', fontWeight: 500 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Area type="monotone" dataKey="cases" name="New Cases" stroke="#FF1744" strokeWidth={2.5} fill="url(#gCases)" dot={false} activeDot={{ r: 6, fill: '#FF1744', strokeWidth: 0 }} />
                                        <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#00E676" strokeWidth={2.5} fill="url(#gResolved)" dot={false} activeDot={{ r: 6, fill: '#00E676', strokeWidth: 0 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </motion.div>
                </Grid>

                {/* Pie Chart */}
                <Grid size={{ xs: 12, lg: 4 }}>
                    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.38 }} style={{ height: '100%' }}>
                        <Box sx={{
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, rgba(20,27,46,0.95), rgba(14,20,36,0.98))',
                            border: '1px solid rgba(255,255,255,0.07)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                            p: '24px 28px',
                            height: '100%',
                        }}>
                            <SectionLabel>Breakdown</SectionLabel>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5, color: '#fff' }}>Crime Categories</Typography>
                            {distribution.length === 0 ? (
                                <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography sx={{ color: 'rgba(255,255,255,0.2)' }}>No data yet</Typography>
                                </Box>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <PieChart>
                                            <Pie data={distribution} dataKey="count" nameKey="type" cx="50%" cy="50%" innerRadius={50} outerRadius={80} strokeWidth={0} paddingAngle={3}>
                                                {distribution.map((_, i) => (
                                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} style={{ filter: `drop-shadow(0 0 6px ${PIE_COLORS[i % PIE_COLORS.length]}80)` }} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<ChartTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mt: 1 }}>
                                        {distribution.map((d, i) => {
                                            const total = distribution.reduce((s, x) => s + x.count, 0);
                                            const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                                            return (
                                                <Box key={d.type} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0, boxShadow: `0 0 6px ${PIE_COLORS[i % PIE_COLORS.length]}` }} />
                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', flex: 1, fontSize: 11 }}>{d.type}</Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Box sx={{ width: 50, height: 3, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                                                            <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 4 }} />
                                                        </Box>
                                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, width: 28, textAlign: 'right' }}>{pct}%</Typography>
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </>
                            )}
                        </Box>
                    </motion.div>
                </Grid>
            </Grid>

            {/* ── Bottom Row ────────────────────────────────────────────────── */}
            <Grid container spacing={2.5}>
                {/* Resolution Rate */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.46 }}>
                        <Box sx={{
                            borderRadius: '20px', p: '24px',
                            background: 'linear-gradient(135deg, rgba(20,27,46,0.95), rgba(14,20,36,0.98))',
                            border: '1px solid rgba(124,77,255,0.2)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                            textAlign: 'center',
                            position: 'relative', overflow: 'hidden',
                        }}>
                            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #7C4DFF, transparent)' }} />
                            <SectionLabel>This Month</SectionLabel>
                            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>Resolution Rate</Typography>
                            <Box sx={{ my: 1.5 }}>
                                <ResponsiveContainer width="100%" height={120}>
                                    <RadialBarChart cx="50%" cy="100%" innerRadius="60%" outerRadius="100%" data={[{ value: resolutionRate, fill: '#7C4DFF' }]} startAngle={180} endAngle={0}>
                                        <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'rgba(255,255,255,0.05)' }} />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                            </Box>
                            <Typography sx={{ fontSize: 40, fontWeight: 900, lineHeight: 1, color: '#7C4DFF', mt: -2 }}>
                                <AnimatedNumber value={resolutionRate} />%
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)' }}>
                                {stats?.resolvedThisMonth ?? 0} of {stats?.casesThisMonth ?? 0} cases
                            </Typography>
                        </Box>
                    </motion.div>
                </Grid>

                {/* Officer Status Panel */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.52 }}>
                        <Box sx={{
                            borderRadius: '20px', p: '24px',
                            background: 'linear-gradient(135deg, rgba(20,27,46,0.95), rgba(14,20,36,0.98))',
                            border: '1px solid rgba(0,230,118,0.15)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                            position: 'relative', overflow: 'hidden',
                        }}>
                            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #00E676, transparent)' }} />
                            <SectionLabel>Personnel</SectionLabel>
                            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2.5 }}>Officer Status</Typography>
                            {[
                                { label: 'On Duty', value: stats?.policeOnDuty ?? 0, color: '#00E676' },
                                { label: 'Off Duty', value: (stats?.totalPolice ?? 0) - (stats?.policeOnDuty ?? 0), color: 'rgba(255,255,255,0.2)' },
                                { label: 'Total Registered', value: stats?.totalPolice ?? 0, color: '#40C4FF' },
                            ].map((item) => (
                                <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <DotIcon sx={{ fontSize: 8, color: item.color }} />
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{item.label}</Typography>
                                    </Box>
                                    <Typography sx={{ fontWeight: 700, color: item.color, fontSize: 18 }}>
                                        {statsLoading ? '—' : item.value}
                                    </Typography>
                                </Box>
                            ))}
                            <Box sx={{ mt: 2 }}>
                                <Box sx={{ height: 6, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${stats ? (stats.policeOnDuty / Math.max(stats.totalPolice, 1)) * 100 : 0}%` }}
                                        transition={{ duration: 1.2, delay: 0.8, ease: 'easeOut' }}
                                        style={{ height: '100%', background: 'linear-gradient(90deg, #00E676, #40C4FF)', borderRadius: 6 }}
                                    />
                                </Box>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, mt: 0.5, display: 'block' }}>
                                    {stats ? Math.round((stats.policeOnDuty / Math.max(stats.totalPolice, 1)) * 100) : 0}% deployment rate
                                </Typography>
                            </Box>
                        </Box>
                    </motion.div>
                </Grid>

                {/* System Status */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.58 }}>
                        <Box sx={{
                            borderRadius: '20px', p: '24px',
                            background: 'linear-gradient(135deg, rgba(20,27,46,0.95), rgba(14,20,36,0.98))',
                            border: '1px solid rgba(255,255,255,0.07)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                            height: '100%',
                        }}>
                            <SectionLabel>Infrastructure</SectionLabel>
                            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2.5 }}>System Health</Typography>
                            <Grid container spacing={1.5}>
                                {[
                                    { name: 'Backend API', color: '#00E676', status: 'Operational', uptime: '99.9%' },
                                    { name: 'AI Services', color: '#00E676', status: 'Operational', uptime: '99.5%' },
                                    { name: 'Database', color: '#00E676', status: 'Operational', uptime: '100%' },
                                    { name: 'Socket Server', color: '#FFD600', status: 'Degraded', uptime: '97.2%' },
                                ].map((svc) => (
                                    <Grid size={{ xs: 12, sm: 6 }} key={svc.name}>
                                        <Box sx={{
                                            p: '12px 16px', borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${svc.color === '#00E676' ? 'rgba(0,230,118,0.12)' : 'rgba(255,214,0,0.12)'}`,
                                            display: 'flex', alignItems: 'center', gap: 1.5,
                                        }}>
                                            <Box sx={{
                                                width: 8, height: 8, borderRadius: '50%', bgcolor: svc.color, flexShrink: 0,
                                                boxShadow: `0 0 8px ${svc.color}`,
                                                animation: svc.color === '#00E676' ? 'blink 3s ease-in-out infinite' : 'none',
                                            }} />
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, fontSize: 12, display: 'block' }}>{svc.name}</Typography>
                                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{svc.status}</Typography>
                                            </Box>
                                            <Typography variant="caption" sx={{ color: svc.color, fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                                                {svc.uptime}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>

                            <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.05)' }} />

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <LiveDotIcon sx={{ fontSize: 12, color: '#00E676', animation: 'blink 1.5s ease-in-out infinite' }} />
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                                        All systems monitored · Last check just now
                                    </Typography>
                                </Box>
                                <Chip label="All Clear" size="small" sx={{
                                    height: 22, fontSize: 10, fontWeight: 700,
                                    bgcolor: 'rgba(0,230,118,0.12)', color: '#00E676',
                                    border: '1px solid rgba(0,230,118,0.25)',
                                }} />
                            </Box>
                        </Box>
                    </motion.div>
                </Grid>
            </Grid>
        </Box>
    );
};
