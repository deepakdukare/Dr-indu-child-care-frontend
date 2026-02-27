import React, { useState, useEffect, useCallback } from 'react';
import {
    RefreshCw, Calendar as CalIcon, ChevronLeft, ChevronRight,
    Sun, Coffee, Moon, Shield, User, Plus, Trash2, Check, X,
    CheckCircle2, AlertTriangle, Clock, Zap
} from 'lucide-react';
import {
    getSlotConfig, createSlot, deleteSlot, updateSlotConfig,
    getDailyStatus, updateDailySlot, getDoctors, getAppointmentStats
} from '../api/index';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SESSION_OPTIONS = [
    { id: 'MORNING', label: 'Morning', icon: <Sun size={14} />, color: '#f59e0b' },
    { id: 'AFTERNOON', label: 'Afternoon', icon: <Coffee size={14} />, color: '#0ea5e9' },
    { id: 'EVENING', label: 'Evening', icon: <Moon size={14} />, color: '#8b5cf6' },
];

const fmt12 = (t = '') => {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
};

const todayStr = () => new Date().toISOString().split('T')[0];

// ─── Slot Cell ─────────────────────────────────────────────────────────────
// Status is driven ONLY by the live doctor-specific API data (getDailyStatus)
// The weekly template's available_days is only used in the Template Editor tab
const SlotCell = ({ slot, date, cellData, onCellClick }) => {
    // No data returned by API for this doctor+date+slot → not configured
    if (!cellData) {
        return (
            <div className="slot-cell sc-none" title={`${slot.slot_label} — Not available`}>
                <span className="sc-label">—</span>
            </div>
        );
    }

    let status = 'available';
    if (cellData.is_booked) status = 'booked';
    else if (cellData.blocked_by_admin) status = 'blocked';

    const labels = { available: 'OPEN', booked: 'BOOKED', blocked: 'BLOCKED' };

    return (
        <div
            className={`slot-cell sc-${status}`}
            onClick={() => onCellClick({ slot, date, cellData, status })}
            title={`${slot.slot_label} — ${status.toUpperCase()}`}
        >
            <span className="sc-label">{labels[status]}</span>
            {status === 'booked' && cellData?.patient_name && (
                <span className="sc-patient">{cellData.patient_name.split(' ')[0]}</span>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Scheduling = () => {
    // Core data
    const [slots, setSlots] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [dailyStatusGrid, setDailyStatusGrid] = useState({});
    const [kpis, setKpis] = useState({ booked: 0, available: 0, blocked: 0 });

    // UI state
    const [loading, setLoading] = useState(true);
    const [statusLoading, setStatusLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [activeTab, setActiveTab] = useState('template'); // 'template' | 'add' | 'override'

    // Week navigation
    const [weekStart, setWeekStart] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        return d.toISOString().split('T')[0];
    });

    // Modal
    const [cellModal, setCellModal] = useState({ show: false, slot: null, date: null, cellData: null, status: null });

    // Generator state
    const [generator, setGenerator] = useState({ start: '09:00', end: '12:00', duration: 30, session: 'MORNING' });
    const [previewSlots, setPreviewSlots] = useState([]);

    // Manual add form
    const [manualForm, setManualForm] = useState({ slot_label: '', start_time: '', end_time: '', session: 'MORNING' });

    // Daily override form
    const [overrideForm, setOverrideForm] = useState({ date: todayStr(), slot_id: '', action: 'block' });

    // Derived
    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d.toISOString().split('T')[0];
    });

    const dateLabel = (ds) => new Date(ds).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

    // ─── Data Loaders ──────────────────────────────────────────────────────────
    const loadInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [slotsRes, docsRes] = await Promise.all([getSlotConfig(), getDoctors()]);
            const masterSlots = (slotsRes.data.data || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            setSlots(masterSlots);
            const docs = docsRes.data.data || [];
            setDoctors(docs);
            if (docs.length > 0 && !selectedDoctor) {
                setSelectedDoctor(docs[0]);
            }
        } catch (err) {
            setError('Failed to initialize scheduling registry.');
        } finally {
            setLoading(false);
        }
    }, [selectedDoctor]);

    const loadWeeklyStatus = useCallback(async () => {
        if (!selectedDoctor) return;
        setStatusLoading(true);
        try {
            const results = await Promise.all(
                weekDates.map(date =>
                    getDailyStatus(selectedDoctor.doctor_id, date).catch(() => ({ data: { data: [] } }))
                )
            );
            const grid = {};
            let tBooked = 0, tBlocked = 0, tTotal = 0;
            results.forEach((res, i) => {
                const dateStr = weekDates[i];
                (res.data?.data || []).forEach(s => {
                    if (!grid[s.slot_id]) grid[s.slot_id] = {};
                    grid[s.slot_id][dateStr] = s;
                    tTotal++;
                    if (s.is_booked) tBooked++;
                    if (s.blocked_by_admin) tBlocked++;
                });
            });
            setDailyStatusGrid(grid);
            setKpis({ booked: tBooked, blocked: tBlocked, available: tTotal - tBooked - tBlocked });
        } catch {
            setError('Live grid sync failed.');
        } finally {
            setStatusLoading(false);
        }
    }, [selectedDoctor, weekStart]);

    useEffect(() => { loadInitialData(); }, []);
    useEffect(() => { loadWeeklyStatus(); }, [loadWeeklyStatus]);

    // ─── Actions ───────────────────────────────────────────────────────────────
    const shiftWeek = dir => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + dir * 7);
        setWeekStart(d.toISOString().split('T')[0]);
    };

    const handleToggleDay = (slotId, dayIndex) => {
        const dayName = DAYS[dayIndex];
        setSlots(prev => prev.map(s => {
            if (s.slot_id !== slotId) return s;
            const days = s.available_days || [];
            return {
                ...s,
                available_days: days.includes(dayName)
                    ? days.filter(d => d !== dayName)
                    : [...days, dayName]
            };
        }));
    };

    const saveTemplate = async () => {
        setLoading(true);
        try {
            await updateSlotConfig(slots);
            showSuccess('Weekly template saved.');
            loadWeeklyStatus();
        } catch {
            setError('Template save failed.');
        } finally {
            setLoading(false);
        }
    };

    const purgeSlot = async (id) => {
        if (!window.confirm('Permanently delete this slot template?')) return;
        try {
            await deleteSlot(id);
            setSlots(prev => prev.filter(s => s.slot_id !== id));
            showSuccess('Slot deleted.');
        } catch {
            setError('Delete failed.');
        }
    };

    const handleManualAdd = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createSlot({ ...manualForm, available_days: DAYS });
            setManualForm({ slot_label: '', start_time: '', end_time: '', session: 'MORNING' });
            await loadInitialData();
            showSuccess('Slot added to registry.');
        } catch {
            setError('Failed to add slot.');
        } finally {
            setLoading(false);
        }
    };

    const generateSlots = () => {
        const generated = [];
        let current = new Date(`2000-01-01T${generator.start}`);
        const end = new Date(`2000-01-01T${generator.end}`);
        while (current < end) {
            const startStr = current.toTimeString().slice(0, 5);
            current.setMinutes(current.getMinutes() + parseInt(generator.duration));
            const endStr = current.toTimeString().slice(0, 5);
            if (current > end) break;
            generated.push({ slot_label: fmt12(startStr), start_time: startStr, end_time: endStr, session: generator.session, sort_order: generated.length + 1, available_days: DAYS });
        }
        setPreviewSlots(generated);
    };

    const saveGeneratedSlots = async () => {
        setLoading(true);
        try {
            await Promise.all(previewSlots.map(s => createSlot(s)));
            setPreviewSlots([]);
            await loadInitialData();
            showSuccess(`${previewSlots.length} slots saved to weekly template.`);
        } catch {
            setError('Bulk save failed.');
        } finally {
            setLoading(false);
        }
    };

    const applyOverride = async () => {
        if (!overrideForm.slot_id || !overrideForm.date) {
            setError('Please select a date and slot.');
            return;
        }
        try {
            await updateDailySlot({
                slot_id: overrideForm.slot_id,
                date: overrideForm.date,
                action: overrideForm.action,
                doctor_id: selectedDoctor?.doctor_id
            });
            showSuccess(`Override applied: ${overrideForm.action.toUpperCase()}`);
            loadWeeklyStatus();
        } catch {
            setError('Override failed.');
        }
    };

    const handleCellAction = async (action) => {
        if (!cellModal.slot || !cellModal.date) return;
        try {
            await updateDailySlot({ slot_id: cellModal.slot.slot_id, date: cellModal.date, action, doctor_id: selectedDoctor?.doctor_id });
            showSuccess(`Slot ${action}ed successfully.`);
            setCellModal({ show: false });
            loadWeeklyStatus();
        } catch {
            setError('Action failed.');
        }
    };

    const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(null), 3500); };

    // ─── Render ────────────────────────────────────────────────────────────────
    if (loading && slots.length === 0) {
        return (
            <div className="sch-loading-screen">
                <RefreshCw size={32} className="sch-spin" />
                <p>Loading Clinical Scheduling Matrix...</p>
            </div>
        );
    }

    return (
        <div className="sch-page">

            {/* ── SECTION 1: HEADER ─────────────────────────────────────────── */}
            <header className="sch-header">
                <div className="sch-header-left">
                    <div className="sch-chip"><Shield size={14} /><span>Clinic Admin</span></div>
                    <div className="sch-title-block">
                        <h1 className="sch-title">Clinical Scheduling</h1>
                        <p className="sch-subtitle">Clinical Matrix &amp; Slot Management</p>
                    </div>
                </div>

                <div className="sch-header-center">
                    <div className="sch-date-range">
                        <button className="sch-nav-btn" onClick={() => shiftWeek(-1)}><ChevronLeft size={18} /></button>
                        <div className="sch-date-display">
                            <CalIcon size={16} />
                            <span>{dateLabel(weekDates[0])} – {new Date(weekDates[6]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <button className="sch-nav-btn" onClick={() => shiftWeek(1)}><ChevronRight size={18} /></button>
                    </div>
                    <div className="sch-doctor-select-wrap">
                        <User size={16} className="sch-doctor-icon" />
                        <select
                            className="sch-doctor-select"
                            value={selectedDoctor?.doctor_id || ''}
                            onChange={e => setSelectedDoctor(doctors.find(d => d.doctor_id === e.target.value))}
                        >
                            <option value="">Select Practitioner...</option>
                            {doctors.map(d => (
                                <option key={d.doctor_id} value={d.doctor_id}>{d.name} ({d.doctor_id})</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="sch-header-right">
                    <div className="sch-kpi sch-kpi-green">
                        <CheckCircle2 size={18} />
                        <div>
                            <span className="sch-kpi-val">{kpis.booked}</span>
                            <span className="sch-kpi-lbl">Active Bookings</span>
                        </div>
                    </div>
                    <div className="sch-kpi sch-kpi-blue">
                        <Zap size={18} />
                        <div>
                            <span className="sch-kpi-val">{kpis.available}</span>
                            <span className="sch-kpi-lbl">Available</span>
                        </div>
                    </div>
                    <div className="sch-kpi sch-kpi-red">
                        <X size={18} />
                        <div>
                            <span className="sch-kpi-val">{kpis.blocked}</span>
                            <span className="sch-kpi-lbl">Blocked</span>
                        </div>
                    </div>
                    <button className="sch-refresh-btn" onClick={loadWeeklyStatus} disabled={statusLoading}>
                        <RefreshCw size={16} className={statusLoading ? 'sch-spin' : ''} />
                    </button>
                </div>
            </header>

            {/* Alerts */}
            {error && (
                <div className="sch-alert sch-alert-error">
                    <AlertTriangle size={18} /><span>{error}</span>
                    <button onClick={() => setError(null)}><X size={16} /></button>
                </div>
            )}
            {success && (
                <div className="sch-alert sch-alert-success">
                    <CheckCircle2 size={18} /><span>{success}</span>
                </div>
            )}

            {/* ── SECTION 2: WEEKLY SLOT GRID ───────────────────────────────── */}
            <section className="sch-grid-section">
                <div className="sch-grid-legend">
                    <span className="leg-item leg-available"><span className="leg-dot"></span>Available</span>
                    <span className="leg-item leg-booked"><span className="leg-dot"></span>Booked</span>
                    <span className="leg-item leg-blocked"><span className="leg-dot"></span>Blocked</span>
                    {statusLoading && <span className="leg-syncing"><RefreshCw size={12} className="sch-spin" /> Syncing...</span>}
                </div>

                <div className="sch-grid-wrap">
                    <table className="sch-grid-table">
                        <thead>
                            <tr>
                                <th className="sch-th-time">Time</th>
                                {DAYS_SHORT.map((day, i) => {
                                    const isToday = weekDates[i] === todayStr();
                                    return (
                                        <th key={day} className={`sch-th-day ${isToday ? 'sch-today' : ''}`}>
                                            <div className="sch-day-name">{day}</div>
                                            <div className="sch-day-num">{new Date(weekDates[i]).getDate()}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {slots.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="sch-empty-grid">
                                        No slot templates configured. Use the tabs below to add slots.
                                    </td>
                                </tr>
                            ) : (
                                slots.map(slot => (
                                    <tr key={slot.slot_id} className="sch-grid-row">
                                        <td className="sch-td-time">
                                            <strong>{fmt12(slot.start_time)}</strong>
                                            <span className="sch-td-sub">{fmt12(slot.end_time)}</span>
                                        </td>
                                        {weekDates.map(date => {
                                            const cellData = dailyStatusGrid[slot.slot_id]?.[date];
                                            return (
                                                <td key={date} className="sch-td-cell">
                                                    <SlotCell
                                                        slot={slot}
                                                        date={date}
                                                        cellData={cellData}
                                                        onCellClick={info => setCellModal({ show: true, ...info })}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ── SECTION 3: TABS / PANELS ──────────────────────────────────── */}
            <section className="sch-tabs-section">
                <nav className="sch-tab-nav">
                    {[
                        { id: 'template', label: 'Weekly Template' },
                        { id: 'add', label: 'Add Slots' },
                        { id: 'override', label: 'Daily Overrides' },
                    ].map(t => (
                        <button
                            key={t.id}
                            className={`sch-tab-btn ${activeTab === t.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(t.id)}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>

                <div className="sch-tab-body">

                    {/* TAB 1: Weekly Template */}
                    {activeTab === 'template' && (
                        <div className="sch-template-panel">
                            <div className="sch-panel-toolbar">
                                <div>
                                    <h3 className="sch-panel-title">Weekly Template Editor</h3>
                                    <p className="sch-panel-sub">Toggle day availability for each recurring time slot</p>
                                </div>
                                <button className="sch-btn-primary" onClick={saveTemplate} disabled={loading}>
                                    <Check size={16} />
                                    <span>Save Template</span>
                                </button>
                            </div>
                            <div className="sch-tpl-table-wrap">
                                <table className="sch-tpl-table">
                                    <thead>
                                        <tr>
                                            <th className="tpl-th-time">Time Slot</th>
                                            <th>Session</th>
                                            {DAYS_SHORT.map(d => <th key={d}>{d}</th>)}
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {slots.map(slot => (
                                            <tr key={slot.slot_id} className="tpl-row">
                                                <td className="tpl-td-time">
                                                    <Clock size={14} />
                                                    <span>{fmt12(slot.start_time)} – {fmt12(slot.end_time)}</span>
                                                </td>
                                                <td>
                                                    <span className={`tpl-session-tag tpl-${slot.session?.toLowerCase()}`}>
                                                        {slot.session || 'N/A'}
                                                    </span>
                                                </td>
                                                {DAYS.map((day, idx) => {
                                                    const active = (slot.available_days || []).includes(day);
                                                    return (
                                                        <td key={day} className="tpl-td-check">
                                                            <button
                                                                className={`tpl-day-toggle ${active ? 'on' : 'off'}`}
                                                                onClick={() => handleToggleDay(slot.slot_id, idx)}
                                                                title={day}
                                                            >
                                                                {active ? <Check size={14} /> : <X size={14} />}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                                <td>
                                                    <button className="tpl-delete-btn" onClick={() => purgeSlot(slot.slot_id)} title="Delete slot">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {slots.length === 0 && (
                                            <tr><td colSpan={10} className="sch-empty-panel">No templates yet. Use "Add Slots" tab to create some.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: Add Slots */}
                    {activeTab === 'add' && (
                        <div className="sch-add-panel">
                            {/* Option A: Manual */}
                            <div className="sch-add-card">
                                <h3 className="sch-panel-title">Manual Add</h3>
                                <p className="sch-panel-sub">Add a single custom time slot to the master template</p>
                                <form onSubmit={handleManualAdd} className="sch-manual-form">
                                    <div className="sch-form-row">
                                        <div className="sch-form-group">
                                            <label>Slot Label</label>
                                            <input className="sch-input" placeholder="e.g. 10:00 AM" value={manualForm.slot_label}
                                                onChange={e => setManualForm({ ...manualForm, slot_label: e.target.value })} required />
                                        </div>
                                        <div className="sch-form-group">
                                            <label>Start Time</label>
                                            <input type="time" className="sch-input" value={manualForm.start_time}
                                                onChange={e => setManualForm({ ...manualForm, start_time: e.target.value })} required />
                                        </div>
                                        <div className="sch-form-group">
                                            <label>End Time</label>
                                            <input type="time" className="sch-input" value={manualForm.end_time}
                                                onChange={e => setManualForm({ ...manualForm, end_time: e.target.value })} required />
                                        </div>
                                        <div className="sch-form-group">
                                            <label>Session</label>
                                            <select className="sch-input" value={manualForm.session}
                                                onChange={e => setManualForm({ ...manualForm, session: e.target.value })}>
                                                {SESSION_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <button type="submit" className="sch-btn-primary" disabled={loading}>
                                        <Plus size={16} /><span>Add Slot</span>
                                    </button>
                                </form>
                            </div>

                            {/* Option B: Generator */}
                            <div className="sch-add-card">
                                <div className="sch-gen-header">
                                    <div>
                                        <h3 className="sch-panel-title">Smart Generator</h3>
                                        <p className="sch-panel-sub">Auto-generate multiple slots from a time range</p>
                                    </div>
                                    <span className="sch-hot-badge">🔥 BULK TOOL</span>
                                </div>
                                <div className="sch-gen-controls">
                                    <div className="sch-form-row">
                                        <div className="sch-form-group">
                                            <label>Start Time</label>
                                            <input type="time" className="sch-input" value={generator.start}
                                                onChange={e => setGenerator({ ...generator, start: e.target.value })} />
                                        </div>
                                        <div className="sch-form-group">
                                            <label>End Time</label>
                                            <input type="time" className="sch-input" value={generator.end}
                                                onChange={e => setGenerator({ ...generator, end: e.target.value })} />
                                        </div>
                                        <div className="sch-form-group">
                                            <label>Duration (mins)</label>
                                            <select className="sch-input" value={generator.duration}
                                                onChange={e => setGenerator({ ...generator, duration: e.target.value })}>
                                                {[15, 20, 30, 45, 60].map(d => <option key={d} value={d}>{d} min</option>)}
                                            </select>
                                        </div>
                                        <div className="sch-form-group">
                                            <label>Session</label>
                                            <select className="sch-input" value={generator.session}
                                                onChange={e => setGenerator({ ...generator, session: e.target.value })}>
                                                {SESSION_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <button className="sch-btn-secondary" onClick={generateSlots}>
                                        <Zap size={16} /><span>Generate Preview</span>
                                    </button>
                                </div>

                                {previewSlots.length > 0 && (
                                    <div className="sch-preview">
                                        <div className="sch-preview-header">
                                            <span>{previewSlots.length} slots ready to save</span>
                                        </div>
                                        <div className="sch-preview-chips">
                                            {previewSlots.map((s, i) => (
                                                <span key={i} className="sch-chip-slot">
                                                    {s.start_time} – {s.end_time}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="sch-preview-actions">
                                            <button className="sch-btn-ghost" onClick={() => setPreviewSlots([])}>
                                                <X size={14} /><span>Discard</span>
                                            </button>
                                            <button className="sch-btn-primary" onClick={saveGeneratedSlots} disabled={loading}>
                                                <Check size={14} /><span>Save to Weekly Template</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: Daily Overrides */}
                    {activeTab === 'override' && (
                        <div className="sch-override-panel">
                            <div className="sch-panel-toolbar">
                                <div>
                                    <h3 className="sch-panel-title">Daily Overrides</h3>
                                    <p className="sch-panel-sub">Block or re-open specific slots for holidays, emergencies, or custom adjustments</p>
                                </div>
                            </div>
                            <div className="sch-override-form">
                                <div className="sch-form-row">
                                    <div className="sch-form-group">
                                        <label>Select Date</label>
                                        <input type="date" className="sch-input" value={overrideForm.date}
                                            onChange={e => setOverrideForm({ ...overrideForm, date: e.target.value })} />
                                    </div>
                                    <div className="sch-form-group">
                                        <label>Select Slot</label>
                                        <select className="sch-input" value={overrideForm.slot_id}
                                            onChange={e => setOverrideForm({ ...overrideForm, slot_id: e.target.value })}>
                                            <option value="">Choose a time slot...</option>
                                            {slots.map(s => (
                                                <option key={s.slot_id} value={s.slot_id}>
                                                    {fmt12(s.start_time)} – {fmt12(s.end_time)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="sch-form-group">
                                        <label>Action</label>
                                        <select className="sch-input" value={overrideForm.action}
                                            onChange={e => setOverrideForm({ ...overrideForm, action: e.target.value })}>
                                            <option value="block">Block Slot</option>
                                            <option value="unblock">Re-open Slot</option>
                                        </select>
                                    </div>
                                    <div className="sch-form-group sch-form-action">
                                        <label>&nbsp;</label>
                                        <button className="sch-btn-primary" onClick={applyOverride}>
                                            <Check size={16} /><span>Apply Override</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="sch-override-tip">
                                    <AlertTriangle size={14} />
                                    <span>Overrides apply for a specific date only and do not affect the weekly template.</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ── CELL MODAL ────────────────────────────────────────────────── */}
            {cellModal.show && (
                <div className="sch-modal-overlay" onClick={() => setCellModal({ show: false })}>
                    <div className="sch-modal" onClick={e => e.stopPropagation()}>
                        <div className="sch-modal-header">
                            <h3>Slot Action</h3>
                            <button onClick={() => setCellModal({ show: false })}><X size={20} /></button>
                        </div>
                        <div className="sch-modal-body">
                            <div className="sch-modal-info">
                                <div className="sch-modal-info-row">
                                    <span>Slot</span>
                                    <strong>{cellModal.slot?.slot_label} ({fmt12(cellModal.slot?.start_time)} – {fmt12(cellModal.slot?.end_time)})</strong>
                                </div>
                                <div className="sch-modal-info-row">
                                    <span>Date</span>
                                    <strong>{cellModal.date && new Date(cellModal.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
                                </div>
                                <div className="sch-modal-info-row">
                                    <span>Status</span>
                                    <strong className={`sch-status-badge sb-${cellModal.status}`}>{cellModal.status?.toUpperCase()}</strong>
                                </div>
                                {cellModal.cellData?.patient_name && (
                                    <div className="sch-modal-info-row">
                                        <span>Patient</span>
                                        <strong>{cellModal.cellData.patient_name}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="sch-modal-footer">
                            {cellModal.status === 'available' && (
                                <button className="sch-btn-danger" onClick={() => handleCellAction('block')}>
                                    <X size={15} /> Block Slot
                                </button>
                            )}
                            {cellModal.status === 'blocked' && (
                                <button className="sch-btn-primary" onClick={() => handleCellAction('unblock')}>
                                    <Check size={15} /> Re-open Slot
                                </button>
                            )}
                            {cellModal.status === 'booked' && (
                                <div className="sch-modal-booked-note">
                                    This slot has an active booking. Cancel from Appointments page.
                                </div>
                            )}
                            <button className="sch-btn-ghost" onClick={() => setCellModal({ show: false })}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                /* ── PAGE ── */
                .sch-page { display: flex; flex-direction: column; min-height: calc(100vh - 80px); background: #f0f4f8; font-family: 'Inter', 'Outfit', sans-serif; gap: 0; }
                .sch-loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: calc(100vh - 80px); gap: 1rem; color: #64748b; font-weight: 700; }
                .sch-spin { animation: sch-rotate 1s linear infinite; }
                @keyframes sch-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                /* ── HEADER ── */
                .sch-header { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 1.25rem 2rem; display: flex; align-items: center; gap: 2rem; flex-wrap: wrap; }
                .sch-header-left { display: flex; flex-direction: column; gap: 0.35rem; min-width: 200px; }
                .sch-chip { display: inline-flex; align-items: center; gap: 0.4rem; background: #eff6ff; color: #3b82f6; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 800; width: fit-content; }
                .sch-title { font-size: 1.5rem; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.02em; }
                .sch-subtitle { font-size: 0.8rem; color: #94a3b8; margin: 0; font-weight: 600; }
                
                .sch-header-center { flex: 1; display: flex; flex-direction: column; gap: 0.75rem; align-items: center; }
                .sch-date-range { display: flex; align-items: center; gap: 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.4rem 0.75rem; }
                .sch-nav-btn { background: none; border: none; cursor: pointer; color: #64748b; display: flex; align-items: center; padding: 0.25rem; border-radius: 6px; transition: 0.15s; }
                .sch-nav-btn:hover { background: #e2e8f0; color: #0f172a; }
                .sch-date-display { display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-size: 0.9rem; color: #1e293b; min-width: 220px; justify-content: center; }
                .sch-doctor-select-wrap { display: flex; align-items: center; gap: 0.5rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.5rem 1rem; min-width: 280px; }
                .sch-doctor-icon { color: #6366f1; flex-shrink: 0; }
                .sch-doctor-select { border: none; background: transparent; font-weight: 700; color: #1e293b; font-size: 0.9rem; outline: none; cursor: pointer; width: 100%; }

                .sch-header-right { display: flex; align-items: center; gap: 1rem; margin-left: auto; }
                .sch-kpi { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 1rem; border-radius: 14px; }
                .sch-kpi-green { background: #f0fdf4; color: #16a34a; }
                .sch-kpi-blue { background: #eff6ff; color: #2563eb; }
                .sch-kpi-red { background: #fef2f2; color: #dc2626; }
                .sch-kpi div { display: flex; flex-direction: column; }
                .sch-kpi-val { font-size: 1.4rem; font-weight: 900; line-height: 1; }
                .sch-kpi-lbl { font-size: 0.7rem; font-weight: 700; opacity: 0.8; }
                .sch-refresh-btn { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.6rem; cursor: pointer; color: #64748b; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
                .sch-refresh-btn:hover { border-color: #6366f1; color: #6366f1; }

                /* ── ALERTS ── */
                .sch-alert { display: flex; align-items: center; gap: 1rem; padding: 1rem 2rem; font-weight: 700; font-size: 0.9rem; }
                .sch-alert button { margin-left: auto; background: none; border: none; cursor: pointer; color: inherit; display: flex; }
                .sch-alert-error { background: #fef2f2; color: #b91c1c; border-left: 4px solid #ef4444; }
                .sch-alert-success { background: #f0fdf4; color: #166534; border-left: 4px solid #22c55e; }

                /* ── GRID ── */
                .sch-grid-section { background: #fff; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #e2e8f0; }
                .sch-grid-legend { display: flex; align-items: center; gap: 1.5rem; padding: 1rem 2rem 0.5rem; }
                .leg-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; font-weight: 700; color: #64748b; }
                .leg-dot { width: 10px; height: 10px; border-radius: 3px; }
                .leg-available .leg-dot { background: #22c55e; }
                .leg-booked .leg-dot { background: #ef4444; }
                .leg-blocked .leg-dot { background: #94a3b8; }
                .leg-syncing { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: #94a3b8; font-weight: 700; margin-left: auto; }
                
                .sch-grid-wrap { overflow-x: auto; padding: 0 2rem 1.5rem; }
                .sch-grid-table { width: 100%; border-collapse: separate; border-spacing: 4px; min-width: 900px; }
                .sch-th-time { width: 120px; text-align: left; padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; position: sticky; left: 0; background: #fff; z-index: 2; }
                .sch-th-day { text-align: center; padding: 0.5rem; min-width: 100px; }
                .sch-th-day.sch-today .sch-day-name { color: #6366f1; }
                .sch-th-day.sch-today .sch-day-num { background: #6366f1; color: #fff; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
                .sch-day-name { font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
                .sch-day-num { font-size: 1.1rem; font-weight: 900; color: #1e293b; margin-top: 0.2rem; }

                .sch-grid-row:hover .sch-td-time { background: #f8fafc; }
                .sch-td-time { padding: 0.5rem 1rem; vertical-align: middle; position: sticky; left: 0; background: #fff; z-index: 1; border-right: 1px solid #f1f5f9; }
                .sch-td-time strong { display: block; font-size: 0.9rem; font-weight: 900; color: #1e293b; }
                .sch-td-sub { font-size: 0.7rem; color: #94a3b8; font-weight: 600; }
                .sch-td-cell { padding: 2px; vertical-align: middle; }

                /* Slot Cell */
                .slot-cell { height: 52px; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; border: 1px solid transparent; }
                .slot-cell:hover { transform: scale(1.04); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
                .sc-available { background: #f0fdf4; border-color: #bbf7d0; }
                .sc-booked { background: #fef2f2; border-color: #fecaca; }
                .sc-blocked { background: #f1f5f9; border-color: #e2e8f0; }
                .sc-none { background: transparent; border: 1.5px dashed #e2e8f0; cursor: default; opacity: 0.5; }
                .sc-none .sc-label { color: #cbd5e1; font-size: 1rem; font-weight: 400; letter-spacing: 0; }
                .sc-label { font-size: 0.65rem; font-weight: 900; letter-spacing: 0.06em; }
                .sc-available .sc-label { color: #16a34a; }
                .sc-booked .sc-label { color: #dc2626; }
                .sc-blocked .sc-label { color: #94a3b8; }
                .sc-patient { font-size: 0.6rem; font-weight: 700; color: #ef4444; margin-top: 2px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .sch-empty-grid { text-align: center; padding: 3rem; color: #94a3b8; font-weight: 700; }

                /* ── TABS ── */
                .sch-tabs-section { flex: 1; display: flex; flex-direction: column; }
                .sch-tab-nav { display: flex; gap: 0; border-bottom: 2px solid #e2e8f0; background: #fff; padding: 0 2rem; }
                .sch-tab-btn { padding: 1rem 1.5rem; border: none; background: transparent; font-weight: 800; font-size: 0.9rem; color: #94a3b8; cursor: pointer; position: relative; transition: 0.2s; border-bottom: 3px solid transparent; margin-bottom: -2px; }
                .sch-tab-btn.active { color: #6366f1; border-bottom-color: #6366f1; }
                .sch-tab-body { background: #f8fafc; flex: 1; padding: 2rem; }

                /* Panel commons */
                .sch-panel-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
                .sch-panel-title { font-size: 1.1rem; font-weight: 900; color: #0f172a; margin: 0; }
                .sch-panel-sub { font-size: 0.8rem; color: #94a3b8; margin: 0.25rem 0 0; font-weight: 600; }
                .sch-empty-panel { text-align: center; padding: 2rem; color: #94a3b8; font-weight: 700; font-style: italic; }

                /* Template table */
                .sch-tpl-table-wrap { overflow-x: auto; background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; }
                .sch-tpl-table { width: 100%; border-collapse: collapse; min-width: 800px; }
                .sch-tpl-table th { padding: 1rem 1.25rem; font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; text-align: center; }
                .tpl-th-time { text-align: left !important; }
                .tpl-row:hover { background: #f8fafc; }
                .tpl-row td { padding: 0.85rem 1.25rem; border-bottom: 1px solid #f8fafc; text-align: center; vertical-align: middle; }
                .tpl-td-time { display: flex; align-items: center; gap: 0.5rem; font-weight: 800; color: #0f172a; font-size: 0.9rem; text-align: left; white-space: nowrap; }
                .tpl-td-check { }
                .tpl-session-tag { padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.7rem; font-weight: 800; }
                .tpl-morning { background: #fffbeb; color: #f59e0b; }
                .tpl-afternoon { background: #f0f9ff; color: #0ea5e9; }
                .tpl-evening { background: #f5f3ff; color: #8b5cf6; }
                .tpl-day-toggle { width: 28px; height: 28px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.15s; }
                .tpl-day-toggle.on { background: #6366f1; color: #fff; }
                .tpl-day-toggle.off { background: #f1f5f9; color: #cbd5e1; }
                .tpl-delete-btn { background: #fef2f2; color: #ef4444; border: none; border-radius: 8px; padding: 0.4rem 0.6rem; cursor: pointer; transition: 0.15s; display: flex; align-items: center; }
                .tpl-delete-btn:hover { background: #fee2e2; }

                /* Add panel */
                .sch-add-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
                .sch-add-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 2rem; }
                .sch-form-row { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem; }
                .sch-form-group { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; min-width: 150px; }
                .sch-form-group label { font-size: 0.78rem; font-weight: 800; color: #64748b; }
                .sch-input { height: 44px; border-radius: 10px; border: 1.5px solid #e2e8f0; padding: 0 0.85rem; font-weight: 700; font-size: 0.9rem; outline: none; transition: 0.15s; background: #fff; width: 100%; }
                .sch-input:focus { border-color: #6366f1; background: #fdfdff; }
                .sch-form-action { justify-content: flex-end; }

                /* Generator */
                .sch-gen-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
                .sch-hot-badge { background: #fef3c7; color: #d97706; font-size: 0.75rem; font-weight: 800; padding: 0.3rem 0.75rem; border-radius: 8px; }
                .sch-gen-controls { display: flex; flex-direction: column; gap: 1rem; }
                .sch-preview { margin-top: 1.5rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1.25rem; }
                .sch-preview-header { font-weight: 800; color: #0f172a; margin-bottom: 1rem; font-size: 0.9rem; }
                .sch-preview-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
                .sch-chip-slot { background: #eff6ff; color: #2563eb; font-size: 0.75rem; font-weight: 800; padding: 0.25rem 0.6rem; border-radius: 6px; }
                .sch-preview-actions { display: flex; gap: 1rem; }

                /* Override */
                .sch-override-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 2rem; }
                .sch-override-form { margin-top: 1.5rem; }
                .sch-override-tip { display: flex; align-items: center; gap: 0.5rem; margin-top: 1.5rem; background: #fffbeb; color: #92400e; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.8rem; font-weight: 700; }

                /* Buttons */
                .sch-btn-primary { display: flex; align-items: center; gap: 0.5rem; padding: 0.7rem 1.5rem; background: #6366f1; color: #fff; border: none; border-radius: 12px; font-weight: 800; cursor: pointer; font-size: 0.9rem; transition: 0.2s; }
                .sch-btn-primary:hover { background: #4f46e5; box-shadow: 0 4px 12px rgba(99,102,241,0.3); }
                .sch-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .sch-btn-secondary { display: flex; align-items: center; gap: 0.5rem; padding: 0.7rem 1.5rem; background: #0f172a; color: #fff; border: none; border-radius: 12px; font-weight: 800; cursor: pointer; font-size: 0.9rem; transition: 0.2s; }
                .sch-btn-ghost { display: flex; align-items: center; gap: 0.5rem; padding: 0.7rem 1.25rem; background: #f1f5f9; color: #475569; border: none; border-radius: 12px; font-weight: 800; cursor: pointer; font-size: 0.9rem; transition: 0.2s; }
                .sch-btn-danger { display: flex; align-items: center; gap: 0.5rem; padding: 0.7rem 1.5rem; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 12px; font-weight: 800; cursor: pointer; font-size: 0.9rem; transition: 0.2s; }
                .sch-btn-danger:hover { background: #fee2e2; }

                /* Modal */
                .sch-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
                .sch-modal { background: #fff; width: 480px; border-radius: 24px; box-shadow: 0 40px 100px rgba(0,0,0,0.15); overflow: hidden; }
                .sch-modal-header { padding: 1.5rem 2rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
                .sch-modal-header h3 { font-size: 1.15rem; font-weight: 900; color: #0f172a; margin: 0; }
                .sch-modal-header button { background: none; border: none; cursor: pointer; color: #94a3b8; display: flex; border-radius: 8px; padding: 0.25rem; transition: 0.15s; }
                .sch-modal-header button:hover { background: #f1f5f9; color: #0f172a; }
                .sch-modal-body { padding: 2rem; }
                .sch-modal-info { display: flex; flex-direction: column; gap: 1rem; }
                .sch-modal-info-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: #f8fafc; border-radius: 10px; }
                .sch-modal-info-row span { font-size: 0.8rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
                .sch-modal-info-row strong { font-weight: 800; color: #0f172a; font-size: 0.9rem; }
                .sch-status-badge { padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.75rem !important; font-weight: 800 !important; }
                .sch-status-badge.sc-available { background: #dcfce7; color: #16a34a !important; }
                .sch-status-badge.sc-booked { background: #fee2e2; color: #dc2626 !important; }
                .sch-status-badge.sc-blocked { background: #f1f5f9; color: #64748b !important; }
                .sch-modal-footer { padding: 1.25rem 2rem; border-top: 1px solid #f1f5f9; display: flex; gap: 1rem; }
                .sch-modal-booked-note { flex: 1; font-size: 0.85rem; color: #64748b; font-weight: 700; display: flex; align-items: center; }

                @media (max-width: 900px) {
                    .sch-header { flex-direction: column; align-items: flex-start; }
                    .sch-header-right { margin-left: 0; }
                    .sch-add-panel { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
};

export default Scheduling;
