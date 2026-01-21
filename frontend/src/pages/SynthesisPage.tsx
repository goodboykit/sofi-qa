import { useRef, useEffect } from 'react';
import { Icons } from '../components/common/Icons';
import type { LogEntry } from '../types';

interface SynthesisPageProps {
    status: 'online' | 'offline' | 'checking';
    logs: LogEntry[];
    running: boolean;
    progress: number;
    results: { singleTurn: number, multiTurn: number, duration: string } | null;
    onStart: () => void;
    onStop: () => void;
}

export function SynthesisPage({
    status,
    logs,
    running,
    progress,
    results,
    onStart,
    onStop
}: SynthesisPageProps) {
    const consoleRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [logs]);

    const getIcon = (type: LogEntry['type']) => {
        switch (type) {
            case 'success': return Icons.check;
            case 'error': return Icons.x;
            case 'warning': return Icons.alert;
            case 'primary': return Icons.arrow;
            default: return Icons.info;
        }
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
                            onClick={onStart}
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
                            <button className="btn btn-stop" onClick={onStop}>
                                {Icons.stop}
                                Stop
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Document stats removed as per user request to hide selection UI. We can add a simple summary if needed. */}

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
