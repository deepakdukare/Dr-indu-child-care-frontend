import React from 'react';
import FeedbackForm from '../components/FeedbackForm';

const Feedback = () => {
    return (
        <div className="feedback-overlay">
            <div className="feedback-card-v2">
                <div className="feedback-hero-v2">
                    <h2>Share Experience</h2>
                    <p>Help us calibrate our care standards for you.</p>
                </div>
                <div className="feedback-body-v3">
                    <FeedbackForm />
                </div>
            </div>
        </div>
    );
};

export default Feedback;
