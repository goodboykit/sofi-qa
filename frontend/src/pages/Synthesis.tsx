import { useEffect, useState } from 'react';
import { getDocuments, startSynthesis, getSynthesisStatus } from '../lib/api';

interface Document {
    id: string;
    name: string;
}

interface Job {
    job_id: string;
    status: string;
    progress: number;
    message: string;
}

export default function Synthesis() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
    const [synthesisType, setSynthesisType] = useState<'single' | 'multi'>('single');
    const [maxGoldens, setMaxGoldens] = useState(2);
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getDocuments().then(res => setDocuments(res.data.documents));
    }, []);

    // Poll job status
    useEffect(() => {
        if (!job || job.status === 'completed' || job.status === 'failed') return;

        const interval = setInterval(async () => {
            try {
                const res = await getSynthesisStatus(job.job_id);
                setJob(res.data);
                if (res.data.status === 'completed' || res.data.status === 'failed') {
                    clearInterval(interval);
                }
            } catch {
                clearInterval(interval);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [job]);

    const handleStart = async () => {
        if (selectedDocs.length === 0) {
            alert('Please select at least one document');
            return;
        }

        setLoading(true);
        try {
            const res = await startSynthesis({
                document_ids: selectedDocs,
                synthesis_type: synthesisType,
                max_goldens_per_context: maxGoldens,
            });
            setJob({ job_id: res.data.job_id, status: 'pending', progress: 0, message: 'Starting...' });
        } catch (error) {
            console.error('Failed to start synthesis:', error);
            alert('Failed to start synthesis. Is the API running?');
        } finally {
            setLoading(false);
        }
    };

    const toggleDoc = (id: string) => {
        setSelectedDocs(prev =>
            prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
        );
    };

    return (
        <div className="fade-in">
            <header className="page-header">
                <h1 className="page-title">Synthesis</h1>
                <p className="page-description">
                    Generate synthetic Q&A pairs from your documents
                </p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Left: Configuration */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Configuration</h2>
                    </div>

                    <div className="form-group">
                        <label>Select Documents</label>
                        {documents.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>
                                No documents available. Upload some first.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {documents.map(doc => (
                                    <label
                                        key={doc.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '12px',
                                            background: selectedDocs.includes(doc.id) ? 'var(--bg-hover)' : 'transparent',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedDocs.includes(doc.id)}
                                            onChange={() => toggleDoc(doc.id)}
                                        />
                                        <span>{doc.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Synthesis Type</label>
                        <select
                            value={synthesisType}
                            onChange={e => setSynthesisType(e.target.value as 'single' | 'multi')}
                        >
                            <option value="single">Single-Turn (Q&A pairs)</option>
                            <option value="multi">Multi-Turn (Conversations)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Max Goldens per Context</label>
                        <input
                            type="number"
                            min={1}
                            max={10}
                            value={maxGoldens}
                            onChange={e => setMaxGoldens(parseInt(e.target.value) || 2)}
                        />
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={handleStart}
                        disabled={loading || selectedDocs.length === 0 || (job?.status === 'running')}
                        style={{ width: '100%' }}
                    >
                        {loading ? 'Starting...' : job?.status === 'running' ? 'Synthesizing...' : '⚡ Start Synthesis'}
                    </button>
                </div>

                {/* Right: Progress */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Progress</h2>
                    </div>

                    {!job ? (
                        <div className="empty-state">
                            <div className="empty-icon">🚀</div>
                            <p>Configure and start synthesis to see progress here</p>
                        </div>
                    ) : (
                        <div>
                            <div style={{ marginBottom: '16px' }}>
                                <span className={`badge ${job.status === 'completed' ? 'badge-success' :
                                        job.status === 'failed' ? 'badge-error' :
                                            job.status === 'running' ? 'badge-warning' :
                                                'badge-info'
                                    }`}>
                                    {job.status.toUpperCase()}
                                </span>
                            </div>

                            <div className="progress-bar" style={{ marginBottom: '16px' }}>
                                <div
                                    className="progress-fill"
                                    style={{ width: `${job.progress}%` }}
                                />
                            </div>

                            <p style={{ color: 'var(--text-secondary)' }}>
                                {job.message}
                            </p>

                            {job.status === 'completed' && (
                                <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-hover)', borderRadius: '8px' }}>
                                    <p style={{ color: 'var(--success)' }}>
                                        ✅ Synthesis complete! View your new goldens in the Goldens page.
                                    </p>
                                </div>
                            )}

                            {job.status === 'failed' && (
                                <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                                    <p style={{ color: 'var(--error)' }}>
                                        ❌ Synthesis failed. Check the API logs for details.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
