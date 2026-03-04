import React, { useState, useEffect, useCallback } from 'react';
import {
    Monitor, RefreshCw, CheckCircle2, AlertCircle, ChevronRight,
    Clock, User, Hash, SkipForward, RotateCcw, ExternalLink,
    Search, Filter, Zap, ArrowRight, Check, X
} from 'lucide-react';
import {
    getDoctors, getDailyTokens, getClinicDisplayData,
    nextToken, checkInToken, updateTokenStatus, autoReschedule, bookAppointmentWithToken,
    getTokenStatus,
    toIsoDate
} from '../api/index';

const STATUS_CONFIG = {
    WAITING: { color: '#f59e0b', bg: '#fef3c7', label: 'Waiting' },
    CHECKED_IN: { color: '#6366f1', bg: '#eef2ff', label: 'Checked In' },
    IN_PROGRESS: { color: '#0ea5e9', bg: '#e0f2fe', label: 'In Progress' },
    COMPLETED: { color: '#10b981', bg: '#d1fae5', label: 'Completed' },
    SKIPPED: { color: '#94a3b8', bg: '#f1f5f9', label: 'Skipped' },
    NO_SHOW: { color: '#ef4444', bg: '#fee2e2', label: 'No Show' },
};

const StatBadge = ({ label, value, color, isActive, onClick }) => (
    <div
        onClick={onClick}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = `0 6px 16px ${color}15`;
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = isActive ? 'translateY(-2px)' : 'none';
            e.currentTarget.style.boxShadow = isActive ? `0 4px 12px ${color}20` : 'none';
        }}
        style={{
            background: isActive ? '#fff' : '#fff',
            border: isActive ? `2px solid ${color}` : '1.5px solid #e2e8f0',
            borderRadius: '14px',
            padding: '0.75rem 1rem',
            textAlign: 'center',
            minWidth: '100px',
            flex: 1,
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isActive ? 'translateY(-2px)' : 'none',
            boxShadow: isActive ? `0 4px 12px ${color}20` : 'none',
            position: 'relative',
            overflow: 'hidden'
        }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.65rem', color: isActive ? color : '#94a3b8', fontWeight: 800, marginTop: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        {isActive && (
            <div style={{ position: 'absolute', bottom: 0, left: '25%', right: '25%', height: '3px', background: color, borderRadius: '3px 3px 0 0' }} />
        )}
    </div>
);

const TokenRow = ({ token, onCheckin, onStatusChange, onNext, isNext }) => {
    const cfg = STATUS_CONFIG[token.status] || STATUS_CONFIG.WAITING;
    return (
        <tr style={{ transition: 'all 0.2s' }}>
            <td style={{ padding: '0.6rem 1rem' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    background: isNext ? 'linear-gradient(135deg, #6366f1, #4338ca)' : '#f8fafc',
                    color: isNext ? '#fff' : '#1e293b',
                    padding: '0.3rem 0.6rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.85rem'
                }}>
                    <Hash size={12} /> {token.token}
                </div>
            </td>
            <td style={{ padding: '0.6rem 1rem' }}>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>{token.child_name || token.patient_name || '—'}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{token.patient_id || ''}</div>
                {!token.is_single_doctor && token.doctor_name && (
                    <div style={{ fontSize: '0.65rem', color: '#6366f1', fontWeight: 700, marginTop: '0.1rem', textTransform: 'uppercase' }}>
                        {token.doctor_name}
                    </div>
                )}
            </td>
            <td style={{ padding: '0.6rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>{token.slot_label || token.slot_id || '—'}</td>
            <td style={{ padding: '0.6rem 1rem' }}>
                <span style={{ background: cfg.bg, color: cfg.color, padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 700 }}>
                    {cfg.label}
                </span>
            </td>
            <td style={{ padding: '0.6rem 1rem' }}>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {/* 1. INITIAL STATE: Waiting to arrive */}
                    {token.status === 'WAITING' && (
                        <>
                            <button
                                onClick={() => token.token && onCheckin(token.token, token.doctor_id)}
                                disabled={!token.token}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1.5px solid #6366f1', background: '#fff', color: '#6366f1', cursor: 'pointer', fontWeight: 600, fontSize: '0.7rem', opacity: !token.token ? 0.5 : 1 }}>
                                <Check size={11} /> Check In
                            </button>
                            <button
                                onClick={() => token.token && onStatusChange(token.token, 'NO_SHOW', token.doctor_id)}
                                disabled={!token.token}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1.5px solid #ef4444', background: '#fff', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.7rem', opacity: !token.token ? 0.5 : 1 }}>
                                <X size={11} /> No Show
                            </button>
                        </>
                    )}

                    {/* 2. ARRIVED: Waiting for doctor */}
                    {token.status === 'CHECKED_IN' && (
                        <>
                            <button
                                onClick={() => onStatusChange(token.token, 'IN_PROGRESS', token.doctor_id)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.25rem 0.6rem', borderRadius: '6px', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.7rem' }}>
                                <ChevronRight size={11} /> Start Session
                            </button>
                            <button
                                onClick={() => onStatusChange(token.token, 'SKIPPED', token.doctor_id)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1.5px solid #94a3b8', background: '#fff', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: '0.7rem' }}>
                                <SkipForward size={11} /> Skip
                            </button>
                        </>
                    )}

                    {/* 3. IN SESSION: Patient is with doctor */}
                    {token.status === 'IN_PROGRESS' && (
                        <button
                            onClick={() => onStatusChange(token.token, 'COMPLETED', token.doctor_id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.25rem 0.6rem', borderRadius: '6px', background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.7rem' }}>
                            <CheckCircle2 size={11} /> Finish & Complete
                        </button>
                    )}

                    {/* 4. TERMINAL STATES: Completed/Missed */}
                    {(token.status === 'COMPLETED' || token.status === 'SKIPPED' || token.status === 'NO_SHOW') && (
                        <button
                            onClick={() => onStatusChange(token.token, 'WAITING', token.doctor_id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1.5px solid #94a3b8', background: '#fff', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: '0.7rem' }}>
                            <RotateCcw size={11} /> Reset to Waiting
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
};

const QueueDisplay = () => {
    const today = toIsoDate();
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [date, setDate] = useState(today);
    const [tokens, setTokens] = useState([]);
    const [displayData, setDisplayData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [searchQ, setSearchQ] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [tab, setTab] = useState('queue'); // queue | display
    const [statusSearch, setStatusSearch] = useState('');
    const [tokenStatusData, setTokenStatusData] = useState(null);
    const [checkingStatus, setCheckingStatus] = useState(false);

    const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(null), 3000); };
    const showError = (msg) => { setError(msg); setTimeout(() => setError(null), 5000); };

    useEffect(() => {
        getDoctors().then(r => {
            const list = r.data?.data || r.data?.doctors || [];
            setDoctors(list);
            // Default to empty (All Combined Doctors) instead of forcing first doctor
            setSelectedDoctor('');
        }).catch(() => { });
    }, []);

    const fetchQueue = useCallback(async () => {
        // We only require date, doctor_id can be empty for "All Combined"
        if (!date) return;
        setLoading(true);
        setError(null);
        try {
            const params = { date };
            if (selectedDoctor) params.doctor_id = selectedDoctor;

            const [tokenRes, displayRes] = await Promise.all([
                getDailyTokens(params),
                getClinicDisplayData(params)
            ]);
            setTokens(tokenRes.data?.data || []);
            const displayList = displayRes.data?.display || displayRes.data?.data || [];

            if (Array.isArray(displayList)) {
                // If we have a selected doctor, find their specific display data
                const currentDoctorDisplay = selectedDoctor
                    ? displayList.find(d => String(d.doctor_id) === String(selectedDoctor))
                    : displayList[0]; // Or some summary for "All Doctors"

                if (currentDoctorDisplay) {
                    setDisplayData({
                        ...currentDoctorDisplay,
                        current_token: currentDoctorDisplay.now_serving_token,
                        now_serving: currentDoctorDisplay.now_serving_token,
                        next_token: currentDoctorDisplay.next_token,
                        queue_length: currentDoctorDisplay.queue_length
                    });
                } else {
                    setDisplayData(null);
                }
            } else {
                setDisplayData(displayList || null);
            }
        } catch (e) {
            showError(e.response?.data?.message || 'Failed to load queue data');
        } finally {
            setLoading(false);
        }
    }, [selectedDoctor, date]);

    useEffect(() => { fetchQueue(); }, [fetchQueue]);

    const handleCheckIn = async (token, tokenDocId) => {
        try {
            const docId = tokenDocId || selectedDoctor;
            await checkInToken(token, { doctor_id: docId, date });
            showSuccess(`Token ${token} checked in`);
            fetchQueue();
        } catch (e) { showError(e.response?.data?.message || 'Check-in failed'); }
    };

    const handleStatusChange = async (token, status, tokenDocId) => {
        try {
            const docId = tokenDocId || selectedDoctor;
            await updateTokenStatus(token, { status, doctor_id: docId, date });
            showSuccess(`Token ${token} marked as ${status}`);
            fetchQueue();
        } catch (e) { showError(e.response?.data?.message || 'Status update failed'); }
    };

    const handleNextToken = async (doctorId) => {
        try {
            const r = await nextToken(doctorId, { date });
            const next = r.data?.data;
            showSuccess(`Calling token ${next?.token || '—'}`);
            fetchQueue();
        } catch (e) { showError(e.response?.data?.message || 'Failed to advance queue'); }
    };

    const handleAutoReschedule = async () => {
        try {
            await autoReschedule({ doctor_id: selectedDoctor, date });
            showSuccess('Missed tokens auto-rescheduled');
            fetchQueue();
        } catch (e) { showError(e.response?.data?.message || 'Auto-reschedule failed'); }
    };

    const handleCheckTokenStatus = async () => {
        if (!statusSearch) return;
        setCheckingStatus(true);
        setTokenStatusData(null);
        try {
            const res = await getTokenStatus(statusSearch, { doctor_id: selectedDoctor, date });
            setTokenStatusData(res.data?.data || res.data);
        } catch (e) {
            showError(e.response?.data?.message || 'Token not found');
        } finally {
            setCheckingStatus(false);
        }
    };

    const filtered = tokens.filter(t => {
        const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
        const q = searchQ.toLowerCase();
        const matchSearch = !q || (t.token?.toString().includes(q) || (t.child_name || '').toLowerCase().includes(q) || (t.patient_id || '').toLowerCase().includes(q));
        return matchStatus && matchSearch;
    });

    const stats = {
        total: tokens.length,
        waiting: tokens.filter(t => t.status === 'WAITING').length,
        checkedIn: tokens.filter(t => t.status === 'CHECKED_IN').length,
        completed: tokens.filter(t => t.status === 'COMPLETED').length,
        noShow: tokens.filter(t => t.status === 'NO_SHOW').length,
    };

    const nextPendingToken = filtered.find(t => t.status === 'WAITING' || t.status === 'CHECKED_IN');

    return (
        <div style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Queue Tokens</h1>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <a href="/clinic-display" target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '8px', background: '#fff', border: '1.5px solid #e2e8f0', color: '#64748b', textDecoration: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
                        <Monitor size={14} /> Display Board <ExternalLink size={10} />
                    </a>
                    <button onClick={handleAutoReschedule}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '8px', background: '#fff', border: '1.5px solid #f59e0b', color: '#f59e0b', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}>
                        <RotateCcw size={14} /> Auto-Reschedule
                    </button>
                    <button onClick={fetchQueue}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #4338ca)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}>
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: '160px' }}>
                    <Filter size={14} color="#94a3b8" />
                    <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}
                        style={{ border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: '#1e293b', background: '#fff', flex: 1 }}>
                        <option value="" key="all-doc-combined">All Combined Doctors</option>
                        {doctors.map(d => <option key={d.doctor_id || d._id} value={d.doctor_id || d._id}>{d.name || d.full_name}</option>)}
                    </select>
                </div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    style={{ border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: '#1e293b' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: '160px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '0 0.6rem' }}>
                    <Search size={14} color="#94a3b8" />
                    <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search token, patient..."
                        style={{ border: 'none', background: 'transparent', padding: '0.4rem 0', fontSize: '0.8rem', outline: 'none', width: '100%' }} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    style={{ border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: '#1e293b', background: '#fff' }}>
                    <option value="ALL">All Statuses</option>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '6px', borderLeft: '1px solid #e2e8f0', paddingLeft: '0.75rem' }}>
                    <input
                        value={statusSearch}
                        onChange={e => setStatusSearch(e.target.value)}
                        placeholder="Token #..."
                        style={{ border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '0.35rem 0.5rem', fontSize: '0.75rem', width: '70px', outline: 'none' }}
                    />
                    <button
                        onClick={handleCheckTokenStatus}
                        disabled={checkingStatus}
                        style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                    >
                        {checkingStatus ? '...' : <Zap size={12} />}
                    </button>
                </div>
            </div>

            {/* Token Status Result */}
            {tokenStatusData && (
                <div style={{ background: '#eff6ff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #bfdbfe', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800 }}>
                            {tokenStatusData.token}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>Token Status</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e40af' }}>{tokenStatusData.status}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>Position</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e40af' }}>#{tokenStatusData.position_in_queue || '—'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>Estimated Wait</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e40af' }}>{tokenStatusData.estimated_wait || '0'}m</div>
                        </div>
                    </div>
                    <button onClick={() => setTokenStatusData(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
                </div>
            )}

            {/* Alerts */}
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '0.85rem 1.25rem', marginBottom: '1rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><AlertCircle size={18} />{error}</div>}
            {success && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '0.85rem 1.25rem', marginBottom: '1rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><CheckCircle2 size={18} />{success}</div>}

            {/* Stats */}
            <div style={{ display: 'flex', gap: '0.85rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <StatBadge label="Total" value={stats.total} color="#0f172a" isActive={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} />
                <StatBadge label="Waiting" value={stats.waiting} color="#f59e0b" isActive={statusFilter === 'WAITING'} onClick={() => setStatusFilter('WAITING')} />
                <StatBadge label="Checked In" value={stats.checkedIn} color="#6366f1" isActive={statusFilter === 'CHECKED_IN'} onClick={() => setStatusFilter('CHECKED_IN')} />
                <StatBadge label="Completed" value={stats.completed} color="#10b981" isActive={statusFilter === 'COMPLETED'} onClick={() => setStatusFilter('COMPLETED')} />
                <StatBadge label="No Show" value={stats.noShow} color="#ef4444" isActive={statusFilter === 'NO_SHOW'} onClick={() => setStatusFilter('NO_SHOW')} />
            </div>

            {/* Display board data */}
            {displayData && (
                <div style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)', borderRadius: '20px', padding: '1.25rem 1.75rem', marginBottom: '1.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <Monitor size={28} style={{ opacity: 0.8 }} />
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Now Serving</div>
                        <div style={{ fontSize: '2rem', fontWeight: 900 }}>
                            {displayData.current_token || displayData.now_serving || '—'}
                        </div>
                    </div>
                    {displayData.next_token && (
                        <>
                            <ArrowRight size={20} style={{ opacity: 0.5 }} />
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Up Next</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{displayData.next_token}</div>
                            </div>
                        </>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '1.5rem' }}>
                        {displayData.queue_length !== undefined && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{displayData.queue_length}</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.75, fontWeight: 600 }}>In Queue</div>
                            </div>
                        )}
                        {displayData.estimated_wait !== undefined && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{displayData.estimated_wait}m</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.75, fontWeight: 600 }}>Est. Wait</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                        <Hash size={16} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle', color: '#6366f1' }} />
                        Token List — {filtered.length} records
                    </h3>
                </div>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
                        <p style={{ fontSize: '0.8rem' }}>Loading queue...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        <Hash size={32} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                        <p style={{ fontWeight: 600, fontSize: '0.8rem' }}>No tokens found</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Token</th>
                                    <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Patient</th>
                                    <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Slot</th>
                                    <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
                                    <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(token => (
                                    <TokenRow
                                        key={token.appointment_id || token._id || `${token.doctor_id}-${token.token}`}
                                        token={{ ...token, is_single_doctor: !!selectedDoctor }}
                                        onCheckin={handleCheckIn}
                                        onStatusChange={handleStatusChange}
                                        onNext={handleNextToken}
                                        isNext={nextPendingToken?.token === token.token}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                tr:hover td { background: #f8faff !important; }
            `}</style>
        </div>
    );
};

export default QueueDisplay;
