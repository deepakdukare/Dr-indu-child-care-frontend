import React, { useState, useEffect } from 'react';
import { getPracticeInsights, toIsoDate } from '../api/index';
import { TrendingUp, Users, Calendar, Activity, ArrowUpRight, ArrowDownRight, Filter, Download, PieChart, BarChart, LineChart, Target, Loader2, Hash, Clock } from 'lucide-react';



const Analytics = () => {
    const [insightData, setInsightData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchInsights();
    }, []);

    const fetchInsights = async () => {
        try {
            setLoading(true);
            const response = await getPracticeInsights();
            if (response.data?.success) {
                setInsightData(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError('Failed to load practice insights.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '80vh', flexDirection: 'column', gap: '1rem' }}>
                <Loader2 className="animate-spin" size={40} color="#6366f1" />
                <p>Analyzing practice data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-center" style={{ height: '80vh', color: '#ef4444' }}>
                <Activity size={40} />
                <p style={{ marginLeft: '1rem' }}>{error}</p>
            </div>
        );
    }

    const { metrics, timeline, categories } = insightData || {};

    const cards = [
        {
            title: 'Total Patients',
            value: metrics?.total_patients?.toLocaleString() || '0',
            sub: 'Lifetime registrations',
            icon: Users,
            color: '#6366f1',
            trend: 'up'
        },
        {
            title: 'New This Month',
            value: metrics?.monthly_new?.toString() || '0',
            sub: `${metrics?.growth_percentage}% growth rate`,
            icon: TrendingUp,
            color: '#10b981',
            trend: 'up'
        },
        {
            title: 'Today\'s Tokens',
            value: metrics?.today_tokens?.toString() || '0',
            sub: 'Queue utilization today',
            icon: Hash,
            color: '#ec4899',
            trend: 'up'
        },
        {
            title: 'Avg. Wait Time',
            value: `${metrics?.avg_wait_time || 0}m`,
            sub: 'Across all departments',
            icon: Clock,
            color: '#8b5cf6',
            trend: 'down'
        },
        {
            title: 'Reporting Health',
            value: 'Optimal',
            sub: 'Data synced successfully',
            icon: Activity,
            color: '#f59e0b',
            trend: 'up'
        },
    ];

    // Prepare category distribution data
    const totalVisits = Object.values(categories || {}).reduce((a, b) => a + b, 0);
    const categoryColors = {
        'Consultation': '#6366f1',
        'Vaccination': '#10b981',
        'Follow-up': '#f59e0b',
        'General': '#94a3b8'
    };

    return (
        <div className="analytics-page">
            <div className="analytics-header">
                <div>
                    <h1>Practice Insights</h1>
                    <p>Advanced metrics and clinical performance overview.</p>
                </div>
                <div className="header-actions">
                    <div className="date-picker-mini">
                        <Calendar size={16} />
                        <span>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                    </div>
                    <button className="btn-export" onClick={() => window.print()}>
                        <Download size={16} />
                        Print Overview
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                {cards.map((card, i) => (
                    <div key={i} className="stat-card-v5">
                        <div className="card-inner">
                            <div className="stat-icon" style={{ background: `${card.color}15`, color: card.color }}>
                                <card.icon size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-label">{card.title}</span>
                                <div className="stat-value">{card.value}</div>
                                <div className={`stat-trend ${card.trend}`}>
                                    {card.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    <span>{card.sub}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="analytics-main-grid">
                <div className="chart-panel wide">
                    <div className="panel-head">
                        <h3>Last 7 Days Appointment Volume</h3>
                        <div className="tabs-mini">
                            <button className="active">Week</button>
                        </div>
                    </div>
                    <div className="fake-chart-container">
                        <div className="fake-lines">
                            {(timeline || []).map((point, i) => {
                                // Find max for scaling
                                const max = Math.max(...timeline.map(p => p.count), 1);
                                const height = (point.count / max) * 100;
                                return (
                                    <div key={i} className="bar-wrapper">
                                        <div className="bar" style={{ height: `${Math.max(5, height)}%` }}>
                                            <div className="bar-tooltip">{point.count} Appts</div>
                                        </div>
                                        <span className="bar-label">{point.day}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="chart-panel">
                    <div className="panel-head">
                        <h3>Case Mix Distribution</h3>
                    </div>
                    {totalVisits > 0 ? (
                        <div className="donut-container">
                            <div className="donut-rings">
                                {Object.entries(categories || {}).reduce((acc, [name, count], idx) => {
                                    const percentage = (count / totalVisits) * 100;
                                    const color = categoryColors[name] || categoryColors['General'];
                                    const rotation = acc.cumulative;
                                    acc.elements.push(
                                        <div key={name} className="ring"
                                            style={{
                                                '--p': percentage,
                                                '--c': color,
                                                transform: `rotate(${rotation}deg)`,
                                                zIndex: 10 - idx
                                            }}
                                        ></div>
                                    );
                                    acc.cumulative += (percentage / 100) * 360;
                                    return acc;
                                }, { elements: [], cumulative: 0 }).elements}
                                <div className="donut-center">
                                    <strong>{totalVisits}</strong>
                                    <span>{totalVisits === 1 ? 'Visit' : 'Visits'}</span>
                                </div>
                            </div>
                            <div className="donut-legend">
                                {Object.entries(categories || {}).map(([name, count]) => (
                                    <div key={name} className="legend-item">
                                        <span className="dot" style={{ background: categoryColors[name] || categoryColors['General'] }}></span>
                                        <span>{name} ({((count / totalVisits) * 100).toFixed(0)}%)</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-center" style={{ height: '200px', color: '#94a3b8' }}>
                            No data for this month
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
