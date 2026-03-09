import React, { useState } from 'react';
import { Star, Send, User, Phone, Smile, RefreshCw, Activity } from 'lucide-react';
import { submitFeedback } from '../api/index';

const FeedbackForm = ({ appointmentId = null, onComplete = null }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hover, setHover] = useState({ doctor: 0, frontdesk: 0, hospital: 0 });

    const [form, setForm] = useState({
        name: '',
        mobile: '',
        doctor_rating: 0,
        frontdesk_rating: 0,
        hospital_rating: 0,
        appointment_id: appointmentId
    });

    const categories = [
        { key: 'doctor_rating', label: 'Doctor Interaction', hoverKey: 'doctor' },
        { key: 'frontdesk_rating', label: 'Front-desk Service', hoverKey: 'frontdesk' },
        { key: 'hospital_rating', label: 'Clinic Atmosphere', hoverKey: 'hospital' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.doctor_rating === 0 || form.frontdesk_rating === 0 || form.hospital_rating === 0) {
            setError("Please provide all ratings before submitting.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await submitFeedback(form);
            setStep(2);
            if (onComplete) onComplete();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to submit feedback. Check your connectivity.");
        } finally {
            setLoading(false);
        }
    };

    if (step === 2) {
        return (
            <div className="success-state-v2">
                <div className="success-icon-v2">
                    <Smile size={42} />
                </div>
                <h3>Heartfelt Thanks!</h3>
                <p>Your feedback has been synchronized with our care standards. We appreciate your time.</p>
                <button
                    onClick={() => {
                        setStep(1);
                        setForm({ name: '', mobile: '', doctor_rating: 0, frontdesk_rating: 0, hospital_rating: 0 });
                    }}
                    className="btn-reset-v2"
                >
                    <RefreshCw size={18} />
                    Submit another entry
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="feedback-form-comp">
            <div className="feedback-section-v2">
                <span className="feedback-label-v2">Patient Context</span>
                <div className="feedback-input-group">
                    <label>Full Name</label>
                    <div className="feedback-input-wrap">
                        <User size={18} className="feedback-icon-box" />
                        <input
                            type="text"
                            required
                            placeholder="e.g. Rahul Sharma"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="feedback-field"
                        />
                    </div>
                </div>
                <div className="feedback-input-group">
                    <label>Mobile Number</label>
                    <div className="feedback-input-wrap">
                        <Phone size={18} className="feedback-icon-box" />
                        <input
                            type="tel"
                            required
                            placeholder="Registered mobile"
                            value={form.mobile}
                            onChange={e => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })}
                            className="feedback-field"
                        />
                    </div>
                </div>
            </div>

            <div className="feedback-section-v2">
                <span className="feedback-label-v2">Service Calibration</span>
                <div className="rating-grid-v2">
                    {categories.map((cat) => (
                        <div key={cat.key} className="rating-item-v2">
                            <label>{cat.label}</label>
                            <div className="star-strip-v2">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        className={`star-btn-v2 ${(hover[cat.hoverKey] || form[cat.key]) >= s ? 'active' : ''}`}
                                        onClick={() => setForm({ ...form, [cat.key]: s })}
                                        onMouseEnter={() => setHover({ ...hover, [cat.hoverKey]: s })}
                                        onMouseLeave={() => setHover({ ...hover, [cat.hoverKey]: 0 })}
                                    >
                                        <Star size={22} fill={(hover[cat.hoverKey] || form[cat.key]) >= s ? 'currentColor' : 'none'} strokeWidth={2.5} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {error && (
                <div className="doc-alert doc-alert-error" style={{ marginBottom: '1.5rem' }}>
                    <Activity size={16} />
                    <span>{error}</span>
                </div>
            )}

            <div className="feedback-footer-v2">
                <button type="submit" disabled={loading} className="btn-submit-v2">
                    {loading ? <RefreshCw className="spinning" /> : <><span>Sync Feedback</span> <Send size={20} /></>}
                </button>
            </div>
        </form>
    );
};

export default FeedbackForm;
