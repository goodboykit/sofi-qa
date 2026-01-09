import { useEffect, useState } from 'react';
import { getHealth, getGoldens, getDocuments } from '../lib/api';

interface Stats {
    documents: number;
    singleTurnGoldens: number;
    multiTurnGoldens: number;
    apiStatus: 'healthy' | 'error' | 'loading';
}

export default function Dashboard() {
    const [stats, setStats] = useState<Stats>({
        documents: 0,
        singleTurnGoldens: 0,
        multiTurnGoldens: 0,
        apiStatus: 'loading',
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [healthRes, goldensRes, docsRes] = await Promise.all([
                    getHealth(),
                    getGoldens(),
                    getDocuments(),
                ]);

                setStats({
                    documents: docsRes.data.documents.length,
                    singleTurnGoldens: goldensRes.data.single_turn.length,
                    multiTurnGoldens: goldensRes.data.multi_turn.length,
                    apiStatus: healthRes.data.status === 'healthy' ? 'healthy' : 'error',
                });
            } catch {
                setStats(prev => ({ ...prev, apiStatus: 'error' }));
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="fade-in">
            <header className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-description">
                    Overview of your synthetic QA data generation
                </p>
            </header>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats.documents}</div>
                    <div className="stat-label">Source Documents</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.singleTurnGoldens}</div>
                    <div className="stat-label">Single-Turn Goldens</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.multiTurnGoldens}</div>
                    <div className="stat-label">Multi-Turn Goldens</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                        {stats.apiStatus === 'loading' ? (
                            <span className="spinner" />
                        ) : stats.apiStatus === 'healthy' ? (
                            '✅ Online'
                        ) : (
                            '❌ Offline'
                        )}
                    </div>
                    <div className="stat-label">API Status</div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Quick Start</h2>
                </div>
                <ol style={{ color: 'var(--text-secondary)', paddingLeft: '20px' }}>
                    <li style={{ marginBottom: '12px' }}>
                        <strong>Upload Documents</strong> — Add PDF or DOCX files containing your knowledge base
                    </li>
                    <li style={{ marginBottom: '12px' }}>
                        <strong>Run Synthesis</strong> — Generate Q&A pairs using AI
                    </li>
                    <li style={{ marginBottom: '12px' }}>
                        <strong>Review Goldens</strong> — Browse and edit generated question-answer pairs
                    </li>
                    <li>
                        <strong>Evaluate</strong> — Run tests against your chatbot (via CLI)
                    </li>
                </ol>
            </div>

            {stats.apiStatus === 'error' && (
                <div className="card" style={{ borderColor: 'var(--error)' }}>
                    <h3 style={{ color: 'var(--error)', marginBottom: '12px' }}>⚠️ API Not Running</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Start the backend server to use this dashboard:
                    </p>
                    <code style={{
                        display: 'block',
                        background: 'var(--bg-secondary)',
                        padding: '16px',
                        borderRadius: '8px',
                        fontFamily: 'monospace'
                    }}>
                        cd /Users/goodboykit/Documents/sofi-qa<br />
                        source .venv/bin/activate<br />
                        uvicorn src.api:app --reload --port 8000
                    </code>
                </div>
            )}
        </div>
    );
}
