import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, AlertCircle, Clock, Check } from 'lucide-react';
import {
    getSlotConfig, updateSlotConfig, getConfig, updateConfig, getAuditLogs
} from '../api/index';

const Settings = () => {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const slotsRes = await getSlotConfig();
            setSlots(slotsRes.data?.data || []);
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleUpdateActive = (slot_id, is_active) => {
        setSlots(prev => prev.map(s => s.slot_id === slot_id ? { ...s, is_active } : s));
    };

    const handleSaveSlots = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await updateSlotConfig(slots);
            setSuccess('Clinic slot configuration updated.');
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="settings-page">
            <div className="title-section">
                <h1>Settings</h1>
                <p>Manage clinic-wide configurations and slot timings.</p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <div className="btn btn-primary" style={{ cursor: 'default' }}>
                    <Clock size={18} /> Slot Master
                </div>
            </div>

            {error && (
                <div className="alert-item" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '0.75rem 1.25rem', marginBottom: '1.5rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <AlertCircle size={20} /> {error}
                </div>
            )}

            {success && (
                <div className="alert-item" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '0.75rem 1.25rem', marginBottom: '1.5rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Check size={20} /> {success}
                </div>
            )}

            <div className="card settings-slot-card">
                <div className="card-header settings-slot-header">
                    <h3 className="settings-slot-title">Slot Template Definition</h3>
                    <button className="btn btn-primary settings-save-btn" onClick={handleSaveSlots} disabled={saving || loading}>
                        <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
                {loading ? <p style={{ textAlign: 'center', padding: '2rem' }}>Loading...</p> : (
                    <div className="table-container settings-slot-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Slot ID</th>
                                    <th>Label</th>
                                    <th>Session</th>
                                    <th>Timings</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {slots.map((s) => (
                                    <tr key={s.slot_id}>
                                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.slot_id}</td>
                                        <td>{s.slot_label || s.display_label}</td>
                                        <td><span className={`badge settings-session-badge ${s.session === 'MORNING' ? 'badge-morning' : 'badge-evening'}`}>{s.session}</span></td>
                                        <td style={{ fontSize: '0.85rem' }}>{s.start_time} - {s.end_time}</td>
                                        <td><span className={`badge ${s.is_active ? 'badge-success' : 'badge-gray'}`}>{s.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                                        <td>
                                            <button className={`btn ${s.is_active ? 'btn-danger-soft' : 'btn-success-soft'} settings-toggle-btn`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', height: 'auto' }} onClick={() => handleUpdateActive(s.slot_id, !s.is_active)}>
                                                {s.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;

