import React, { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp, Users, Calendar, Activity, Filter, Download,
    Clock, RefreshCw, CheckCircle2, XCircle, Search, BarChart2, Loader2,
    FileText, Hash
} from 'lucide-react';
import {
    getPracticeInsights, getReportsDashboard, getAppointmentsReport,
    getDoctors, toIsoDate
} from '../api/index';
import { removeSalutation } from '../utils/formatters';

const Analytics = () => {
    // Basic Setup
    const today = toIsoDate();
    const firstOfMonth = (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return toIsoDate(d);
    })();

    // Shared Filters State
    const [dateFrom, setDateFrom] = useState(firstOfMonth);
    const [dateTo, setDateTo] = useState(today);
    const [doctorId, setDoctorId] = useState('');
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');

    // Data States
    const [insightData, setInsightData] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Initial Load & Filters Change
    useEffect(() => {
        getDoctors({ all: true })
            .then(r => setDoctors(r.data?.data || []))
            .catch(() => { });
    }, []);

    useEffect(() => {
        fetchData();
    }, [dateFrom, dateTo, doctorId, status]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = { date_from: dateFrom, date_to: dateTo };
            if (doctorId) params.doctor_id = doctorId;
            if (status) params.status = status;

            const [insightRes, reportDashRes, appointmentsRes] = await Promise.all([
                getPracticeInsights(params).catch(() => ({ data: { data: {} } })),
                getReportsDashboard(params).catch(() => ({ data: { data: {} } })),
                getAppointmentsReport(params).catch(() => ({ data: { data: [] } }))
            ]);

            const insights = insightRes.data?.data || {};
            const summary = reportDashRes.data?.data || {};

            setInsightData({
                ...insights,
                metrics: {
                    ...insights.metrics,
                    ...summary
                }
            });
            setAppointments(appointmentsRes.data?.data || []);
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError('Failed to load practice data. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const derived = useMemo(() => {
        const stats = {
            total: appointments.length,
            completed: 0,
            cancelled: 0,
            no_show: 0,
            uniquePatients: new Set(),
            categories: {},
            docVisits: {}
        };

        appointments.forEach(a => {
            const s = (a.status || '').toUpperCase();
            if (s === 'COMPLETED') stats.completed++;
            if (s === 'CANCELLED') stats.cancelled++;
            if (s === 'NO_SHOW') stats.no_show++;

            if (a.patient_id) stats.uniquePatients.add(a.patient_id);

            const cat = a.visit_category || 'General';
            stats.categories[cat] = (stats.categories[cat] || 0) + 1;

            const dName = a.doctor_name || 'Unassigned';
            if (!stats.docVisits[dName]) {
                stats.docVisits[dName] = { name: dName, count: 0, role: 'Medical Professional' };
            }
            stats.docVisits[dName].count++;
        });

        return {
            ...stats,
            uniquePatientsCount: stats.uniquePatients.size,
            docVisitsArray: Object.values(stats.docVisits).sort((a, b) => b.count - a.count)
        };
    }, [appointments]);

    const displayMetrics = {
        total: insightData?.metrics?.total_appointments || derived.total,
        completed: insightData?.metrics?.completed || derived.completed,
        cancelled: insightData?.metrics?.cancelled || derived.cancelled,
        no_show: insightData?.metrics?.no_show || derived.no_show,
        unique: insightData?.metrics?.unique_patients || derived.uniquePatientsCount,
        doctors: (insightData?.metrics?.doctor_visits && insightData.metrics.doctor_visits.length > 0) ? insightData.metrics.doctor_visits : derived.docVisitsArray,
        categories: (insightData?.metrics?.categories && Object.keys(insightData.metrics.categories).length > 0) ? insightData.metrics.categories : derived.categories,
        trends: insightData?.metrics?.trends || [0, 0, 0, 0]
    };

    const completionRate = displayMetrics.total ? Math.round((displayMetrics.completed / displayMetrics.total) * 100) : 0;

    const exportCSV = () => {
        const headers = ['Date', 'Patient', 'Patient ID', 'Mobile', 'Doctor', 'Token / Time', 'Status', 'Visit Type', 'Source'];
        const rows = filteredAppointments.map(a => [
            a.date || '',
            a.child_name || a.patient_name || '',
            a.patient_id || '',
            a.patient_mobile || '***',
            a.doctor_name || '',
            a.token_display || a.appointment_time || '—',
            a.status || '',
            a.visit_category || '',
            a.booking_source || ''
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `practice_report_${dateFrom}_to_${dateTo}.csv`;
        a.click();
    };

    const formatDateReadable = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const filteredAppointments = appointments.filter(a => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            (a.child_name || '').toLowerCase().includes(q) ||
            (a.patient_name || '').toLowerCase().includes(q) ||
            (a.patient_id || '').toLowerCase().includes(q) ||
            (a.doctor_name || '').toLowerCase().includes(q)
        );
    });

    const getStatusStyle = (s) => {
        const status = (s || '').toUpperCase();
        if (status === 'COMPLETED') return { bg: '#d1fae5', color: '#16a34a' };
        if (status === 'CANCELLED') return { bg: '#fee2e2', color: '#ef4444' };
        if (status === 'NO_SHOW') return { bg: '#fef3c7', color: '#d97706' };
        return { bg: '#eff6ff', color: '#3b82f6' };
    };

    return (
        <div className="analytics-container">
            <div className="analytics-top-bar">
                <h1>Reports & Analytics</h1>
                <div className="analytics-actions">
                    <button className="btn-analytics-refresh" onClick={fetchData}>
                        <RefreshCw size={14} />
                        <span>Refresh</span>
                    </button>
                    <button className="btn-analytics-export" onClick={exportCSV}>
                        <Download size={14} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            <div className="analytics-stats-row">
                {[
                    { label: 'Total Appointments', value: displayMetrics.total, icon: Calendar, color: '#4f46e5', bg: '#eef2ff' },
                    { label: 'Completed', value: displayMetrics.completed, icon: Users, color: '#10b981', bg: '#ecfdf5' },
                    { label: 'Cancelled', value: displayMetrics.cancelled, icon: Users, color: '#ef4444', bg: '#fef2f2' },
                    { label: 'No Shows', value: displayMetrics.no_show, icon: FileText, color: '#f59e0b', bg: '#fffbeb' },
                    { label: 'Unique Patients', value: displayMetrics.unique, icon: Hash, color: '#06b6d4', bg: '#ecfeff' },
                    { label: 'Completion Rate', value: `${completionRate}%`, icon: TrendingUp, color: '#8b5cf6', bg: '#f5f3ff' }
                ].map((stat, i) => (
                    <div key={i} className="stat-box-premium">
                        <div className="stat-icon-wrap" style={{ background: stat.bg, color: stat.color }}>
                            <stat.icon size={20} />
                        </div>
                        <div className="stat-label-v4">{stat.label}</div>
                        <div className="stat-val-v4">{loading ? '...' : stat.value.toLocaleString()}</div>
                    </div>
                ))}
            </div>

            <div className="analytics-main-grid">
                <div className="analytics-card-white">
                    <div className="card-title-v4">
                        <span>Appointment Trends (Last 30 Days)</span>
                        <select
                            value={doctorId}
                            onChange={e => setDoctorId(e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 600, color: '#64748b', outline: 'none', background: '#fff' }}
                        >
                            <option value="">All Doctors</option>
                            {doctors.map(d => <option key={d.doctor_id || d._id} value={d.doctor_id || d._id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div style={{ height: '260px', position: 'relative', marginTop: '1rem' }}>
                        <svg viewBox="0 0 800 240" style={{ width: '100%', height: '100%' }}>
                            <g stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4,4">
                                {[40, 80, 120, 160, 200].map(y => <line key={y} x1="0" y1={y} x2="800" y2={y} />)}
                            </g>
                            {(() => {
                                const maxTrend = Math.max(...displayMetrics.trends, 10);
                                const getY = v => 220 - (v / maxTrend) * 160;
                                const pts = [
                                    { x: 100, y: getY(displayMetrics.trends[0]) },
                                    { x: 300, y: getY(displayMetrics.trends[1]) },
                                    { x: 500, y: getY(displayMetrics.trends[2]) },
                                    { x: 700, y: getY(displayMetrics.trends[3]) }
                                ];
                                return (
                                    <>
                                        <path d={`M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y} L ${pts[2].x} ${pts[2].y} L ${pts[3].x} ${pts[3].y}`} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
                                        {pts.map((p, i) => (
                                            <circle key={i} cx={p.x} cy={p.y} r="5" fill="#fff" stroke="#6366f1" strokeWidth="2" />
                                        ))}
                                    </>
                                );
                            })()}
                            <g style={{ fontSize: '12px', fill: '#94a3b8', fontWeight: 600 }}>
                                <text x="100" y="235" textAnchor="middle">Week 1</text>
                                <text x="300" y="235" textAnchor="middle">Week 2</text>
                                <text x="500" y="235" textAnchor="middle">Week 3</text>
                                <text x="700" y="235" textAnchor="middle">Week 4</text>
                            </g>
                        </svg>
                    </div>
                </div>

                <div className="analytics-card-white">
                    <div className="card-title-v4">Visit Type Distribution</div>
                    <div style={{ position: 'relative', width: '180px', height: '180px', margin: '2rem auto' }}>
                        <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                            {(() => {
                                const total = Math.max(Object.values(displayMetrics.categories).reduce((a, b) => a + b, 0), 1);
                                let currentOffset = 0;
                                const colors = ['#60a5fa', '#a855f7', '#6366f1', '#f43f5e', '#10b981', '#f59e0b'];
                                return Object.entries(displayMetrics.categories).map(([name, count], idx) => {
                                    const percent = (count / total) * 100;
                                    const c = (
                                        <circle
                                            key={idx} cx="18" cy="18" r="15.5" fill="none"
                                            stroke={colors[idx % colors.length]} strokeWidth="4"
                                            strokeDasharray={`${percent}, 100`}
                                            strokeDashoffset={`-${currentOffset}`}
                                        />
                                    );
                                    currentOffset += percent;
                                    return c;
                                });
                            })()}
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>Total Visits</span>
                            <span style={{ fontSize: '20px', fontWeight: 850, color: '#1e293b' }}>{displayMetrics.total}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem' }}>
                        {Object.entries(displayMetrics.categories).map(([name, count], idx) => {
                            const colors = ['#60a5fa', '#a855f7', '#6366f1', '#f43f5e', '#10b981', '#f59e0b'];
                            return (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', fontSize: '13px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[idx % colors.length] }}></div>
                                        <span style={{ fontWeight: 800, color: '#1e293b' }}>{count}</span>
                                        <span style={{ color: '#64748b', fontWeight: 600 }}>{name}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="analytics-card-white">
                <div className="card-title-v4">Visits per Doctor</div>
                <div className="doc-snapshot-grid">
                    {displayMetrics.doctors.slice(0, 4).map((doc, i) => (
                        <div key={i} className="doc-mini-card">
                            <div className="doc-mini-avatar">
                                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name || 'Doc')}&background=EEF2FF&color=4F46E5&bold=true`} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div className="doc-mini-info">
                                <h4>{doc.name}</h4>
                                <p>{doc.role || doc.speciality || 'Pediatrician'}</p>
                                <div className="doc-mini-count"><strong>{doc.count || doc.visits || 0}</strong> Bookings</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
