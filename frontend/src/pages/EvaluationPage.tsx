import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Icons } from '../components/common/Icons';
import type { Config, EvalResult } from '../types';

interface EvaluationPageProps {
    status: 'online' | 'offline' | 'checking';
    singleTurnGoldens: any[];
    multiTurnGoldens: any[];
    config: Config;
}

export function EvaluationPage({ status, singleTurnGoldens, multiTurnGoldens, config }: EvaluationPageProps) {
    const [evalRunning, setEvalRunning] = useState(false);
    const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
    const [evalMessage, setEvalMessage] = useState('');
    const [evalLogs, setEvalLogs] = useState<string[]>([]);

    const evalConsoleRef = useRef<HTMLDivElement>(null);
    const evalEventSourceRef = useRef<EventSource | null>(null);

    // Auto-scroll
    useEffect(() => {
        if (evalConsoleRef.current) {
            evalConsoleRef.current.scrollTop = evalConsoleRef.current.scrollHeight;
        }
    }, [evalLogs]);

    const startEvaluation = async () => {
        if (status !== 'online') {
            setEvalMessage('Backend not available');
            return;
        }
        setEvalRunning(true);
        setEvalResult(null);
        setEvalLogs([]);
        setEvalMessage('Initializing test run...');

        try {
            // Start evaluation job
            const startRes = await axios.post('/api/evaluation/start', {
                single_turn_goldens: singleTurnGoldens,
                multi_turn_goldens: multiTurnGoldens,
                config: config
            });

            const jobId = startRes.data.job_id;
            setEvalMessage('Connecting to event stream...');

            const eventSource = new EventSource(`/api/evaluation/stream?job_id=${jobId}`);
            evalEventSourceRef.current = eventSource;

            eventSource.addEventListener('log', (e) => {
                setEvalLogs(prev => [...prev, e.data]);
                setEvalMessage('Running tests...');
            });

            eventSource.addEventListener('test', (e) => {
                const test = JSON.parse(e.data);
                setEvalLogs(prev => [...prev, `${test.status === 'passed' ? '✓' : '✗'} ${test.name}`]);
            });

            eventSource.addEventListener('complete', (e) => {
                const result = JSON.parse(e.data);
                setEvalResult(result);
                setEvalMessage(`Completed: ${result.passed} passed, ${result.failed} failed`);
                setEvalRunning(false);
                evalEventSourceRef.current = null;
                eventSource.close();
            });

            eventSource.addEventListener('error', (e: any) => {
                // Ignore end of stream error if we already finished
                if (eventSource.readyState === EventSource.CLOSED) return;

                if (e.data) {
                    setEvalMessage(`Error: ${e.data}`);
                } else {
                    setEvalMessage('Connection closed');
                }
                setEvalRunning(false);
                evalEventSourceRef.current = null;
                eventSource.close();
            });

            eventSource.onerror = () => {
                if (eventSource.readyState !== EventSource.CLOSED) {
                    setEvalMessage('Connection error');
                    setEvalRunning(false);
                    evalEventSourceRef.current = null;
                    eventSource.close();
                }
            };

        } catch (error) {
            setEvalMessage('Failed to start evaluation');
            setEvalRunning(false);
        }
    };

    const stopEvaluation = () => {
        if (evalEventSourceRef.current) {
            evalEventSourceRef.current.close();
            evalEventSourceRef.current = null;
        }
        setEvalRunning(false);
        setEvalMessage('Stopped by user');
        setEvalLogs(prev => [...prev, '--- Test run stopped by user ---']);
    };

    return (
        <main
            className="main"
            style={evalResult ? { maxWidth: '1200px', margin: '0 auto', overflow: 'hidden', height: '100%' } : {}}
        >
            {/* Hero */}
            {!evalResult && (
                <div className="hero-card">
                    <div className="hero-content">
                        <h1 className="hero-title">Run <span>Quality Tests</span></h1>
                        <p className="hero-desc">
                            Check if your generated Q&A pairs are relevant and faithful to the source documents.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <button
                                className="btn btn-primary"
                                onClick={startEvaluation}
                                disabled={evalRunning || status !== 'online'}
                            >
                                {Icons.beaker}
                                Run Tests
                            </button>
                            {evalRunning && (
                                <button
                                    className="btn btn-danger"
                                    onClick={stopEvaluation}
                                >
                                    {Icons.stop}
                                    Stop
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Logs - Only show if NO results */}
            {!evalResult && (
                <div className="console-card">
                    <div className="console-header">
                        <span className="console-title">Execution Logs</span>
                        <span className="console-meta">{evalMessage || `${evalLogs.length} lines`}</span>
                    </div>
                    <div className="console-body" ref={evalConsoleRef}>
                        {evalLogs.map((log, i) => (
                            <div key={i} className="console-line">{log}</div>
                        ))}
                        {evalLogs.length === 0 && (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: 'var(--text-muted)',
                                opacity: 0.6,
                                minHeight: '200px'
                            }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
                                    <polyline points="4 17 10 11 4 5"></polyline>
                                    <line x1="12" y1="19" x2="20" y2="19"></line>
                                </svg>
                                <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>No output yet</div>
                                <div style={{ fontSize: '12px', marginTop: '4px' }}>Click Run Tests to begin</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Results */}
            {evalResult && (
                <div className="card-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Test List with Integrated Summary */}
                    <div className="documents-card" style={{ height: '100%' }}>
                        <div className="documents-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '16px', paddingBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="documents-title">Test Results</span>
                                <span className="documents-count">{evalResult.tests.length} tests</span>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '12px',
                            }}>
                                <div style={{
                                    padding: '12px',
                                    background: 'rgba(74, 222, 128, 0.1)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(74, 222, 128, 0.2)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#4ade80' }}>
                                        {evalResult.passed}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>
                                        Passed
                                    </div>
                                </div>

                                <div style={{
                                    padding: '12px',
                                    background: 'rgba(248, 113, 113, 0.1)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(248, 113, 113, 0.2)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#f87171' }}>
                                        {evalResult.failed}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>
                                        Failed
                                    </div>
                                </div>

                                <div style={{
                                    padding: '12px',
                                    background: 'var(--bg-input)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {evalResult.total}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>
                                        Total
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="documents-body" style={{ padding: '12px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {evalResult.tests.length === 0 ? (
                                    <div style={{
                                        padding: '24px',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        borderRadius: '8px',
                                        color: '#ef4444',
                                        fontFamily: 'monospace',
                                        fontSize: '12px',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        <strong>Analysis Failed to Produce Results</strong>
                                        <br /><br />
                                        System Output:
                                        <br />
                                        {evalLogs.join('\n') || 'No output logs available.'}
                                    </div>
                                ) : (
                                    evalResult.tests.map((test, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px',
                                                padding: '14px 18px',
                                                background: test.status === 'passed' ? 'rgba(74, 222, 128, 0.08)' : 'rgba(248, 113, 113, 0.08)',
                                                borderRadius: '10px',
                                                border: `1px solid ${test.status === 'passed' ? 'rgba(74, 222, 128, 0.25)' : 'rgba(248, 113, 113, 0.25)'}`,
                                                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <span style={{
                                                    color: test.status === 'passed' ? '#4ade80' : '#f87171',
                                                    width: '22px',
                                                    height: '22px',
                                                    flexShrink: 0
                                                }}>
                                                    {test.status === 'passed' ? Icons.check : Icons.x}
                                                </span>
                                                <span style={{
                                                    flex: 1,
                                                    fontFamily: "'Poppins', sans-serif",
                                                    fontSize: '14px',
                                                    fontWeight: 500,
                                                    color: 'var(--text-primary)'
                                                }}>
                                                    <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>{idx + 1}.</span>
                                                    {test.name}
                                                </span>
                                                <span style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    background: test.status === 'passed' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                                                    color: test.status === 'passed' ? '#4ade80' : '#f87171',
                                                    border: `1px solid ${test.status === 'passed' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`
                                                }}>
                                                    {test.status}
                                                </span>
                                            </div>

                                            {/* Clean Metric Display */}
                                            {test.metrics && (
                                                <div style={{
                                                    marginTop: '8px',
                                                    padding: '10px 14px',
                                                    background: 'var(--bg-card-hover)',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    fontFamily: 'monospace',
                                                    color: 'var(--text-secondary)',
                                                    whiteSpace: 'pre-wrap',
                                                    borderLeft: '2px solid var(--border)'
                                                }}>
                                                    {test.metrics}
                                                </div>
                                            )}

                                            {/* Error Reason */}
                                            {test.status === 'failed' && (
                                                <div style={{
                                                    marginTop: '8px',
                                                    padding: '10px 14px',
                                                    background: 'rgba(248, 113, 113, 0.05)',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    color: '#f87171',
                                                    borderLeft: '2px solid #f87171'
                                                }}>
                                                    <strong>Failure Reason:</strong><br />
                                                    {test.reason || 'No specific reason captured.'}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div style={{
                            padding: '16px',
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            background: 'var(--bg-card)'
                        }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => setEvalResult(null)}
                                style={{ minWidth: '120px' }}
                            >
                                Run New Test
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </main>
    );
}
