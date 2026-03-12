import React from 'react';
import {
    User, Phone, Mail, MapPin, Calendar, Users,
    Shield, ShieldCheck, Heart, AlertCircle, RefreshCw, X,
    Zap, Briefcase, Activity, ChevronDown, Check, ClipboardList
} from 'lucide-react';
import { hasPermission } from '../utils/auth';

const SALUTATIONS = ['Baby', 'Baby of', 'Mr.', 'Mrs.', 'Ms.', 'Master', 'Miss', 'Dr.'];
const GENDERS = ['boy', 'girl'];
const ENROLLMENT_OPTIONS = [
    { value: 'just_enroll', label: 'Register Patient Only' },
    { value: 'book_appointment', label: 'Register & Book Appointment' }
];

export const EMPTY_FORM = {
    salutation: 'Master',
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: 'boy',
    dob: '',
    father_name: '',
    mother_name: '',
    wa_id: '',
    primary_mobile: '',
    email: '',
    doctor: '',
    remarks: '',
    enrollment_option: 'just_enroll',
    referred_by: '',
    state: 'Maharashtra',
    city: 'Mumbai',
    pincode: '',
    address: ''
};

const PatientForm = ({
    form = EMPTY_FORM,
    setForm = () => { },
    onSubmit,
    onCancel,
    onBlur,
    submitting,
    editId,
    doctors = [],
    referringDoctors = [],
    errors = {}
}) => {
    const handleFormSubmit = (e) => {
        if (onSubmit) onSubmit(e);
    };

    const safeForm = form || EMPTY_FORM;

    return (
        <form onSubmit={handleFormSubmit} className="premium-enrollment-form">
            <div className="enrollment-body-v4">
                {/* Section 1: Child Identification */}
                <div className="enrollment-section-v4">
                    <div className="section-header-v4">
                        <div className="section-icon-v4"><User size={22} /></div>
                        <div className="section-title-box">
                            <span className="step-tag">Step 01</span>
                            <h3>Child Identification</h3>
                        </div>
                    </div>

                    <div className="grid-layout-v4">
                        <div className="f-group-v4">
                            <label>Salut.</label>
                            <div className="input-wrap-v4">
                                <select value={safeForm.salutation || ''} onChange={e => setForm({ ...safeForm, salutation: e.target.value })} className="select-v4">
                                    {SALUTATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown size={18} className="drop-arrow-v4" />
                            </div>
                        </div>

                        <div className="f-group-v4 col-span-2">
                            <label>First Name *</label>
                            <input
                                name="first_name"
                                value={safeForm.first_name || ''}
                                onBlur={onBlur}
                                onChange={e => setForm({ ...safeForm, first_name: e.target.value })}
                                className={`input-v4 ${errors.first_name ? 'error' : ''}`}
                            />
                            {errors.first_name && <span className="error-msg-v4">{errors.first_name}</span>}
                        </div>

                        <div className="f-group-v4">
                            <label>Middle Name</label>
                            <input value={safeForm.middle_name || ''} onChange={e => setForm({ ...safeForm, middle_name: e.target.value })} className="input-v4" />
                        </div>

                        <div className="f-group-v4 col-span-2">
                            <label>Last Name *</label>
                            <input
                                name="last_name"
                                value={safeForm.last_name || ''}
                                onBlur={onBlur}
                                onChange={e => setForm({ ...safeForm, last_name: e.target.value })}
                                className={`input-v4 ${errors.last_name ? 'error' : ''}`}
                            />
                            {errors.last_name && <span className="error-msg-v4">{errors.last_name}</span>}
                        </div>

                        <div className="f-group-v4">
                            <label>Gender *</label>
                            <div className="input-wrap-v4">
                                <select name="gender" value={safeForm.gender || ''} onBlur={onBlur} onChange={e => setForm({ ...safeForm, gender: e.target.value })} className={`select-v4 ${errors.gender ? 'error' : ''}`}>
                                    <option value="boy">Boy</option>
                                    <option value="girl">Girl</option>
                                </select>
                                <ChevronDown size={18} className="drop-arrow-v4" />
                            </div>
                            {errors.gender && <span className="error-msg-v4">{errors.gender}</span>}
                        </div>

                        <div className="f-group-v4">
                            <label>Date of Birth *</label>
                            <div className="input-wrap-v4">
                                <Calendar size={18} className="input-icon-v4" />
                                <input
                                    name="dob"
                                    type="date"
                                    value={safeForm.dob || ''}
                                    onBlur={onBlur}
                                    onChange={e => setForm({ ...safeForm, dob: e.target.value })}
                                    className={`input-v4 has-icon ${errors.dob ? 'error' : ''}`}
                                />
                            </div>
                            {errors.dob && <span className="error-msg-v4">{errors.dob}</span>}
                        </div>
                    </div>
                </div>

                {/* Section 2: Parental Hierarchy */}
                <div className="enrollment-section-v4">
                    <div className="section-header-v4">
                        <div className="section-icon-v4 s-blue"><Users size={22} /></div>
                        <div className="section-title-box">
                            <span className="step-tag s-blue">Step 02</span>
                            <h3>Parental Hierarchy</h3>
                        </div>
                    </div>

                    <div className="grid-layout-v4">
                        <div className="f-group-v4 col-span-2">
                            <label>Father's Name *</label>
                            <input
                                name="father_name"
                                value={safeForm.father_name || ''}
                                onBlur={onBlur}
                                onChange={e => setForm({ ...safeForm, father_name: e.target.value })}
                                className={`input-v4 ${errors.father_name ? 'error' : ''}`}
                            />
                            {errors.father_name && <span className="error-msg-v4">{errors.father_name}</span>}
                        </div>
                        <div className="f-group-v4 col-span-2">
                            <label>Mother's Name *</label>
                            <input
                                name="mother_name"
                                value={safeForm.mother_name || ''}
                                onBlur={onBlur}
                                onChange={e => setForm({ ...safeForm, mother_name: e.target.value })}
                                className={`input-v4 ${errors.mother_name ? 'error' : ''}`}
                            />
                            {errors.mother_name && <span className="error-msg-v4">{errors.mother_name}</span>}
                        </div>
                    </div>
                </div>

                {/* Section 3: Communication */}
                <div className="enrollment-section-v4">
                    <div className="section-header-v4">
                        <div className="section-icon-v4 s-orange"><Users size={22} /></div>
                        <div className="section-title-box">
                            <span className="step-tag s-orange">Step 03</span>
                            <h3>Communication</h3>
                        </div>
                    </div>

                    <div className="grid-layout-v4">

                        {(!editId || hasPermission('view_patient_mobile')) && (
                            <div className="f-group-v4 col-span-2">
                                <label>WhatsApp ID / Mobile *</label>
                                <div className="input-wrap-v4">
                                    <Zap size={18} className="input-icon-v4 w-accent" />
                                    <input
                                        name="wa_id"
                                        value={safeForm.wa_id || ''}
                                        onBlur={onBlur}
                                        onChange={e => setForm({ ...safeForm, wa_id: e.target.value.replace(/\D/g, ''), primary_mobile: e.target.value.replace(/\D/g, '') })}
                                        className={`input-v4 has-icon ${errors.wa_id ? 'error' : ''}`}
                                    />
                                </div>
                                {errors.wa_id && <span className="error-msg-v4">{errors.wa_id}</span>}
                            </div>
                        )}
                        <div className="f-group-v4 col-span-2">
                            <label>Comm. Preference</label>
                            <div className="input-wrap-v4">
                                <select value={safeForm.communication_preference || 'WhatsApp'} onChange={e => setForm({ ...safeForm, communication_preference: e.target.value })} className="select-v4">
                                    <option value="WhatsApp">WhatsApp</option>
                                    <option value="SMS">SMS</option>
                                    <option value="Email">Email</option>
                                </select>
                                <ChevronDown size={18} className="drop-arrow-v4" />
                            </div>
                        </div>
                        {(!editId || hasPermission('view_patient_email')) && (
                            <div className="f-group-v4 col-span-2">
                                <label>Email Address *</label>
                                <div className="input-wrap-v4">
                                    <Mail size={18} className="input-icon-v4" />
                                    <input
                                        name="email"
                                        type="email"
                                        value={safeForm.email || ''}
                                        onBlur={onBlur}
                                        onChange={e => setForm({ ...safeForm, email: e.target.value })}
                                        className={`input-v4 has-icon ${errors.email ? 'error' : ''}`}
                                    />
                                </div>
                                {errors.email && <span className="error-msg-v4">{errors.email}</span>}
                            </div>
                        )}
                        <div className="f-group-v4 col-span-2">
                            <label>Preferred Doctor</label>
                            <div className="input-wrap-v4">
                                <Activity size={18} className="input-icon-v4" />
                                <select
                                    name="doctor"
                                    value={safeForm.doctor || ''}
                                    onChange={e => setForm({ ...safeForm, doctor: e.target.value })}
                                    className="select-v4 has-icon"
                                >
                                    <option value="">— Select Doctor —</option>
                                    {doctors.map((d, idx) => {
                                        const docName = d.full_name || d.name || 'Doctor';
                                        return <option key={d._id || d.doctor_id || `doc-${idx}`} value={docName}>{docName}</option>;
                                    })}
                                </select>
                                <ChevronDown size={18} className="drop-arrow-v4" />
                            </div>
                        </div>
                        <div className="f-group-v4 col-span-2">
                            <label>Remarks / Notes</label>
                            <div className="input-wrap-v4">
                                <ClipboardList size={18} className="input-icon-v4" />
                                <input value={safeForm.remarks || ''} onChange={e => setForm({ ...safeForm, remarks: e.target.value })} className="input-v4 has-icon" />
                            </div>
                        </div>
                        <div className="f-group-v4 col-span-2">
                            <label>Enrollment Option</label>
                            <div className="input-wrap-v4">
                                <select value={safeForm.enrollment_option || 'just_enroll'} onChange={e => setForm({ ...safeForm, enrollment_option: e.target.value })} className="select-v4">
                                    <option value="just_enroll">Register Patient Only</option>
                                    <option value="book_appointment">Register & Book Appointment</option>
                                </select>
                                <ChevronDown size={18} className="drop-arrow-v4" />
                            </div>
                        </div>
                        <div className="f-group-v4 col-span-2">
                            <label>Referred by Patient</label>
                            <div className="input-wrap-v4">
                                <Users size={18} className="input-icon-v4" />
                                <input
                                    value={safeForm.referred_by || ''}
                                    onChange={e => setForm({ ...safeForm, referred_by: e.target.value })}
                                    className="input-v4 has-icon"
                                    placeholder="Enter referring patient name"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 4: Address Details */}
                <div className="enrollment-section-v4">
                    <div className="section-header-v4">
                        <div className="section-icon-v4 s-green"><MapPin size={22} /></div>
                        <div className="section-title-box">
                            <span className="step-tag s-green">Step 04</span>
                            <h3>Address Details</h3>
                        </div>
                    </div>

                    <div className="grid-layout-v4">
                        <div className="f-group-v4 col-span-2">
                            <label>State</label>
                            <input
                                name="state"
                                value={safeForm.state || ''}
                                onChange={e => setForm({ ...safeForm, state: e.target.value })}
                                className="input-v4"
                                placeholder="State"
                            />
                        </div>
                        <div className="f-group-v4 col-span-2">
                            <label>City *</label>
                            <input
                                name="city"
                                value={safeForm.city || ''}
                                onBlur={onBlur}
                                onChange={e => setForm({ ...safeForm, city: e.target.value })}
                                className={`input-v4 ${errors.city ? 'error' : ''}`}
                                placeholder="City"
                            />
                            {errors.city && <span className="error-msg-v4">{errors.city}</span>}
                        </div>
                        <div className="f-group-v4 col-span-2">
                            <label>Pincode *</label>
                            <input
                                name="pincode"
                                value={safeForm.pincode || ''}
                                onBlur={onBlur}
                                onChange={e => setForm({ ...safeForm, pincode: e.target.value.replace(/\D/g, '') })}
                                className={`input-v4 ${errors.pincode ? 'error' : ''}`}
                                placeholder="6-digit pincode"
                            />
                            {errors.pincode && <span className="error-msg-v4">{errors.pincode}</span>}
                        </div>
                        <div className="f-group-v4 col-span-full">
                            <label>Address *</label>
                            <textarea
                                name="address"
                                value={safeForm.address || safeForm.residential_address || ''}
                                onBlur={onBlur}
                                onChange={e => setForm({ ...safeForm, address: e.target.value })}
                                className={`input-v4 ${errors.address ? 'error' : ''}`}
                                style={{ minHeight: '100px', resize: 'vertical' }}
                                placeholder="Door no, Street, Landmark..."
                            />
                            {errors.address && <span className="error-msg-v4">{errors.address}</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="enrollment-footer-v4">
                <button type="button" onClick={onCancel} className="btn-cancel-v4">
                    <X size={18} />
                    <span>Discard Enrollment</span>
                </button>
                <button type="submit" className="btn-save-v4" disabled={submitting}>
                    {submitting ? (
                        <RefreshCw size={24} className="animate-spin" />
                    ) : (
                        <div className="btn-content-v4">
                            <Shield size={22} />
                            <span>{editId ? 'Sync Updates' : 'Save Patient'}</span>
                        </div>
                    )}
                </button>
            </div>
        </form>
    );
};

export default PatientForm;

