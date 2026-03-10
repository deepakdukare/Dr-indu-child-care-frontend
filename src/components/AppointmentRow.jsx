import React from 'react';
import { CheckCircle2, Clock3, Edit2, Phone, Trash2, XCircle } from 'lucide-react';
import { removeSalutation } from '../utils/formatters';
import { hasPermission } from '../utils/auth';

const STATUS_CONFIG = {
    CONFIRMED: { label: 'Confirmed', color: '#10ac84' },
    COMPLETED: { label: 'Checked Out', color: '#0ebadb' },
    CANCELLED: { label: 'Cancelled', color: '#ee5253' },
    CANCELED: { label: 'Cancelled', color: '#ee5253' },
    PENDING: { label: 'Schedule', color: '#54a0ff' },
    NO_SHOW: { label: 'No Show', color: '#feca57' },
    DEFAULT: { label: 'Pending', color: '#64748b' }
};

const formatTime12h = (rawTime) => {
    if (!rawTime) return '';
    const [hourRaw, minuteRaw] = String(rawTime).split(':');
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return String(rawTime);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const normalizedHour = hour % 12 || 12;
    return `${String(normalizedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
};

const getDateTime = (appt) => {
    if (appt?.start_time && appt?.end_time) {
        return `${formatTime12h(appt.start_time)} - ${formatTime12h(appt.end_time)}`;
    }
    if (appt?.appointment_time) return String(appt.appointment_time);
    return '10:00 AM - 10:30 AM';
};

const AppointmentRow = ({ appt, onEdit, onCancel }) => {
    const statusKey = String(appt?.status || 'PENDING').toUpperCase();
    const statusView = STATUS_CONFIG[statusKey] || STATUS_CONFIG.DEFAULT;

    // Use deterministic avatar images based on ID or name length
    const ptId = appt?.patient_id || '9022';
    const docName = appt?.assigned_doctor_name || appt?.doctor_name || 'Dr. Indu';
    const ptAvatar = `https://i.pravatar.cc/150?u=${ptId}`;
    const docAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(docName)}&background=random`;

    return (
        <tr style={{ backgroundColor: '#fff', borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}>
            <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={ptAvatar} alt="patient" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                            {removeSalutation(appt?.child_name) || 'Walk-in Patient'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                            ID: #{String(ptId).slice(-4)}
                        </span>
                    </div>
                </div>
            </td>

            <td style={{ padding: '16px 20px', verticalAlign: 'middle', fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                {getDateTime(appt)}
            </td>

            <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={docAvatar} alt="doctor" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                            {docName}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                            {appt?.doctor_speciality || 'Pediatrician'}
                        </span>
                    </div>
                </div>
            </td>

            <td style={{ padding: '16px 20px', verticalAlign: 'middle', fontSize: '13px', color: '#64748b' }}>
                {appt?.reason || 'General Checkup'}
            </td>

            <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: `1px solid ${statusView.color}`,
                    color: statusView.color,
                    backgroundColor: '#fff'
                }}>
                    {statusView.label}
                </span>
            </td>

            <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(appt); }}
                    style={{
                        padding: '6px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        background: '#fff',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                </button>
            </td>
        </tr>
    );
};

export default AppointmentRow;
