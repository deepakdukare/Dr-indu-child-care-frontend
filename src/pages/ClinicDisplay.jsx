import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, RefreshCw, User, Users, Clock, Hash, ArrowRight, Activity, Zap } from 'lucide-react';
import { getClinicDisplayData, toIsoDate } from '../api/index';
import { removeSalutation } from '../utils/formatters';
import clinicLogo from '../assets/clinic_logo.png';

const ClinicDisplay = () => {
    const [displayData, setDisplayData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchData = useCallback(async () => {
        try {
            const today = toIsoDate();
            const res = await getClinicDisplayData({ date: today });
            setDisplayData(res.data?.display || res.data?.data || []);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            console.error('Display Data Error:', err);
            setError('Syncing...');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, [fetchData]);

    const getTimeStr = () => lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="clinic-display-v2" style={{ padding: '2rem', minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="display-grid-v2" style={{ width: '100%' }}>
                {displayData.map((doctor) => (
                    <div key={doctor.doctor_id} className="doctor-card-v2">
                        <div className="card-top-v2">
                            <div className="doctor-info-v2">
                                <h2 className="doctor-name-v2">{doctor.doctor_name}</h2>
                                <span className="speciality-tag-v2">{doctor.speciality || 'Pediatrics'}</span>
                            </div>
                            <div className={`status-pill-v2 ${doctor.status === 'PRESENT' ? 'online' : 'away'}`}>
                                {doctor.status === 'PRESENT' ? 'In-Session' : 'On-Break'}
                            </div>
                        </div>

                        <div className="serving-section-v2">
                            <div className="serving-label-v2">NOW SERVING</div>
                            <div className="serving-token-v2">
                                {doctor.now_serving_token ? (
                                    <>
                                        <Hash size={40} className="hash-icon-v2" />
                                        <span>{doctor.now_serving_token}</span>
                                    </>
                                ) : (
                                    <span className="empty-val-v2">—</span>
                                )}
                            </div>
                            <div className="patient-name-v2">
                                {removeSalutation(doctor.now_serving_patient) || 'Waiting for next patient'}
                            </div>
                        </div>

                        <div className="card-stats-v2">
                            <div className="stat-item-v2">
                                <Users size={20} />
                                <span>{doctor.queue_length || 0} in queue</span>
                            </div>
                            <div className="stat-divider-v2"></div>
                            <div className="stat-item-v2">
                                <Clock size={20} />
                                <span>{doctor.eta_time || 'No Delay'}</span>
                            </div>
                        </div>

                        <div className="next-up-v2">
                            <div className="next-label-v2">NEXT UP</div>
                            <div className="next-token-v2">
                                {doctor.next_token ? `Token ${doctor.next_token}` : 'Queue Empty'}
                            </div>
                        </div>
                    </div>
                ))}

                {displayData.length === 0 && !loading && (
                    <div className="empty-display-v2" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#64748b', opacity: 0.5, marginTop: '20vh' }}>
                        <Monitor size={64} style={{ marginBottom: '1.5rem' }} />
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>No Active O.P.D Handlers</h3>
                        <p style={{ marginTop: '0.5rem', fontSize: '1.1rem' }}>Waiting for doctors to start their sessions.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClinicDisplay;
