import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Calendar as CalendarIcon,
    Users,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Search,
    Plus,
    AlertTriangle,
    ChevronDown,
    Stethoscope,
    Activity,
    User,
    ArrowRight,
    Clipboard,
    Clock,
    Edit2,
    Calendar,
    UserPlus,
    Trash2
} from 'lucide-react';
import AppointmentRow from '../components/AppointmentRow';
import {
    getAppointments,
    getAppointmentStats,
    getDoctors,
    bookAppointment,
    updateAppointment,
    cancelAppointment,
    searchPatients,
    registerPatient,
    bookAppointmentWithToken,
    getAvailableTokens,
    toIsoDate
} from '../api/index';
import { removeSalutation } from '../utils/formatters';

const getDoctorDisplayName = (doctor) => doctor?.full_name || doctor?.name || doctor?.doctor_name || doctor?.doctor_id || 'Unknown Doctor';

const formatTime12h = (t) => {
    if (!t) return '--';
    const [h, m] = String(t).split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const getApiErrorMessage = (err, fallback = 'Operation failed.') => {
    const message = err?.response?.data?.message;
    if (!message) return fallback;
    if (message.toLowerCase().includes('token not available') || message.toLowerCase().includes('capacity reached')) {
        return 'The daily token capacity for this clinician has been reached. Please select another date or practitioner.';
    }
    return message;
};

const formatCompactDate = (dateStr) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

const Appointments = () => {
    // Shared State
    const [appointments, setAppointments] = useState([]);
    const [stats, setStats] = useState(null);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [enrollErrors, setEnrollErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // Queue Filters
    const [filters, setFilters] = useState({
        date: toIsoDate(),
        doctor_id: '',
        status: ''
    });

    // View State
    const [activeView, setActiveView] = useState('queue'); // 'queue' | 'authorizer'
    const [activeTab, setActiveTab] = useState('patient');
    const [availableTokens, setAvailableTokens] = useState(null);
    const [tokensLoading, setTokensLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [patientSearch, setPatientSearch] = useState('');
    const [queueSearch, setQueueSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [newPatient, setNewPatient] = useState({
        first_name: '',
        last_name: '',
        gender: 'boy',
        dob: '',
        wa_id: ''
    });
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [editMode, setEditMode] = useState(false);

    const [form, setForm] = useState({
        patient_id: '',
        doctor_name: 'Dr. Indu',
        appointment_date: filters.date,
        doctor_id: '',
        doctor_speciality: 'Pediatrics',
        visit_category: 'First visit',
        registration_type: 'walkin', // Default for admin
        appointment_mode: 'OFFLINE',
        reason: ''
    });

    const [cancelModal, setCancelModal] = useState({ show: false, id: null, reason: '' });
    const dateInputRef = useRef(null);

    const filteredAppointments = appointments.filter((appt) => {
        const q = queueSearch.trim().toLowerCase();
        if (!q) return true;
        return [
            appt.appointment_id,
            appt.patient_id,
            appt.child_name,
            appt.parent_mobile,
            appt.parent_name,
            appt.doctor_name,
        ].some((value) => String(value || '').toLowerCase().includes(q));
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [apptRes, statsRes, doctorRes] = await Promise.all([
                getAppointments(filters),
                getAppointmentStats(filters.date),
                getDoctors({ all: true })
            ]);
            setAppointments(apptRes.data.data || []);
            setStats(statsRes.data.data || {});
            setDoctors(doctorRes.data.data || []);
        } catch (err) {
            setError("Failed to fetch clinic data. Please check connection.");
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const fetchTokens = useCallback(async () => {
        if (!form.appointment_date || !form.doctor_id) return;
        setTokensLoading(true);
        try {
            const res = await getAvailableTokens(form.doctor_id, form.appointment_date);
            setAvailableTokens(res.data.data);
        } catch (err) {
            setError(getApiErrorMessage(err, "Unable to load token availability."));
        } finally {
            setTokensLoading(false);
        }
    }, [form.appointment_date, form.doctor_id]);

    const handlePatientSearch = useCallback(async (val) => {
        setPatientSearch(val);
        setSearching(true);
        try {
            const res = await searchPatients(val);
            setSearchResults(res.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    }, []);

    useEffect(() => {
        if (activeView === 'authorizer') {
            if (activeTab === 'visit') {
                fetchTokens();
            } else if (activeTab === 'patient') {
                handlePatientSearch(patientSearch);
            }
        }
    }, [activeView, activeTab, fetchTokens, handlePatientSearch, patientSearch]);

    const selectPatient = (patient) => {
        setSelectedPatient(patient);
        setForm(prev => ({ ...prev, patient_id: patient.patient_id }));
        setActiveTab('visit');
    };

    const handleQuickRegister = async (e) => {
        if (e) e.preventDefault();
        setEnrollErrors({});
        setError(null);

        const errors = {};
        if (!newPatient.first_name?.trim()) errors.first_name = "First name required";
        if (!newPatient.last_name?.trim()) errors.last_name = "Last name required";
        if (!newPatient.gender?.trim()) errors.gender = "Gender required";
        if (!newPatient.dob?.trim()) errors.dob = "Birth date required";
        if (!newPatient.wa_id?.trim()) errors.wa_id = "Mobile required";
        else if (newPatient.wa_id.length < 10) errors.wa_id = "10-digit required";

        if (Object.keys(errors).length > 0) {
            setEnrollErrors(errors);
            const first = Object.keys(errors)[0];
            const el = document.getElementsByName(first)[0];
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        setSubmitting(true);
        try {
            const res = await registerPatient({
                first_name: newPatient.first_name,
                last_name: newPatient.last_name,
                gender: newPatient.gender,
                dob: newPatient.dob,
                wa_id: newPatient.wa_id,
                doctor: form.doctor_name
            });
            selectPatient(res.data.data);
            setActiveTab('visit');
        } catch (err) {
            setError(err.response?.data?.message || "Enrollment failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!form.doctor_id) {
            setError('Please select a clinician before booking.');
            return;
        }
        if (!form.patient_id) {
            setError('Please select a patient before booking.');
            return;
        }
        setSubmitting(true);
        try {
            const visitCat = form.visit_category || 'First visit';
            const payload = {
                ...form,
                visit_category: visitCat,
                registration_type: editMode ? form.registration_type : 'walkin',
                booking_source: 'dashboard'
            };
            if (editMode) {
                await updateAppointment(selectedAppointment.appointment_id, payload);
            } else {
                await bookAppointment(payload);
            }
            setError(null);
            setActiveView('queue');
            fetchData();
        } catch (err) {
            console.error(err);
            setError(getApiErrorMessage(err, "Operation failed."));
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async () => {
        try {
            await cancelAppointment(cancelModal.id, { cancellation_reason: cancelModal.reason });
            setCancelModal({ show: false, id: null, reason: '' });
            setError(null);
            fetchData();
        } catch (err) {
            setError(getApiErrorMessage(err, "Cancellation request rejected."));
        }
    };

    const formatCategory = (type) => {
        if (!type) return 'First visit';
        return String(type)
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
            .replace('Follow Up', 'Follow-up');
    };

    const openBookingModal = (appt = null) => {
        if (appt) {
            setEditMode(true);
            setSelectedAppointment(appt);
            setForm({
                patient_id: appt.patient_id,
                doctor_name: appt.assigned_doctor_name || appt.doctor_name || 'Dr. Indu',
                appointment_date: appt.appointment_date.split('T')[0],
                doctor_speciality: appt.doctor_speciality || 'Pediatrics',
                visit_category: formatCategory(appt.visit_category),
                registration_type: appt.registration_type || 'walkin',
                appointment_mode: appt.appointment_mode,
                reason: appt.reason || ''
            });
            setSelectedPatient({
                child_name: appt.child_name,
                patient_id: appt.patient_id,
                parent_mobile: appt.parent_mobile
            });
            setActiveTab('visit');
        } else {
            setEditMode(false);
            const defaultDoc = doctors.find(d => getDoctorDisplayName(d).toLowerCase().includes('indu')) || doctors[0];
            setForm({
                patient_id: '',
                doctor_name: defaultDoc ? getDoctorDisplayName(defaultDoc) : '',
                appointment_date: filters.date || toIsoDate(),
                doctor_id: defaultDoc?.doctor_id || '',
                doctor_speciality: defaultDoc?.speciality || 'Pediatrics',
                visit_category: 'First visit',
                visit_category: 'First visit',
                registration_type: 'walkin',
                appointment_mode: 'OFFLINE',
                reason: ''
            });
            setNewPatient({
                salutation: 'Master',
                first_name: '',
                last_name: '',
                gender: 'boy',
                dob: '',
                wa_id: '',
                registration_source: 'dashboard'
            });
            setSelectedPatient(null);
            setActiveTab('patient');
        }
        setActiveView('authorizer');
    };

    const openDatePicker = () => {
        const input = dateInputRef.current;
        if (!input) return;
        input.focus();
        if (typeof input.showPicker === 'function') {
            input.showPicker();
        } else {
            input.click();
        }
    };

    return (
        <div className="appointments-page-v3">
            <div className="header-section-premium">
                <div className="header-content-premium">
                    <h1 className="header-title-premium">Appointments</h1>
                    <div className="live-pill-premium">
                        <span className="live-dot"></span>
                        <span className="live-text">{stats?.total_today || 0} Total Today</span>
                    </div>
                </div>

                <div className="header-actions-premium">
                    <button
                        className={`btn-action-premium ${activeView === 'queue' ? 'active' : ''}`}
                        onClick={() => setActiveView('queue')}
                    >
                        <CalendarIcon size={18} />
                        <span>Schedule Queue</span>
                    </button>

                    <button
                        className={`btn-action-premium ${activeView === 'authorizer' ? 'active' : ''}`}
                        onClick={() => openBookingModal()}
                    >
                        <UserPlus size={18} />
                        <span>Book Visit</span>
                    </button>

                    <button className="sync-btn-premium" onClick={fetchData} title="Sync Clinic Data">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="view-content-v3">
                {activeView === 'queue' ? (
                    <>
                        <div className="filter-shelf-premium">
                            <div className="search-pill-v3">
                                <Search size={22} className="s-icon" />
                                <input
                                    type="text"
                                    placeholder=""
                                    value={queueSearch}
                                    onChange={(e) => setQueueSearch(e.target.value)}
                                />
                            </div>

                            <div className="filter-group-v3">
                                <div className="filter-item-v3 date-pill-v3" onClick={openDatePicker}>
                                    <CalendarIcon size={18} className="f-icon" />
                                    <input
                                        ref={dateInputRef}
                                        type="date"
                                        value={filters.date}
                                        onChange={e => setFilters({ ...filters, date: e.target.value })}
                                        className="date-input-v3"
                                    />
                                    <span className="f-label">{formatCompactDate(filters.date)}</span>
                                    <ChevronDown size={14} className="drop-icon" />
                                </div>

                                <div className="filter-item-v3 select-pill-v3">
                                    <Stethoscope size={18} className="f-icon" />
                                    <select
                                        className="f-select"
                                        value={filters.doctor_id}
                                        onChange={e => setFilters({ ...filters, doctor_id: e.target.value })}
                                    >
                                        <option value="">All Combined Doctors</option>
                                        {doctors.map((doc, idx) => (
                                            <option key={doc.doctor_id || idx} value={doc.doctor_id}>
                                                {getDoctorDisplayName(doc)}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="drop-icon" />
                                </div>

                                <div className="filter-item-v3 select-pill-v3">
                                    <Activity size={18} className="f-icon" />
                                    <select
                                        className="f-select"
                                        value={filters.status}
                                        onChange={e => setFilters({ ...filters, status: e.target.value })}
                                    >
                                        <option value="">All Status</option>
                                        <option value="CONFIRMED">Confirmed</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="CANCELLED">Cancelled</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="NO_SHOW">No Show</option>
                                    </select>
                                    <ChevronDown size={14} className="drop-icon" />
                                </div>
                            </div>
                        </div>

                        <div className="repository-card-v3">
                            <div className="table-flow-v3">
                                <table className="main-table-v3">
                                    <thead>
                                        <tr>
                                            <th>Patient / Mobile</th>
                                            <th>Schedule / Date</th>
                                            <th>Assigned Provider</th>
                                            <th>Condition / Reason</th>
                                            <th>Registration Status</th>
                                            <th className="management-header">Management</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading && !appointments.length ? (
                                            Array(6).fill(0).map((_, i) => (
                                                <tr key={i}><td colSpan={6}><div className="skeleton-line-v3"></div></td></tr>
                                            ))
                                        ) : filteredAppointments.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="empty-state-card">
                                                    <div className="empty-content">
                                                        <div className="empty-icon-wrap">
                                                            <CalendarIcon size={48} />
                                                        </div>
                                                        <h3>No Appointments Found</h3>
                                                        <p>We couldn't find any visits matching your current filters.</p>
                                                        <button className="btn-save btn-new-booking" onClick={() => openBookingModal()}>
                                                            <Plus size={20} />
                                                            <span>New Booking</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredAppointments.map((appt, idx) => (
                                            <AppointmentRow
                                                key={appt.appointment_id || idx}
                                                appt={appt}
                                                onEdit={openBookingModal}
                                                onCancel={(id) => setCancelModal({ show: true, id, reason: '' })}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="authorizer-panel-premium">
                        <div className="authorizer-header-v3">
                            <div className="header-flex">
                                <div className="modal-icon-wrap"><Plus size={24} /></div>
                                <div className="header-text">
                                    <h2>{editMode ? 'Modify Reservation' : 'Schedule New Visit'}</h2>
                                    <p>Configure parameters for clinical patient encounter</p>
                                </div>
                                <button className="close-btn-v3" onClick={() => setActiveView('queue')}><XCircle size={24} /></button>
                            </div>
                        </div>

                        <div className="modal-stepper-v3">
                            <button className={`step-btn ${activeTab === 'patient' || activeTab === 'new-patient' ? 'active' : ''}`} onClick={() => !editMode && setActiveTab('patient')}>
                                <span className="step-num">1</span>
                                <span>Identity Verification</span>
                            </button>
                            <div className="step-line"></div>
                            <button className={`step-btn ${activeTab === 'visit' ? 'active' : ''}`} onClick={() => selectedPatient && setActiveTab('visit')}>
                                <span className="step-num">2</span>
                                <span>Visit Parameters</span>
                            </button>
                        </div>

                        <div className="modal-body-v3">
                            {error && (
                                <div className="alert-v3-premium error">
                                    <AlertTriangle size={20} />
                                    <span>{error}</span>
                                    <button onClick={() => setError(null)}>x</button>
                                </div>
                            )}

                            {activeTab === 'patient' ? (
                                <div className="patient-selector-premium">
                                    <div className="search-wrap-premium">
                                        <Search size={22} className="s-icon" />
                                        <input
                                            type="text"
                                            placeholder=""
                                            value={patientSearch}
                                            onChange={(e) => handlePatientSearch(e.target.value)}
                                            className="search-input-premium"
                                        />
                                    </div>

                                    {searching && <div className="scanner-line">Scanning Patient Records...</div>}

                                    <div className="search-results-premium">
                                        {searchResults.map(p => (
                                            <div key={p.patient_id} className="patient-result-item" onClick={() => selectPatient(p)}>
                                                <div className="p-avatar-v2">{p.child_name?.charAt(0)}</div>
                                                <div className="p-info-v2">
                                                    <div className="p-name">{removeSalutation(p.child_name)}</div>
                                                    <div className="p-meta">{p.patient_id} | {p.parent_mobile}</div>
                                                </div>
                                                <div className="p-action"><ArrowRight size={20} /></div>
                                            </div>
                                        ))}
                                        {!searching && searchResults.length === 0 && (
                                            <div className="no-identity-state">
                                                <p>Identity not found in repository.</p>
                                                <button onClick={() => setActiveTab('new-patient')} className="btn-save">+ Create New Profile</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : activeTab === 'new-patient' ? (
                                <form onSubmit={handleQuickRegister} className="wizard-form-v3" noValidate>
                                    <div className="form-grid-v2">
                                        <div className="f-group">
                                            <label>First Name *</label>
                                            <input name="first_name" placeholder="" value={newPatient.first_name} onChange={e => setNewPatient({ ...newPatient, first_name: e.target.value })} className={`input-v3 ${enrollErrors.first_name ? 'error' : ''}`} />
                                            {enrollErrors.first_name && <p className="err-msg-v3">{enrollErrors.first_name}</p>}
                                        </div>
                                        <div className="f-group">
                                            <label>Last Name *</label>
                                            <input name="last_name" placeholder="" value={newPatient.last_name} onChange={e => setNewPatient({ ...newPatient, last_name: e.target.value })} className={`input-v3 ${enrollErrors.last_name ? 'error' : ''}`} />
                                            {enrollErrors.last_name && <p className="err-msg-v3">{enrollErrors.last_name}</p>}
                                        </div>
                                        <div className="f-group">
                                            <label>Gender *</label>
                                            <select name="gender" value={newPatient.gender} onChange={e => setNewPatient({ ...newPatient, gender: e.target.value })} className={`select-v3 ${enrollErrors.gender ? 'error' : ''}`}>
                                                <option value="boy">Boy</option>
                                                <option value="girl">Girl</option>
                                            </select>
                                            {enrollErrors.gender && <p className="err-msg-v3">{enrollErrors.gender}</p>}
                                        </div>
                                        <div className="f-group">
                                            <label>Date of Birth *</label>
                                            <input name="dob" type="date" value={newPatient.dob} onChange={e => setNewPatient({ ...newPatient, dob: e.target.value })} className={`input-v3 ${enrollErrors.dob ? 'error' : ''}`} />
                                            {enrollErrors.dob && <p className="err-msg-v3">{enrollErrors.dob}</p>}
                                        </div>
                                        <div className="f-group">
                                            <label>WhatsApp Mobile *</label>
                                            <input name="wa_id" placeholder="" value={newPatient.wa_id} onChange={e => setNewPatient({ ...newPatient, wa_id: e.target.value.replace(/\D/g, '') })} className={`input-v3 ${enrollErrors.wa_id ? 'error' : ''}`} />
                                            {enrollErrors.wa_id && <p className="err-msg-v3">{enrollErrors.wa_id}</p>}
                                        </div>
                                    </div>
                                    <div className="wizard-footer-v3">
                                        <button type="button" className="btn-cancel" onClick={() => setActiveTab('patient')}>Back to Search</button>
                                        <button type="submit" className="btn-save" disabled={submitting}>Enroll & Proceed</button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleFormSubmit} className="wizard-form-v3">
                                    <div className="selected-patient-v3">
                                        <div className="p-banner">
                                            <div className="p-info">
                                                <div className="p-avatar-circle">
                                                    <User size={24} />
                                                </div>
                                                <div className="p-text">
                                                    <div className="p-name-premium">{removeSalutation(selectedPatient?.child_name)}</div>
                                                    <div className="p-id-premium">Patient ID: {selectedPatient?.patient_id}</div>
                                                </div>
                                            </div>
                                            {!editMode && (
                                                <button type="button" className="btn-modify" onClick={() => setActiveTab('patient')}>
                                                    <Edit2 size={14} />
                                                    <span>Change</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-grid-v2">
                                        <div className="f-group">
                                            <label>Assign Clinician</label>
                                            <div className="input-with-icon">
                                                <Stethoscope size={18} className="i-icon" />
                                                <select
                                                    value={form.doctor_id}
                                                    onChange={e => {
                                                        const doc = doctors.find(d => d.doctor_id === e.target.value);
                                                        setForm({ ...form, doctor_id: e.target.value, doctor_name: getDoctorDisplayName(doc) });
                                                    }}
                                                    className="select-v3-iconic"
                                                >
                                                    <option value="" disabled>Select Provider</option>
                                                    {doctors.map(doc => <option key={doc.doctor_id} value={doc.doctor_id}>{getDoctorDisplayName(doc)}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="f-group">
                                            <label>Visit Date</label>
                                            <div className="input-with-icon">
                                                <CalendarIcon size={18} className="i-icon" />
                                                <input
                                                    type="date"
                                                    value={form.appointment_date}
                                                    onChange={e => setForm({ ...form, appointment_date: e.target.value })}
                                                    className="input-v3-iconic"
                                                />
                                            </div>
                                        </div>

                                        <div className="f-group full-span">
                                            <div className="token-availability-v3 card-premium-v3">
                                                <div className="token-header">
                                                    <h3>Token Inventory Status</h3>
                                                    {tokensLoading && <RefreshCw size={16} className="animate-spin text-primary" />}
                                                </div>

                                                {availableTokens ? (
                                                    <div className="token-stats-grid">
                                                        <div className={`token-stat-card walkin active-pool`}
                                                            style={{ cursor: 'default', gridColumn: '1 / -1' }}>
                                                            <div className="stat-label">Walk-in Pool (Next Available Token)</div>
                                                            <div className="stat-value">#{availableTokens.walkin_next_token || '--'}</div>
                                                        </div>
                                                        <div className="token-info-mini" style={{ gridColumn: '1 / -1', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                            <Clock size={14} />
                                                            <span>Shift Start Time: {availableTokens.start_time || '--:--'}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="token-placeholder">
                                                        <Activity size={24} />
                                                        <p>Select provider and date to check token availability</p>
                                                    </div>
                                                )}

                                                {availableTokens && (availableTokens.online_tokens_remaining <= 0 && availableTokens.walkin_tokens_remaining <= 0) && (
                                                    <div className="token-vacancy-alert">
                                                        <AlertTriangle size={16} />
                                                        <span>No tokens available for this date. Please try for another doctor or try for next days.</span>
                                                    </div>
                                                )}

                                                <div className="staff-emergency-note">
                                                    <strong>Emergency Protocol:</strong>
                                                    <p>For emergencies, please call the hospital directly at <b>+91-XXXXXXXXXX</b> to get the urgent appointment immediately.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="f-group">
                                            <label>Visit Category</label>
                                            <div className="input-with-icon">
                                                <Activity size={18} className="i-icon" />
                                                <select
                                                    value={form.visit_category}
                                                    onChange={e => setForm({ ...form, visit_category: e.target.value })}
                                                    className="select-v3-iconic"
                                                >
                                                    <option value="First visit">First visit</option>
                                                    <option value="Follow-up">Follow-up</option>
                                                    <option value="Vaccination">Vaccination</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="f-group">
                                            <label>Clinical Reason</label>
                                            <div className="input-with-icon">
                                                <Clipboard size={18} className="i-icon" />
                                                <input
                                                    placeholder=""
                                                    value={form.reason}
                                                    onChange={e => setForm({ ...form, reason: e.target.value })}
                                                    className="input-v3-iconic"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="wizard-footer-large">
                                        <button type="button" className="btn-cancel-large" onClick={() => setActiveView('queue')}>
                                            Discard Changes
                                        </button>
                                        <button type="submit" className="btn-save-large" disabled={submitting}>
                                            {submitting ? <RefreshCw size={22} className="animate-spin" /> : <CheckCircle2 size={22} />}
                                            <span>{editMode ? 'Update Record' : 'Confirm Authorization'}</span>
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {cancelModal.show && (
                <div className="modal-overlay-premium">
                    <div className="modal-alert-card">
                        <div className="alert-icon-wrap"><Trash2 size={32} /></div>
                        <h2>Purge Reservation</h2>
                        <p>Are you sure you want to cancel appointment <strong>{cancelModal.id}</strong>? This action will immediately release the token back to the clinic capacity.</p>

                        <div className="cancel-reason-input">
                            <label>Cancellation Reason</label>
                            <input
                                placeholder=""
                                value={cancelModal.reason}
                                onChange={e => setCancelModal({ ...cancelModal, reason: e.target.value })}
                                className="input-v3"
                            />
                        </div>

                        <div className="alert-actions">
                            <button className="btn-cancel" onClick={() => setCancelModal({ show: false, id: null, reason: '' })}>Keep Booking</button>
                            <button className="btn-danger-v3" onClick={handleCancel}>Confirm Cancellation</button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default Appointments;

