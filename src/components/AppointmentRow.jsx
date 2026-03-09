import React from 'react';
import { CheckCircle2, Clock3, Edit2, Phone, Trash2, XCircle } from 'lucide-react';
import { removeSalutation } from '../utils/formatters';
import { hasPermission } from '../utils/auth';

const STATUS_CONFIG = {
    CONFIRMED: { label: 'CONFIRMED', color: '#6366f1', bg: '#eef2ff', icon: CheckCircle2 },
    COMPLETED: { label: 'CHECKED OUT', color: '#0ea5e9', bg: '#f0f9ff', icon: CheckCircle2 },
    CANCELLED: { label: 'CANCELLED', color: '#e11d48', bg: '#fff1f2', icon: XCircle },
    CANCELED: { label: 'CANCELLED', color: '#e11d48', bg: '#fff1f2', icon: XCircle },
    PENDING: { label: 'SCHEDULED', color: '#64748b', bg: '#f8fafc', icon: Clock3 },
    NO_SHOW: { label: 'NO SHOW', color: '#f59e0b', bg: '#fffbeb', icon: Clock3 },
    DEFAULT: { label: 'PENDING', color: '#64748b', bg: '#f1f5f9', icon: Clock3 }
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

const formatDateShort = (rawDate) => {
    if (!rawDate) return '--';
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return String(rawDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

const getDateTime = (appt) => {
    if (appt?.start_time && appt?.end_time) {
        return `${formatTime12h(appt.start_time)} - ${formatTime12h(appt.end_time)}`;
    }
    if (appt?.appointment_time) return String(appt.appointment_time);
    return 'TIME TBD';
};

const getVisitType = (appt) => {
    const type = appt?.visit_category || appt?.visit_type;
    if (!type) return 'First visit';

    // Convert e.g., "FOLLOW_UP" to "Follow-up" or "first_visit" to "First visit"
    return String(type)
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .replace('Follow Up', 'Follow-up');
};

const AppointmentRow = ({ appt, onEdit, onCancel }) => {
    const statusKey = String(appt?.status || 'PENDING').toUpperCase();
    const statusView = STATUS_CONFIG[statusKey] || STATUS_CONFIG.DEFAULT;
    const StatusIcon = statusView.icon;
    const isCancelled = statusKey === 'CANCELLED' || statusKey === 'CANCELED';

    return (
        <tr className="appointment-row-premium">
            <td className="patient-cell-premium">
                <div className="patient-info-stack">
                    <div className="patient-name-bold">
                        {removeSalutation(appt?.child_name) || 'Walk-in Patient'}
                        {appt?.token_display && (
                            <span className={`token-badge-inline ${appt.token_pool === 'WALK_IN' ? 'walkin' : 'online'}`}>
                                {appt.token_display}
                            </span>
                        )}
                    </div>
                    <div className="patient-meta-pill">
                        <span className="p-id">{appt?.patient_id || '--'}</span>
                        <span className="p-separator"></span>
                        {hasPermission('view_patient_mobile') && (
                            <>
                                <Phone size={11} className="p-icon" />
                                <span className="p-phone">{appt?.parent_mobile || '--'}</span>
                            </>
                        )}
                    </div>
                </div>
            </td>

            <td className="datetime-cell-premium">
                <div className="datetime-stack">
                    <div className="date-main">{formatDateShort(appt?.appointment_date || appt?.date)}</div>
                    <div className="time-sub">{getDateTime(appt)}</div>
                </div>
            </td>

            <td className="doctor-cell-premium">
                <div className="doctor-assign-stack">
                    <div className="doc-name">{appt?.assigned_doctor_name || appt?.doctor_name || 'Dr. Indu'}</div>
                    <div className="visit-badge">{getVisitType(appt)}</div>
                </div>
            </td>

            <td className="reason-cell-premium">
                <div className="reason-text">{appt?.reason || 'General Checkup'}</div>
            </td>

            <td className="status-cell-premium">
                <span className="status-pill-premium" style={{
                    '--status-color': statusView.color,
                    '--status-bg': statusView.bg
                }}>
                    <StatusIcon size={14} className="s-icon" />
                    <span>{statusView.label}</span>
                </span>
            </td>

            <td className="management-cell-premium">
                <div className="actions-wrapper">
                    <button
                        className="action-btn edit-btn"
                        title="Reschedule / Edit"
                        onClick={() => onEdit(appt)}
                        disabled={isCancelled}
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        className="action-btn cancel-btn"
                        title="Cancel Appointment"
                        onClick={() => onCancel(appt?.appointment_id)}
                        disabled={isCancelled}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default AppointmentRow;
