import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Syringe,
    Calendar,
    AlertCircle,
    TrendingUp,
    Bell,
    ArrowRight,
    Users,
    Zap,
    CheckCircle2,
    Clock,
    Activity,
    BarChart2,
    LineChart as LineChartIcon
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    LineChart, Line, AreaChart, Area
} from 'recharts';

/* ─── Inline style constants ──────────────────────────────────────── */
const S = {
    page: {
        padding: '1.75rem 2rem',
        background: '#f8fafc',
        minHeight: '100vh',
        fontFamily: "'Inter', sans-serif",
        animation: 'fadeInPage 0.45s ease-out',
    },
    /* ── Header ── */
    headerRow: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
        paddingBottom: '1.5rem',
        borderBottom: '1px dashed #e2e8f0',
    },
    logoIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
    },
    pageTitle: {
        fontSize: '1.5rem',
        fontWeight: 800,
        color: '#0f172a',
        letterSpacing: '-0.025em',
        margin: 0,
    },
    pageSubtitle: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: 500,
        margin: '4px 0 0',
    },
    badgeLive: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: '#ecfdf5',
        color: '#059669',
        fontSize: 11,
        fontWeight: 700,
        padding: '5px 12px',
        borderRadius: 20,
        border: '1px solid #a7f3d0',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
    },
    btnSchedule: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 600,
        color: '#334155',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    },
    headerActions: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
    },

    /* ── KPI cards ── */
    kpiGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.75rem',
    },
    kpiCard: {
        background: '#fff',
        borderRadius: 18,
        border: '1px solid #e9eef5',
        padding: '1.35rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'all 0.25s ease',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    },
    kpiTop: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    kpiIconBox: (bg) => ({
        width: 42,
        height: 42,
        borderRadius: 12,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    }),
    kpiBadge: (color) => ({
        fontSize: 11,
        fontWeight: 700,
        color,
        background: color + '1a',
        padding: '3px 9px',
        borderRadius: 20,
        letterSpacing: '0.03em',
    }),
    kpiValue: {
        fontSize: '2rem',
        fontWeight: 850,
        color: '#0f172a',
        letterSpacing: '-0.04em',
        lineHeight: 1,
    },
    kpiLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: 600,
        marginTop: 2,
    },
    kpiGlow: (color) => ({
        position: 'absolute',
        bottom: -30,
        right: -30,
        width: 90,
        height: 90,
        background: color,
        borderRadius: '50%',
        opacity: 0.06,
        pointerEvents: 'none',
    }),

    /* ── Main content row ── */
    mainRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: '1.25rem',
        marginBottom: '1.75rem',
    },

    /* ── Chart card ── */
    card: {
        background: '#fff',
        borderRadius: 18,
        border: '1px solid #e9eef5',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.35rem 1.5rem',
        borderBottom: '1px solid #f1f5f9',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: 700,
        color: '#1e293b',
        margin: 0,
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#94a3b8',
        margin: '2px 0 0',
        fontWeight: 500,
    },
    chartTabGroup: {
        display: 'flex',
        gap: 4,
        background: '#f1f5f9',
        borderRadius: 10,
        padding: 4,
    },
    chartTab: (active) => ({
        padding: '5px 14px',
        borderRadius: 7,
        fontSize: 12,
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
        background: active ? '#fff' : 'transparent',
        color: active ? '#334155' : '#94a3b8',
        boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
    }),
    chartBody: {
        padding: '1.25rem 1.5rem 1.5rem',
    },

    /* ── Drop-off tracking ── */
    dropoffCard: {
        background: '#fff',
        borderRadius: 18,
        border: '1px solid #e9eef5',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        overflow: 'hidden',
    },
    dropoffBody: {
        flex: 1,
        overflowY: 'auto',
        padding: '0.75rem 1.25rem 1.25rem',
    },
    doseItem: {
        padding: '0.9rem 1rem',
        borderRadius: 12,
        background: '#f8fafc',
        marginBottom: '0.65rem',
        border: '1px solid transparent',
        transition: 'all 0.2s ease',
        cursor: 'default',
    },
    doseTop: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    doseName: {
        fontSize: 13,
        fontWeight: 700,
        color: '#1e293b',
    },
    overdueTag: {
        fontSize: 10,
        fontWeight: 700,
        color: '#dc2626',
        background: '#fef2f2',
        padding: '2px 8px',
        borderRadius: 6,
        border: '1px solid #fecaca',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    doseMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 11,
        color: '#64748b',
        fontWeight: 500,
    },
    doseAlertBtn: {
        marginTop: 10,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        background: '#fff',
        border: '1px solid #c7d2fe',
        color: '#6366f1',
        borderRadius: 8,
        padding: '6px 0',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    emptyState: {
        textAlign: 'center',
        padding: '2.5rem 1rem',
    },
    emptyIcon: {
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: '#ecfdf5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 12px',
    },
    emptyText: {
        fontSize: 13,
        color: '#94a3b8',
        fontWeight: 500,
    },

    /* ── Upcoming appointments table ── */
    tableWrapper: {
        background: '#fff',
        borderRadius: 18,
        border: '1px solid #e9eef5',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    },
    tableScrollBox: {
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 13,
    },
    th: {
        background: '#f8fafc',
        padding: '0.85rem 1.25rem',
        textAlign: 'left',
        fontSize: 10.5,
        fontWeight: 800,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        borderBottom: '1px solid #e9eef5',
    },
    td: {
        padding: '0.9rem 1.25rem',
        borderBottom: '1px solid #f1f5f9',
        verticalAlign: 'middle',
    },
    patientName: {
        fontSize: 13,
        fontWeight: 700,
        color: '#1e293b',
    },
    patientPid: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 2,
    },
    vaccineBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        background: '#eef2ff',
        color: '#4338ca',
        fontSize: 11,
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: 7,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    },
    eligibilityTag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 12,
        fontWeight: 600,
        color: '#059669',
    },
    btnPrepare: {
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: 9,
        padding: '7px 16px',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
        whiteSpace: 'nowrap',
    },
    viewAllBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        color: '#6366f1',
        fontSize: 13,
        fontWeight: 700,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
    },
};

/* ─── KPI Card ─────────────────────────────────────────────── */
const KPICard = ({ icon: Icon, iconBg, iconColor, badge, badgeColor, value, label, glowColor }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            style={{
                ...S.kpiCard,
                transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: hovered ? '0 12px 24px rgba(0,0,0,0.09)' : '0 2px 8px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div style={S.kpiTop}>
                <div style={S.kpiIconBox(iconBg)}>
                    <Icon size={18} color={iconColor} />
                </div>
                <span style={S.kpiBadge(badgeColor)}>{badge}</span>
            </div>
            <div>
                <div style={S.kpiValue}>{value}</div>
                <div style={S.kpiLabel}>{label}</div>
            </div>
            <div style={S.kpiGlow(glowColor)} />
        </div>
    );
};

/* ─── Shield SVG ─────────────────────────────────────────────── */
const Shield = ({ size, color }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke={color || 'currentColor'} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

/* ─── Custom Tooltip ─────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: '#fff', borderRadius: 12, padding: '10px 16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.12)', border: '1px solid #e9eef5',
                fontSize: 13,
            }}>
                <p style={{ fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>{label}</p>
                <p style={{ color: '#6366f1', fontWeight: 700, margin: 0 }}>
                    {payload[0].value} doses
                </p>
            </div>
        );
    }
    return null;
};

/* ─────────────────────────────────────────────────────────────────── */
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const ImmunizationDashboard = () => {
    const [data, setData] = useState({ top_vaccines: [], upcoming_doses: [], total_vaccinations: 0 });
    const [loading, setLoading] = useState(true);
    const [chartType, setChartType] = useState('bar');
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

    useEffect(() => {
        const fetchVaccineData = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/analytics/vaccines`);
                setData(res.data.data);
            } catch (err) {
                console.error('Error fetching vaccine data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchVaccineData();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid #e9eef5', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>Loading immunization data…</p>
            </div>
        );
    }

    return (
        <>
            {/* Keyframe injection */}
            <style>{`
                @keyframes fadeInPage { from { opacity:0; transform:translateY(12px);} to { opacity:1; transform:translateY(0);} }
                @keyframes spin { to { transform:rotate(360deg); } }
                .dose-item-hover:hover { background:#f0f4ff !important; border-color:#c7d2fe !important; }
                .dose-alert-btn-hover:hover { background:#6366f1 !important; color:#fff !important; border-color:#6366f1 !important; }
                .schedule-btn:hover { background:#f8fafc !important; border-color:#c7d2fe !important; color:#6366f1 !important; }
                .prepare-btn:hover { opacity:0.88; transform:translateY(-1px); }
                .table-row:hover td { background:#fafbff !important; }
                .kpi-card:hover { transform:translateY(-4px); }
                .imm-main-row { display:grid; grid-template-columns:1fr 340px; gap:1.25rem; margin-bottom:1.75rem; }
                .imm-kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1.25rem; margin-bottom:1.75rem; }
                @media (max-width:1100px) {
                    .imm-main-row { grid-template-columns:1fr !important; }
                    .imm-kpi-grid { grid-template-columns:repeat(2,1fr) !important; }
                }
                @media (max-width:600px) {
                    .imm-kpi-grid { grid-template-columns:1fr 1fr !important; }
                }
            `}</style>

            <div style={S.page}>

                {/* ── Page Header ────────────────────────────────────── */}
                <div style={S.headerRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={S.logoIcon}>
                            <Syringe size={22} color="#fff" />
                        </div>
                        <div>
                            <h1 style={S.pageTitle}>Immunization Intelligence Dashboard</h1>
                            <p style={S.pageSubtitle}>Real-time vaccination analytics &amp; dose tracking</p>
                        </div>
                    </div>
                    <div style={S.headerActions}>
                        <span style={S.badgeLive}>
                            <Activity size={12} /> Live Analytics
                        </span>
                        <button className="schedule-btn" style={S.btnSchedule}>
                            <Calendar size={16} />
                            Schedule Camp
                        </button>
                    </div>
                </div>

                {/* ── KPI Row ─────────────────────────────────────────── */}
                <div className="imm-kpi-grid">
                    <KPICard
                        icon={TrendingUp}
                        iconBg="#eef2ff"
                        iconColor="#6366f1"
                        badge="+12.5%"
                        badgeColor="#6366f1"
                        value={data.total_vaccinations.toLocaleString()}
                        label="Total Doses Administered"
                        glowColor="#6366f1"
                    />
                    <KPICard
                        icon={Clock}
                        iconBg="#fffbeb"
                        iconColor="#d97706"
                        badge="Priority"
                        badgeColor="#d97706"
                        value={data.upcoming_doses.length}
                        label="Doses Due This Week"
                        glowColor="#f59e0b"
                    />
                    <KPICard
                        icon={Users}
                        iconBg="#ecfdf5"
                        iconColor="#059669"
                        badge="98% coverage"
                        badgeColor="#059669"
                        value="128"
                        label="Active Infants Tracked"
                        glowColor="#10b981"
                    />
                    <KPICard
                        icon={AlertCircle}
                        iconBg="#fff1f2"
                        iconColor="#dc2626"
                        badge="Action Needed"
                        badgeColor="#dc2626"
                        value="15"
                        label="Drop-off Alerts (Overdue)"
                        glowColor="#ef4444"
                    />
                </div>

                {/* ── Chart + Drop-off row ─────────────────────────── */}
                <div className="imm-main-row">

                    {/* Vaccine Demand Analysis */}
                    <div style={S.card}>
                        <div style={S.cardHeader}>
                            <div>
                                <h3 style={S.cardTitle}>Vaccine Demand Analysis</h3>
                                <p style={S.cardSubtitle}>Most frequently administered vaccines this month</p>
                            </div>
                            <div style={S.chartTabGroup}>
                                <button
                                    style={S.chartTab(chartType === 'bar')}
                                    onClick={() => setChartType('bar')}
                                >
                                    <BarChart2 size={12} style={{ display: 'inline', marginRight: 4 }} />
                                    Bar
                                </button>
                                <button
                                    style={S.chartTab(chartType === 'line')}
                                    onClick={() => setChartType('line')}
                                >
                                    <LineChartIcon size={12} style={{ display: 'inline', marginRight: 4 }} />
                                    Line
                                </button>
                            </div>
                        </div>
                        <div style={S.chartBody}>
                            {data.top_vaccines.length === 0 ? (
                                <div style={{ ...S.emptyState, padding: '4rem 1rem' }}>
                                    <div style={{ ...S.emptyIcon, background: '#eef2ff' }}>
                                        <BarChart2 size={22} color="#6366f1" />
                                    </div>
                                    <p style={S.emptyText}>No vaccine data available for this period.</p>
                                </div>
                            ) : (
                                <div style={{ height: 300 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        {chartType === 'bar' ? (
                                            <BarChart data={data.top_vaccines} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="_id" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={42}>
                                                    {data.top_vaccines.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        ) : (
                                            <AreaChart data={data.top_vaccines} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="vaccineGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="_id" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fill="url(#vaccineGrad)" dot={{ fill: '#6366f1', r: 4 }} />
                                            </AreaChart>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Drop-off Tracking */}
                    <div style={S.dropoffCard}>
                        <div style={S.cardHeader}>
                            <div>
                                <h3 style={{ ...S.cardTitle, display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <AlertCircle size={17} color="#dc2626" />
                                    Drop-off Tracking
                                </h3>
                                <p style={S.cardSubtitle}>Patients overdue for their next dose</p>
                            </div>
                            {data.upcoming_doses.length > 0 && (
                                <span style={{
                                    background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 700,
                                    borderRadius: 20, padding: '3px 10px', border: '1px solid #fecaca'
                                }}>
                                    {data.upcoming_doses.length} overdue
                                </span>
                            )}
                        </div>
                        <div style={S.dropoffBody}>
                            {data.upcoming_doses.length === 0 ? (
                                <div style={S.emptyState}>
                                    <div style={S.emptyIcon}>
                                        <CheckCircle2 size={24} color="#10b981" />
                                    </div>
                                    <p style={S.emptyText}>No drop-offs detected for this period.</p>
                                </div>
                            ) : (
                                data.upcoming_doses.slice(0, 5).map((dose, idx) => (
                                    <div key={idx} className="dose-item-hover" style={S.doseItem}>
                                        <div style={S.doseTop}>
                                            <span style={S.doseName}>{dose.child_name || 'Baby Patient'}</span>
                                            <span style={S.overdueTag}>Overdue</span>
                                        </div>
                                        <div style={S.doseMeta}>
                                            <Shield size={11} color="#94a3b8" />
                                            <span>{dose.vaccine_expected || 'Pending Booster'}</span>
                                            <span style={{ color: '#e2e8f0' }}>•</span>
                                            <Clock size={11} color="#94a3b8" />
                                            <span>{new Date(dose.next_due_date).toLocaleDateString()}</span>
                                        </div>
                                        <button className="dose-alert-btn-hover" style={S.doseAlertBtn}>
                                            <Bell size={11} /> Send WhatsApp Alert
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Upcoming Vaccination Appointments ───────────── */}
                <div style={S.tableWrapper}>
                    <div style={S.cardHeader}>
                        <div>
                            <h3 style={S.cardTitle}>Upcoming Vaccination Appointments</h3>
                            <p style={S.cardSubtitle}>Automated alerts for the next 7 days</p>
                        </div>
                        <button style={S.viewAllBtn}>
                            View All Calendar <ArrowRight size={15} />
                        </button>
                    </div>
                    <div style={S.tableScrollBox}>
                        <table style={S.table}>
                            <thead>
                                <tr>
                                    <th style={S.th}>Patient</th>
                                    <th style={S.th}>Expected Vaccine</th>
                                    <th style={S.th}>Due Date</th>
                                    <th style={S.th}>Eligibility</th>
                                    <th style={{ ...S.th, textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.upcoming_doses.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ ...S.td, textAlign: 'center', padding: '3rem', color: '#94a3b8', fontWeight: 600 }}>
                                            <CheckCircle2 size={20} color="#10b981" style={{ display: 'block', margin: '0 auto 8px' }} />
                                            No upcoming vaccination appointments found.
                                        </td>
                                    </tr>
                                ) : (
                                    data.upcoming_doses.map((dose, idx) => (
                                        <tr key={idx} className="table-row">
                                            <td style={S.td}>
                                                <div style={S.patientName}>{dose.child_name}</div>
                                                <div style={S.patientPid}>PID: {dose.patient_id}</div>
                                            </td>
                                            <td style={S.td}>
                                                <span style={S.vaccineBadge}>{dose.vaccine_expected || 'Generic Booster'}</span>
                                            </td>
                                            <td style={{ ...S.td, color: '#334155', fontWeight: 600 }}>
                                                {new Date(dose.next_due_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td style={S.td}>
                                                <span style={S.eligibilityTag}>
                                                    <CheckCircle2 size={14} /> Ready for Dose
                                                </span>
                                            </td>
                                            <td style={{ ...S.td, textAlign: 'right' }}>
                                                <button className="prepare-btn" style={S.btnPrepare}>
                                                    Prepare Dose
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </>
    );
};

export default ImmunizationDashboard;
