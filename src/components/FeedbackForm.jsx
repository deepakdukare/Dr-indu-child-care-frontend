import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Send, User, Phone, Smile, RefreshCw, Activity, ArrowRight, BriefcaseMedical, Headphones, HeartPulse } from 'lucide-react';
import { submitFeedback } from '../api/index';
import doctorAvatar from '../assets/doctor-avatar.png';
import frontdeskAvatar from '../assets/frontdesk-avatar.png';
import clinicIcon from '../assets/clinic-icon.png';

const FeedbackForm = ({ appointmentId = null, onComplete = null }) => {
    const navigate = useNavigate();
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
        { key: 'doctor_rating', label: 'Doctor Interaction', hoverKey: 'doctor', icon: <BriefcaseMedical size={20} /> },
        { key: 'frontdesk_rating', label: 'Front-desk Service', hoverKey: 'frontdesk', icon: <Headphones size={20} /> },
        { key: 'hospital_rating', label: 'Clinic Atmosphere', hoverKey: 'hospital', icon: <HeartPulse size={20} /> }
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
                    <Smile size={64} />
                </div>
                <h3>Feedback Submitted!</h3>
                <p>Thank you for sharing your experience with us.</p>
                <div style={{ marginTop: '2rem' }}>
                    <RefreshCw className="spinning" size={32} style={{ color: '#6366f1' }} />
                </div>
                {setTimeout(() => { if (onComplete) onComplete(); else navigate('/'); }, 3000) && null}
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="feedback-form-comp">
            <div className="feedback-form-card">
                <div className="feedback-hero-v2">
                    <h2>Share Experience</h2>
                    <p>Help us calibrate our care standards for you.</p>
                </div>

                <div className="feedback-divider-v2"></div>

                <div className="feedback-section-v2">
                    <div className="feedback-input-group">
                        <label>Full Name</label>
                        <div className="feedback-input-wrap">
                            <input
                                type="text"
                                required
                                placeholder="Full Name"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                className="feedback-field"
                            />
                        </div>
                    </div>
                    <div className="feedback-input-group">
                        <label>Mobile Number</label>
                        <div className="feedback-input-wrap">
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
                    <div className="feedback-input-group">
                        <label>Email Address</label>
                        <div className="feedback-input-wrap">
                            <input
                                type="email"
                                placeholder="Email (optional)"
                                value={form.email || ''}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                className="feedback-field"
                            />
                        </div>
                    </div>
                </div>

                <div className="feedback-divider-v2"></div>

                <div className="feedback-section-v2">
                    <span className="feedback-label-v2">Service Calibration</span>
                    <div className="rating-grid-v2">
                        {categories.map((cat) => (
                            <div key={cat.key} className="rating-item-v2">
                                <div className="rating-cat-head">
                                    <div className="rating-cat-icon">
                                        {cat.key === 'doctor_rating' && <img src={doctorAvatar} alt="Doctor" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />}
                                        {cat.key === 'frontdesk_rating' && <img src={frontdeskAvatar} alt="Front-desk" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />}
                                        {cat.key === 'hospital_rating' && <img src={clinicIcon} alt="Clinic" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />}
                                    </div>
                                    <label>{cat.label}</label>
                                </div>
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
                                            <Star 
                                                size={44} 
                                                fill={(hover[cat.hoverKey] || form[cat.key]) >= s ? 'currentColor' : '#e2e8f0'} 
                                                stroke="none"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="feedback-divider-v2"></div>

                {error && (
                    <div className="doc-alert doc-alert-error" style={{ marginBottom: '1.5rem', borderRadius: '12px' }}>
                        <Activity size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="feedback-footer-v2">
                    <button type="submit" disabled={loading} className="btn-submit-v2">
                        {loading ? <RefreshCw className="spinning" /> : <><span>Submit Feedback</span> <Send size={20} /></>}
                    </button>
                </div>
            </div>
        </form>
    );
};

export default FeedbackForm;
