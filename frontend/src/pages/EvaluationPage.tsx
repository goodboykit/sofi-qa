import { useState, useRef, useEffect } from 'react';
import { Icons } from '../components/common/Icons';
import { useEvaluation } from '../hooks/useEvaluation';
import { Modal } from '../components/common/Modal';

export function EvaluationPage() {
    const { running, result, message, logs, progress, start, stop } = useEvaluation();
    const [config, setConfig] = useState<any>({});
    const [selectedTest, setSelectedTest] = useState<any | null>(null);
    const consoleRef = useRef<HTMLDivElement>(null);

    // Load config from session storage
    useEffect(() => {
        const stored = sessionStorage.getItem('syn_config');
        if (stored) {
            setConfig(JSON.parse(stored));
        }
    }, []);

    // Auto-scroll logs
    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [logs]);

    const handleRun = () => {
        const singleTurn = JSON.parse(sessionStorage.getItem('syn_single_turn') || '[]');
        const multiTurn = JSON.parse(sessionStorage.getItem('syn_multi_turn') || '[]');
        start(singleTurn, multiTurn, config, 'online');
    };

    return (
        <main className="main">
            {/* Hero Card - Matches Synthesis Page */}
            <div className="hero-card">
                <div className="hero-content">
                    <h1 className="hero-title">Run <span>Quality Tests</span></h1>
                    <p className="hero-desc">
                        Evaluate your synthetic data using DeepEval metrics for accuracy and faithfulness.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleRun}
                            disabled={running}
                        >
                            {running ? (
                                <>
                                    <span className="spinner" />
                                    Evaluating
                                </>
                            ) : (
                                <>
                                    {Icons.play}
                                    Run Tests
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

            {/* Results Summary - Only show when we have results */}
            {result && (
                <div className="results-section" style={{ marginBottom: '20px' }}>
                    <div className="results-grid">
                        <div className="result-item success">
                            <span className="result-value">{result.passed}</span>
                            <span className="result-label">Passed</span>
                        </div>
                        <div className="result-item danger">
                            <span className="result-value">{result.failed}</span>
                            <span className="result-label">Failed</span>
                        </div>
                        <div className="result-item">
                            <span className="result-value">{result.total}</span>
                            <span className="result-label">Total</span>
                        </div>
                        <div className="result-item">
                            <span className="result-value">
                                {result.total > 0 ? Math.round((result.passed / result.total) * 100) : 0}%
                            </span>
                            <span className="result-label">Pass Rate</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Console Card - Matches Synthesis Page */}
            <div className="console-card">
                <div className="console-header">
                    <span className="console-title">Test Results</span>
                    <span className="console-meta">
                        {result ? `${result.tests?.length || 0} tests` : `${logs.length} entries`}
                    </span>
                </div>

                <div className="console-body" ref={consoleRef}>
                    {!running && !result && logs.length === 0 ? (
                        <div className="empty">
                            <span className="empty-icon">{Icons.beaker}</span>
                            <span className="empty-title">Ready to Evaluate</span>
                            <span className="empty-desc">Click "Run Tests" to begin evaluation</span>
                        </div>
                    ) : (
                        <>
                            {/* Logs during running */}
                            {logs.map((log, i) => (
                                <div key={i} className="log info">
                                    <span className="log-icon">{Icons.arrow}</span>
                                    <span className="log-text">{log}</span>
                                </div>
                            ))}

                            {/* Test Results */}
                            {result?.tests?.map((test: any, i: number) => (
                                <TestCard
                                    key={i}
                                    test={test}
                                    onViewDetails={() => setSelectedTest(test)}
                                />
                            ))}
                        </>
                    )}
                </div>

                {/* Progress Bar */}
                {running && progress > 0 && progress < 100 && (
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
            </div>

            {/* Test Details Modal */}
            <Modal
                isOpen={!!selectedTest}
                onClose={() => setSelectedTest(null)}
                title={selectedTest?.name || 'Test Details'}
            >
                {selectedTest && (
                    <div className="test-details-modal-content">
                        <div className={`modal-status-badge ${selectedTest.status === 'passed' ? 'success' : 'danger'}`}>
                            {selectedTest.status === 'passed' ? 'PASSED' : 'FAILED'}
                        </div>

                        {selectedTest.error && (
                            <div className="detail-section error-section">
                                <h4>Failure Reason</h4>
                                <FailureReasonParser error={selectedTest.error} />
                            </div>
                        )}

                        <div className="details-grid">
                            {selectedTest.details?.input && (
                                <DetailBlock label="Input" content={selectedTest.details.input} />
                            )}

                            {selectedTest.details?.messages?.length > 0 && (
                                <DetailBlock
                                    label="Conversation History"
                                    content={selectedTest.details.messages.join('\n\n')}
                                />
                            )}

                            {selectedTest.details?.actual && selectedTest.details.actual !== 'N/A' && (
                                <DetailBlock
                                    label="Actual Output"
                                    content={selectedTest.details.actual}
                                    isError={selectedTest.status === 'failed'}
                                />
                            )}

                            {selectedTest.details?.expected && selectedTest.details.expected !== 'N/A' && (
                                <DetailBlock label="Expected Output" content={selectedTest.details.expected} />
                            )}

                            {selectedTest.details?.context?.length > 0 && (
                                <DetailBlock
                                    label="Retrieval Context"
                                    content={Array.isArray(selectedTest.details.context)
                                        ? selectedTest.details.context.join('\n---\n')
                                        : selectedTest.details.context}
                                />
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </main>
    );
}

function TestCard({ test, onViewDetails }: { test: any, onViewDetails: () => void }) {
    const isPassed = test.status === 'passed';

    return (
        <div className={`test-card ${isPassed ? 'passed' : 'failed'}`}>
            <div className="test-header">
                <div className="test-status-icon">
                    {isPassed ? Icons.check : Icons.x}
                </div>
                <div className="test-info">
                    <span className="test-name">{test.name}</span>
                    <span className="test-duration">{test.duration || '0.5s'}</span>
                </div>
                <button className="btn-text" onClick={onViewDetails}>
                    View Details
                </button>
            </div>
        </div>
    );
}

function DetailBlock({ label, content, isError }: { label: string, content: string, isError?: boolean }) {
    if (!content) return null;
    return (
        <div className={`detail-block ${isError ? 'error-block' : ''}`}>
            <h5>{label}</h5>
            <pre>{content}</pre>
        </div>
    );
}

function FailureReasonParser({ error }: { error: string }) {
    if (!error.includes('Metrics:')) {
        return <div className="raw-error">{error}</div>;
    }

    try {
        const parts = error.split('Metrics:')[1].split('failed.')[0];
        const metricName = parts.split('(')[0].trim();
        const detailsStr = parts.substring(parts.indexOf('(') + 1, parts.lastIndexOf(')'));

        const scoreMatch = detailsStr.match(/score:\s*([\d.]+)/);
        const reasonMatch = detailsStr.match(/reason:\s*(.+)/);

        const score = scoreMatch ? parseFloat(scoreMatch[1]).toFixed(2) : '?';
        const reason = reasonMatch ? reasonMatch[1] : detailsStr;

        return (
            <div className="structured-error">
                <div className="error-metric">
                    <span className="label">Metric:</span>
                    <span className="value">{metricName}</span>
                </div>
                <div className="error-score">
                    <span className="label">Score:</span>
                    <span className={`value ${parseFloat(score) < 0.7 ? 'danger' : 'warning'}`}>
                        {score}
                    </span>
                </div>
                <div className="error-reason">
                    <span className="label">Reasoning:</span>
                    <p>{reason}</p>
                </div>
            </div>
        );
    } catch (e) {
        return <div className="raw-error">{error}</div>;
    }
}
