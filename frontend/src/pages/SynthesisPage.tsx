import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Icons } from '../components/common/Icons';
import type { LogEntry, Results, Config, Document } from '../types';

interface SynthesisPageProps {
    status: 'online' | 'offline' | 'checking';
    documents: Document[];
    config: Config;
    onSynthesisComplete: (single: any[], multi: any[]) => void;
    logs: LogEntry[];
    setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
}

export function SynthesisPage({ status, documents, config, onSynthesisComplete, logs, setLogs }: SynthesisPageProps) {
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<Results | null>(null);
    const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

    // Initialize selection when documents load
    useEffect(() => {
        if (documents.length > 0) {
            // Only update if selection is empty (first load) or allow preserving selection?
            // For simplicity and "live" feel, let's select all new docs if selection was empty
            if (selectedDocs.length === 0) {
                setSelectedDocs(documents.map(d => d.id));
            }
        }
    }, [documents]);

    const consoleRef = useRef<HTMLDivElement>(null);
    const logId = useRef(0);
    const currentJobIds = useRef<string[]>([]);
    const shouldStop = useRef(false);

    // Auto-scroll logs
    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [logs]);

    const log = (message: string, type: LogEntry['type'] = 'info') => {
        const time = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
        setLogs(prev => [...prev, { id: logId.current++, time, message, type }]);
    };

    const getIcon = (type: LogEntry['type']) => {
        switch (type) {
            case 'success': return Icons.check;
            case 'error': return Icons.x;
            case 'warning': return Icons.alert;
            case 'primary': return Icons.arrow;
            default: return Icons.info;
        }
    };

    const start = async () => {
        if (status !== 'online') {
            log('Backend not available', 'error');
            return;
        }

        setRunning(true);
        setProgress(0);
        setResults(null);
        setLogs([]);
        shouldStop.current = false;
        currentJobIds.current = [];

        const startTime = Date.now();
        log('Starting synthesis pipeline', 'primary');

        try {
            // Check documents
            log('Scanning documents');
            setProgress(10);

            const docsToProcess = documents.filter(d => selectedDocs.includes(d.id));

            if (docsToProcess.length === 0) {
                log('No documents selected', 'warning');
                log('Please select at least one document to proceed', 'info');
                setRunning(false);
                return;
            }

            log(`Processing ${docsToProcess.length} document(s)`, 'success');
            setProgress(20);

            // Single-turn
            log('Generating single-turn Q&A', 'primary');
            const ids = docsToProcess.map(d => d.id);

            const job1 = await axios.post('http://localhost:8000/api/synthesis/start', {
                document_ids: ids,
                synthesis_type: 'single',
                max_goldens_per_context: 2,
                config: config
            });

            currentJobIds.current.push(job1.data.job_id);
            log(`Job ${job1.data.job_id} started`);
            setProgress(30);

            let done1 = false;
            let result1Data = [];
            while (!done1 && !shouldStop.current) {
                await new Promise(r => setTimeout(r, 2000));
                if (shouldStop.current) break;

                const res = await axios.get(`http://localhost:8000/api/synthesis/status/${job1.data.job_id}`);

                if (res.data.status === 'running') {
                    log(res.data.message);
                    setProgress(p => Math.min(p + 5, 45));
                } else if (res.data.status === 'completed') {
                    done1 = true;
                    result1Data = res.data.result?.data || [];
                    log(`Single-turn: ${res.data.result?.count || 0} pairs`, 'success');
                    setProgress(50);
                } else if (res.data.status === 'failed' || res.data.status === 'cancelled') {
                    throw new Error(res.data.message);
                }
            }

            if (shouldStop.current) {
                log('Synthesis stopped by user', 'warning');
                return;
            }

            // Multi-turn
            log('Generating multi-turn conversations', 'primary');

            const job2 = await axios.post('http://localhost:8000/api/synthesis/start', {
                document_ids: ids,
                synthesis_type: 'multi',
                max_goldens_per_context: 3,
                config: config
            });

            currentJobIds.current.push(job2.data.job_id);
            log(`Job ${job2.data.job_id} started`);
            setProgress(60);

            let done2 = false;
            let result2Data = [];
            while (!done2 && !shouldStop.current) {
                await new Promise(r => setTimeout(r, 2000));
                if (shouldStop.current) break;

                const res = await axios.get(`http://localhost:8000/api/synthesis/status/${job2.data.job_id}`);

                if (res.data.status === 'running') {
                    log(res.data.message);
                    setProgress(p => Math.min(p + 5, 85));
                } else if (res.data.status === 'completed') {
                    done2 = true;
                    result2Data = res.data.result?.data || [];
                    log(`Multi-turn: ${res.data.result?.count || 0} conversations`, 'success');
                    setProgress(90);
                } else if (res.data.status === 'failed' || res.data.status === 'cancelled') {
                    throw new Error(res.data.message);
                }
            }

            if (shouldStop.current) {
                log('Synthesis stopped by user', 'warning');
                return;
            }

            // Results
            log('Finalizing');
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);

            setResults({
                singleTurn: result1Data.length,
                multiTurn: result2Data.length,
                duration: `${duration}s`
            });

            // Save to parent state
            onSynthesisComplete(result1Data, result2Data);

            setProgress(100);
            log(`Completed in ${duration}s`, 'success');
            log('Output: Saved to Session Storage', 'success');

        } catch (err) {
            if (!shouldStop.current) {
                log(err instanceof Error ? err.message : 'Error occurred', 'error');
            }
        } finally {
            setRunning(false);
            currentJobIds.current = [];
        }
    };

    const stop = async () => {
        shouldStop.current = true;
        log('Stopping synthesis...', 'warning');

        for (const jobId of currentJobIds.current) {
            try {
                await axios.post(`http://localhost:8000/api/synthesis/cancel/${jobId}`);
                log(`Job ${jobId} cancelled`, 'warning');
            } catch {
                // Job may have already completed
            }
        }
        setRunning(false);
    };

    return (
        <main className="main">
            {/* Hero */}
            <div className="hero-card">
                <div className="hero-content">
                    <h1 className="hero-title">Generate <span>Synthetic Q&A</span> Data</h1>
                    <p className="hero-desc">
                        Transform documents into high-quality question-answer pairs using DeepEval's synthesis engine.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            className="btn btn-primary"
                            onClick={start}
                            disabled={running || status !== 'online'}
                        >
                            {running ? (
                                <>
                                    <span className="spinner" />
                                    Processing
                                </>
                            ) : (
                                <>
                                    {Icons.play}
                                    Start Synthesis
                                </>
                            )}
                        </button>
                        {running && (
                            <button className="btn btn-stop" onClick={stop}>
                                {Icons.stop}
                                Stop
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Document Selection */}
            <div className="card" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 className="text-lg font-medium" style={{ margin: 0 }}>Source Documents</h3>
                    <div style={{ gap: '8px', display: 'flex' }}>
                        <button
                            className="btn-text"
                            onClick={() => setSelectedDocs(documents.map(d => d.id))}
                            style={{ fontSize: '12px' }}
                        >
                            Select All
                        </button>
                        <button
                            className="btn-text"
                            onClick={() => setSelectedDocs([])}
                            style={{ fontSize: '12px' }}
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {documents.length === 0 ? (
                    <div className="empty-state" style={{ padding: '20px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                        <p style={{ color: 'var(--text-muted)' }}>No documents. Upload some in the Documents tab.</p>
                    </div>
                ) : (
                    <div className="document-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px' }}>
                        {documents.map(doc => {
                            const isSelected = selectedDocs.includes(doc.id);
                            return (
                                <div
                                    key={doc.id}
                                    onClick={() => {
                                        if (running) return;
                                        setSelectedDocs(prev =>
                                            prev.includes(doc.id)
                                                ? prev.filter(id => id !== doc.id)
                                                : [...prev, doc.id]
                                        );
                                    }}
                                    className={`doc-card-mini ${isSelected ? 'selected' : ''}`}
                                    style={{
                                        padding: '10px',
                                        background: isSelected ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-card-hover)',
                                        border: `1px solid ${isSelected ? 'var(--success)' : 'var(--border)'}`,
                                        borderRadius: 'var(--radius)',
                                        cursor: running ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s ease',
                                        opacity: running ? 0.6 : 1
                                    }}
                                >
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '4px',
                                        border: `1px solid ${isSelected ? 'var(--success)' : 'var(--text-muted)'}`,
                                        background: isSelected ? 'var(--success)' : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '10px'
                                    }}>
                                        {isSelected && Icons.check}
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {doc.name}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                                            {(doc.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Console */}
            <div className="console-card">
                <div className="console-header">
                    <span className="console-title">Output</span>
                    <span className="console-meta">{logs.length} entries</span>
                </div>

                <div className="console-body" ref={consoleRef}>
                    {logs.length === 0 ? (
                        <div className="empty">
                            <span className="empty-icon">{Icons.terminal}</span>
                            <span className="empty-title">No output yet</span>
                            <span className="empty-desc">Click Start Synthesis to begin</span>
                        </div>
                    ) : (
                        logs.map(entry => (
                            <div key={entry.id} className={`log ${entry.type}`}>
                                <span className="log-time">{entry.time}</span>
                                <span className="log-icon">{getIcon(entry.type)}</span>
                                <span className="log-text">{entry.message}</span>
                            </div>
                        ))
                    )}
                </div>

                {progress > 0 && progress < 100 && (
                    <div className="progress-section">
                        <div className="progress-row">
                            <span className="progress-label">Progress</span>
                            <span className="progress-value">{progress}%</span>
                        </div>
                        <div className="progress-track">
                            <div className="progress-bar" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}

                {results && (
                    <div className="results-section">
                        <div className="results-grid">
                            <div className="result-item">
                                <span className="result-value">{results.singleTurn}</span>
                                <span className="result-label">Single-Turn</span>
                            </div>
                            <div className="result-item">
                                <span className="result-value">{results.multiTurn}</span>
                                <span className="result-label">Multi-Turn</span>
                            </div>
                            <div className="result-item">
                                <span className="result-value">{results.duration}</span>
                                <span className="result-label">Duration</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
