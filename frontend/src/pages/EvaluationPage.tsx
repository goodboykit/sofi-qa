import { useState, useEffect } from 'react';
import { Icons } from '../components/common/Icons';
import { useEvaluation } from '../hooks/useEvaluation';
import { Modal } from '../components/common/Modal';

export function EvaluationPage() {
    const { running, result, message, logs, progress, start, stop } = useEvaluation();
    const [config, setConfig] = useState<any>({});
    const [selectedTest, setSelectedTest] = useState<any | null>(null);

    // Load config from session storage or use defaults
    useEffect(() => {
        const stored = sessionStorage.getItem('syn_config');
        if (stored) {
            setConfig(JSON.parse(stored));
        }
    }, []);

    const handleRun = () => {
        const singleTurn = JSON.parse(sessionStorage.getItem('syn_single_turn') || '[]');
        const multiTurn = JSON.parse(sessionStorage.getItem('syn_multi_turn') || '[]');
        start(singleTurn, multiTurn, config, 'online');
    };

    return (
        <div className="page-container">
            <PageHeader
                icon={Icons.evaluation}
                title="Evaluation"
                description="Run quality tests on your synthetic data."
            />

            <div className="content-grid">
                {/* Control Panel */}
                <div className="card control-panel">
                    <div className="panel-header">
                        <h3>Configuration</h3>
                        <span className={`status-badge ${running ? 'running' : 'idle'}`}>
                            {running ? 'Running' : 'Ready'}
                        </span>
                    </div>

                    <div className="panel-body">
                        <p className="helper-text">
                            Using generated golden data from the Synthesis phase.
                        </p>

                        <div className="action-row">
                            <button
                                className={`btn-primary ${running ? 'danger' : ''}`}
                                onClick={running ? stop : handleRun}
                            >
                                {running ? (
                                    <>
                                        {Icons.close} Stop Evaluation
                                    </>
                                ) : (
                                    <>
                                        {Icons.play} Run Tests
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="card console-card">
                    <div className="console-header">
                        <h3>Test Results</h3>
                    </div>

                    <div className="console-output">
                        {!running && !result && logs.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">{Icons.beaker}</div>
                                <h4>Ready to Evaluate</h4>
                                <p>Click "Run Tests" to start variables.</p>
                            </div>
                        ) : (
                            <div className="results-container">
                                {logs.map((log, i) => (
                                    <div key={i} className="log-line">{log}</div>
                                ))}

                                {result && (
                                    <div className="summary-stats">
                                        <div className="stat-box success">
                                            <span className="stat-value">{result.passed}</span>
                                            <span className="stat-label">Passed</span>
                                        </div>
                                        <div className="stat-box danger">
                                            <span className="stat-value">{result.failed}</span>
                                            <span className="stat-label">Failed</span>
                                        </div>
                                        <div className="stat-box">
                                            <span className="stat-value">{result.total}</span>
                                            <span className="stat-label">Total</span>
                                        </div>
                                    </div>
                                )}

                                {result?.tests?.map((test: any, i: number) => (
                                    <TestCard
                                        key={i}
                                        test={test}
                                        onViewDetails={() => setSelectedTest(test)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Progress Bar Section */}
                    {running && (
                        <div className="progress-section">
                            <div className="progress-row">
                                <span className="progress-label">Progress</span>
                                <span className="progress-value">{progress}%</span>
                            </div>
                            <div className="progress-track">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <div className="progress-status">{message}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Test Details Modal */}
            <Modal
                isOpen={!!selectedTest}
                onClose={() => setSelectedTest(null)}
                title={selectedTest?.name || 'Test Details'}
            >
                {selectedTest && (
                    <div className="test-details-modal-content">
                        {/* Status Badge in Modal */}
                        <div className={`modal-status-badge ${selectedTest.status === 'passed' ? 'success' : 'danger'}`}>
                            {selectedTest.status === 'passed' ? 'PASSED' : 'FAILED'}
                        </div>

                        {/* Error Analysis - Only show if failed */}
                        {selectedTest.error && (
                            <div className="detail-section error-section">
                                <h4>Failure Reason</h4>
                                <FailureReasonParser error={selectedTest.error} />
                            </div>
                        )}

                        <div className="details-grid">
                            {/* Input - Always show */}
                            {selectedTest.details?.input && (
                                <DetailBlock label="Input" content={selectedTest.details.input} />
                            )}

                            {/* Messages - For multi-turn */}
                            {selectedTest.details?.messages?.length > 0 && (
                                <DetailBlock
                                    label="Conversation History"
                                    content={selectedTest.details.messages.join('\n\n')}
                                />
                            )}

                            {/* Actual Output */}
                            {selectedTest.details?.actual && selectedTest.details.actual !== 'N/A' && (
                                <DetailBlock
                                    label="Actual Output"
                                    content={selectedTest.details.actual}
                                    isError={selectedTest.status === 'failed'}
                                />
                            )}

                            {/* Expected Output */}
                            {selectedTest.details?.expected && selectedTest.details.expected !== 'N/A' && (
                                <DetailBlock label="Expected Output" content={selectedTest.details.expected} />
                            )}

                            {/* Expected Outcome - Fallback for multi-turn if mapped differently */}
                            {selectedTest.details?.expected_outcome && selectedTest.details.expected_outcome !== 'N/A' && (
                                <DetailBlock label="Expected Outcome" content={selectedTest.details.expected_outcome} />
                            )}

                            {/* Context */}
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
        </div>
    );
}

function TestCard({ test, onViewDetails }: { test: any, onViewDetails: () => void }) {
    const isPassed = test.status === 'passed';

    return (
        <div className={`test-card ${isPassed ? 'passed' : 'failed'}`}>
            <div className="test-header">
                <div className="test-status-icon">
                    {isPassed ? Icons.check : Icons.close}
                </div>
                <div className="test-info">
                    <span className="test-name">{test.name}</span>
                    <span className="test-duration">{test.duration || '0.5s'}</span>
                </div>
                <button
                    className="btn-text"
                    onClick={onViewDetails}
                >
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
    // Attempt to parse standard DeepEval assertion errors
    // Format usually: "AssertionError: Metrics: <MetricName> (score: <val>, reason: <text>) failed."

    if (!error.includes('Metrics:')) {
        return <div className="raw-error">{error}</div>;
    }

    try {
        const parts = error.split('Metrics:')[1].split('failed.')[0];
        // Example: "Faithfulness (score: 0.6, ... reason: ...)"

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
