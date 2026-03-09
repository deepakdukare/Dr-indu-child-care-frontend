import React, { useState, useEffect } from 'react';
import {
    Users,
    Calendar,
    CheckCircle,
    Clock,
    Search,
    Plus,
    FileText,
    MessageSquare,
    Bell,
    ChevronRight,
    RefreshCw,
    AlertCircle,
    Activity,
    Shield,
    TrendingUp,
    Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { removeSalutation } from '../utils/formatters';
import {
    getSystemHealth,
    getAppointmentsByDate,
    getAppointmentStats,
    getPatients,
    getUnregisteredInteractions,
    getPendingMessages,
    getNotifications,
    toIsoDate
} from '../api/index';
import { hasPermission } from '../utils/auth';

const StatCard = ({ title, value, subtitle, icon: Icon, color, loading, trend }) => (
    <div className="stat-card-premium">
        <div className="stat-card-inner">
            <div className="stat-icon-premium" style={{
                background: `linear-gradient(135deg, ${color}15 0%, ${color}30 100%)`,
                color: color
            }}>
                <Icon size={24} />
            </div>
            <div className="stat-content">
                <div className="stat-value-premium">
                    {loading ? <div className="skeleton-pulse skeleton-pulse-value"></div> : value}
                </div>
                <div className="stat-label-premium">{title}</div>
            </div>
            {trend && (
                <div className="stat-trend" style={{ color: trend > 0 ? '#10b981' : '#64748b' }}>
                    <TrendingUp size={14} />
                    <span>{trend}%</span>
                </div>
            )}
        </div>
        {!loading && <div className="stat-subtitle-premium">{subtitle}</div>}
    </div>
);

const QuickAction = ({ label, icon, to, color, description }) => (
    <Link to={to} className="action-card-premium">
        <div className="action-icon-premium" style={{ color }}>{icon}</div>
        <div className="action-info-premium">
            <span className="action-label-premium">{label}</span>
            <span className="action-desc-premium">{description}</span>
        </div>
        <ChevronRight size={18} className="action-arrow" />
    </Link>
);

const AlertItem = ({ title, desc, icon: Icon, color, badge }) => (
    <div className="alert-item-premium">
        <div className="alert-icon-wrap-premium" style={{ background: `${color}10`, color }}>
            <Icon size={20} />
        </div>
        <div className="alert-content-premium">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="alert-title-premium">{title}</span>
                {badge && <span className="alert-badge-premium" style={{ background: color === '#e11d48' ? 'rgba(225, 29, 72, 0.1)' : 'rgba(99, 102, 241, 0.1)', color }}>{badge}</span>}
            </div>
            <div className="alert-desc-premium">{desc}</div>
        </div>
    </div>
);

const Dashboard = () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const apiDate = toIsoDate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [activeTab, setActiveTab] = useState('Today');

    const [data, setData] = useState({
        stats: { totalPatients: 0, todayVisits: 0, completed: 0, pending: 0 },
        appointments: [],
        botInteractions: 0,
        pendingReminders: 0,
        escalations: 0,
        systemStatus: 'Healthy'
    });

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [
                statsRes,
                apptRes,
                patientRes,
                botRes,
                pendingMessagesRes,
                healthRes,
                notificationsRes
            ] = await Promise.all([
                getAppointmentStats(apiDate),
                getAppointmentsByDate(apiDate),
                getPatients({ limit: 1 }),
                getUnregisteredInteractions(),
                getPendingMessages(),
                getSystemHealth(),
                getNotifications().catch(() => ({ data: { data: [] } }))
            ]);

            const stats = statsRes.data?.data || {};
            const appts = apptRes.data?.data || [];

            const notifications = notificationsRes.data?.data || [];
            const escalationCount = notifications.filter((item) => {
                if (item?.is_read) return false;
                const text = `${item?.title || ''} ${item?.message || ''} ${item?.type || ''}`.toLowerCase();
                return text.includes('escalat') || text.includes('urgent') || text.includes('critical');
            }).length;

            setData({
                stats: {
                    totalPatients: patientRes.data?.total || 0,
                    todayVisits: stats.total_today || appts.length,
                    completed: stats.completed || appts.filter(a => a.status === 'COMPLETED').length,
                    pending: stats.pending || appts.filter(a => a.status === 'CONFIRMED').length,
                },
                appointments: appts,
                botInteractions: botRes.data?.data?.length || 0,
                pendingReminders: pendingMessagesRes.data?.data?.length || 0,
                escalations: escalationCount,
                systemStatus: healthRes.data?.database === 'connected' ? 'Healthy' : 'Degraded'
            });
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (err) {
            console.error('Dashboard Load Error:', err);
            setError("Failed to sync live data. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatVisitType = (type) => {
        if (!type) return 'First visit';
        return String(type)
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
            .replace('Follow Up', 'Follow-up');
    };

    return (
        <div className="dashboard-page-v2">
            <div className="header-section-premium">
                <div className="header-content-premium">
                    <h1 className="header-title-premium">Dashboard</h1>
                    <div className="live-pill-premium">
                        <span className="live-dot"></span>
                        <span className="live-text">Live • {dateStr}</span>
                    </div>
                </div>
                <div className="header-actions-premium">
                    <button onClick={fetchData} className="refresh-btn-premium" title="Refresh Data">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-banner-premium">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="error-close-btn">×</button>
                </div>
            )}

            <div className="dashboard-grid-v2">
                <div className="main-content-v2">
                    <div className="stats-grid-v2">
                        {hasPermission('view_patients') && <StatCard title="Total Patients" value={data.stats.totalPatients} subtitle="Active registry profiles" icon={Users} color="#6366f1" loading={loading} />}
                        {hasPermission('view_appointments') && <StatCard title="Today's Visits" value={data.stats.todayVisits} subtitle="Checked-in today" icon={Calendar} color="#0ea5e9" loading={loading} />}
                        <StatCard title="Completed" value={data.stats.completed} subtitle="Sessions concluded" icon={CheckCircle} color="#10b981" loading={loading} />
                        <StatCard title="Pending" value={data.stats.pending} subtitle="Awaiting consultation" icon={Clock} color="#f59e0b" loading={loading} />
                    </div>

                    <div className="card-premium-v2 appointments-card">
                        <div className="card-header-premium">
                            <div className="card-title-group">
                                <h3 className="card-title-premium">
                                    <FileText size={20} />
                                    <span>Appointments Schedule</span>
                                </h3>
                            </div>
                            <Link to="/appointments" className="add-btn-premium">
                                <Plus size={18} />
                                <span>Book Visit</span>
                            </Link>
                        </div>

                        {loading ? (
                            <div className="loader-container-premium">
                                <div className="loader-bars">
                                    <span></span><span></span><span></span>
                                </div>
                                <p>Syncing schedule...</p>
                            </div>
                        ) : data.appointments.length === 0 ? (
                            <div className="empty-state-premium-v2">
                                <div className="empty-icon-motion">
                                    <div className="ring-pulse"></div>
                                    <Calendar size={48} />
                                </div>
                                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.75rem' }}>No appointments today</h4>
                                <p style={{ color: '#64748b', maxWidth: '300px', margin: '0 auto 2rem', fontWeight: 500, lineHeight: 1.5 }}>
                                    The schedule is currently open. New bookings will appear here instantly.
                                </p>
                                <Link to="/appointments" className="book-first-btn-premium">
                                    <Plus size={20} />
                                    <span>Book First Patient</span>
                                </Link>
                            </div>
                        ) : (
                            <div className="table-wrapper-premium">
                                <table className="table-premium-v2">
                                    <thead>
                                        <tr>
                                            <th>Scheduled Time</th>
                                            <th>Patient Name</th>
                                            <th>Doctor</th>
                                            <th>Category</th>
                                            <th>Source</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.appointments.map(appt => (
                                            <tr key={appt.appointment_id} className="row-hover-premium">
                                                <td className="slot-cell-premium">
                                                    <div className="time-pill">
                                                        {appt.token_display && <span className="token-ref">{appt.token_display} • </span>}
                                                        {appt.appointment_time || 'TBD'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="patient-name-premium">{removeSalutation(appt.child_name) || 'Walk-in'}</div>
                                                    <div className="patient-id-premium">
                                                        {appt.patient_id || 'TEMP-ID'}
                                                        {hasPermission('view_patient_mobile') && appt.parent_mobile && <span className="patient-phone-premium"> • {appt.parent_mobile}</span>}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="doctor-name-premium">{appt.doctor_name || 'Not Assigned'}</div>
                                                </td>
                                                <td>
                                                    <span className="category-pill-premium">{formatVisitType(appt.visit_category)}</span>
                                                </td>
                                                <td className="source-cell-premium">
                                                    <span className="source-tag">{appt.booking_source}</span>
                                                </td>
                                                <td>
                                                    <span className={`status-pill-v2 ${appt.status.toLowerCase()}`}>
                                                        {appt.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="sidebar-content-v2">
                    <div className="sidebar-section-premium">
                        <h4 className="sidebar-title-premium">Quick Actions</h4>
                        <div className="actions-stack-premium">
                            {hasPermission('view_patients') && <QuickAction label="Enroll Patient" description="Add new medical profile" icon="👶" to="/patients" color="#6366f1" />}
                            {hasPermission('view_appointments') && <QuickAction label="Book Appointment" description="Schedule a new session" icon="📅" to="/appointments" color="#0ea5e9" />}
                            {hasPermission('view_mrd') && <QuickAction label="Medical Records" description="Access patient history" icon="🗂️" to="/mrd" color="#10b981" />}
                        </div>
                    </div>

                    <div className="sidebar-section-premium">
                        <div className="sidebar-header-row">
                            <h4 className="sidebar-title-premium">Live Monitoring</h4>
                            <div className="pulse-indicator"></div>
                        </div>
                        <div className="alerts-stack-premium">
                            {hasPermission('view_bot_hub') && (
                                <AlertItem
                                    title="Bot Interactions"
                                    desc={`${data.botInteractions} new unregistered inquiries`}
                                    icon={MessageSquare}
                                    color="#6366f1"
                                    badge={data.botInteractions > 0 ? "New" : null}
                                />
                            )}
                            {data.escalations > 0 && (
                                <AlertItem
                                    title="Urgent Escalations"
                                    desc={`${data.escalations} human support requests`}
                                    icon={AlertCircle}
                                    color="#e11d48"
                                    badge="Critical"
                                />
                            )}
                            <AlertItem
                                title="Pending SMS"
                                desc={`${data.pendingReminders} reminders to be sent`}
                                icon={Zap}
                                color="#f59e0b"
                            />
                            <AlertItem
                                title="Clinic Engine"
                                desc={data.systemStatus === 'Healthy' ? "All systems operational" : "Connection sluggish"}
                                icon={Shield}
                                color={data.systemStatus === 'Healthy' ? "#10b981" : "#e11d48"}
                            />
                        </div>
                    </div>

                    <div className="system-health-premium">
                        <div className="health-stats-premium">
                            <div className="health-stat-premium">
                                <span>API Latency</span>
                                <strong>124ms</strong>
                            </div>
                            <div className="health-divider"></div>
                            <div className="health-stat-premium">
                                <span>Uptime</span>
                                <strong>99.9%</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default Dashboard;
