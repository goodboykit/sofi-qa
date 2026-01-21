import { useState, useRef, useEffect } from 'react';
import { Icons } from '../components/common/Icons';
import { useEvaluation } from '../hooks/useEvaluation';
import { Modal } from '../components/common/Modal';

export function EvaluationPage() {
    const { running, result, logs, progress, start, stop } = useEvaluation();
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

    // Extract metrics from result (handle both formats: direct or nested under 'metrics')
    const metrics = result?.metrics || result || { passed: 0, failed: 0, total: 0 };
    const passed = metrics.passed ?? 0;
    const failed = metrics.failed ?? 0;
    const total = metrics.total ?? 0;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const tests = result?.tests || [];

    // Determine if we have results to show
    const hasResults = result && tests.length > 0;

    return (
        <main className="main">
            {/* Hero Card - Hide when we have results */}
            {!hasResults && !running && (
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
                                {Icons.play}
                                Run Tests
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Running State */}
            {running && (
                <div className="hero-card">
                    <div className="hero-content">
                        <h1 className="hero-title">Running <span>Quality Tests</span></h1>
                        <p className="hero-desc">
                            Evaluating your synthetic data... Please wait.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <button className="btn btn-primary" disabled>
                                <span className="spinner" />
                                Evaluating
                            </button>
                            <button className="btn btn-stop" onClick={stop}>
                                {Icons.stop}
                                Stop
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Results Summary - Only show when we have results */}
            {hasResults && (
                <div className="results-section" style={{ marginBottom: '20px' }}>
                    <div className="results-header">
                        <h2>Evaluation Summary</h2>
                        <button className="btn btn-primary" onClick={handleRun} disabled={running}>
                            {Icons.play}
                            Run New Evaluation
                        </button>
                    </div>
                    <div className="results-grid">
                        <div className="result-item success">
                            <span className="result-value">{passed}</span>
                            <span className="result-label">Passed</span>
                        </div>
                        <div className="result-item danger">
                            <span className="result-value">{failed}</span>
                            <span className="result-label">Failed</span>
                        </div>
                        <div className="result-item">
                            <span className="result-value">{total}</span>
                            <span className="result-label">Total</span>
                        </div>
                        <div className="result-item">
                            <span className="result-value">{passRate}%</span>
                            <span className="result-label">Pass Rate</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Console Card - Test Results */}
            <div className="console-card">
                <div className="console-header">
                    <span className="console-title">Test Results</span>
                    <span className="console-meta">
                        {hasResults ? `${tests.length} tests` : `${logs.length} entries`}
                    </span>
                </div>

                <div className="console-body" ref={consoleRef}>
                    {!running && !hasResults && logs.length === 0 ? (
                        <div className="empty">
                            <span className="empty-icon">{Icons.beaker}</span>
                            <span className="empty-title">Ready to Evaluate</span>
                            <span className="empty-desc">Click "Run Tests" to begin evaluation</span>
                        </div>
                    ) : (
                        <>
                            {/* Logs during running */}
                            {running && logs.map((log, i) => (
                                <div key={i} className="log info">
                                    <span className="log-icon">{Icons.arrow}</span>
                                    <span className="log-text">{log}</span>
                                </div>
                            ))}

                            {/* Test Results */}
                            {tests.map((test: any, i: number) => (
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

                        {selectedTest.reason && (
                            <div className="detail-section error-section">
                                <h4>Failure Reason</h4>
                                <FailureReasonParser error={selectedTest.reason} />
                            </div>
                        )}

                        <div className="data-display-stack">
                            {selectedTest.details?.input && (
                                <div className="data-box input">
                                    <span className="data-box-label">Input</span>
                                    {selectedTest.details.input}
                                </div>
                            )}

                            {selectedTest.details?.messages?.length > 0 && (
                                <div className="data-box">
                                    <span className="data-box-label">Conversation History</span>
                                    <div className="chat-container context-mode">
                                        {selectedTest.details.messages.map((msg: string, idx: number) => (
                                            <div key={idx} className={`chat-bubble ${idx % 2 === 0 ? 'user' : 'bot'}`}>
                                                {msg}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedTest.details?.actual && selectedTest.details.actual !== 'N/A' && (
                                <div className={`data-box ${selectedTest.status === 'failed' ? 'error' : 'output'}`}>
                                    <span className="data-box-label">Actual Output</span>
                                    {selectedTest.details.actual}
                                </div>
                            )}

                            {selectedTest.details?.expected && selectedTest.details.expected !== 'N/A' && selectedTest.details.expected !== null && (
                                <div className="data-box output">
                                    <span className="data-box-label">Expected Output</span>
                                    {selectedTest.details.expected}
                                </div>
                            )}

                            {selectedTest.details?.expected_outcome && selectedTest.details.expected_outcome !== 'N/A' && selectedTest.details.expected_outcome !== null && (
                                <div className="data-box output">
                                    <span className="data-box-label">Expected Outcome</span>
                                    {selectedTest.details.expected_outcome}
                                </div>
                            )}

                            {selectedTest.details?.context?.length > 0 && (
                                <div className="data-context-toggle">
                                    <details open>
                                        <summary>View Retrieval Context</summary>
                                        <div className="context-list">
                                            {Array.isArray(selectedTest.details.context)
                                                ? selectedTest.details.context.map((c: string, cIdx: number) => (
                                                    <ContextParser key={cIdx} text={c} />
                                                ))
                                                : <ContextParser text={selectedTest.details.context} />
                                            }
                                        </div>
                                    </details>
                                </div>
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

// Parse retrieval context into Q&A segments with chat bubbles
function ContextParser({ text }: { text: string }) {
    // Split text into segments based on question marks and newlines
    const splitIntoQA = (inputText: string): string[] => {
        const parts: string[] = [];
        if (inputText.includes('?')) {
            const qSplit = inputText.split(/(\?)/);
            let current = '';
            for (let i = 0; i < qSplit.length; i++) {
                if (qSplit[i] === '?') {
                    current += '?';
                    if (current.trim()) parts.push(current.trim());
                    current = '';
                } else {
                    current += qSplit[i];
                }
            }
            if (current.trim()) parts.push(current.trim());
        } else {
            const answerStarters = /([a-z,!.])(?=(Currently|Unfortunately|Actually|However|Yes|No|Oh|We |Our |The |It |I |Thank|Please|Sure|Absolutely|Of course|Certainly|So |Basically|Well |Right now|At the moment|Hindi|Oo|Wala|Meron|Mayroon|Opo|Sa |Ang |Yung |Kasi|Marami|Salamat|Pasensya|Libre|Kapag|Nag|May |Pwede |Puwede |Maaari |Kami |Tayo |Sila |Ito |Iyan |Iyon |Para |Dahil|Siguro|Depende|Sorry|Okay|Ok ))/g;
            const splitText = inputText.replace(answerStarters, '$1|||SPLIT|||');
            const rawParts = splitText.split('|||SPLIT|||');
            rawParts.forEach(p => {
                if (p.trim()) parts.push(p.trim());
            });
        }
        return parts.length > 0 ? parts : [inputText];
    };

    // Question starters to detect user messages
    const questionStarters = [
        'what', 'when', 'where', 'who', 'why', 'how', 'which',
        'is there', 'are there', 'is it', 'is the', 'are you', 'are we',
        'do you', 'do we', 'do they', 'does', 'did',
        'can i', 'can we', 'can you', 'could', 'would', 'will', 'shall',
        'have you', 'has', 'had',
        'ano', 'saan', 'nasaan', 'kailan', 'kelan', 'sino', 'bakit', 'paano', 'magkano', 'ilan', 'gaano',
        'pwede ba', 'puwede ba', 'pwede', 'puwede', 'maaari ba', 'maaari',
        'meron ba', 'mayroon ba', 'may ba', 'wala ba',
        'libre ba', 'open ba', 'available ba', 'bukas ba', 'sarado ba',
        'totoo ba', 'talaga ba', 'ganoon ba', 'ganon ba', 'diba',
        'kailangan ba', 'kelangan ba', 'need ba',
        'ok lang ba', 'okay lang ba', 'allowed ba', 'accept ba', 'valid ba', 'included ba'
    ];

    const isQuestion = (line: string): boolean => {
        const t = line.trim().toLowerCase();
        return t.endsWith('?') || questionStarters.some(w => t.startsWith(w + ' ') || t.startsWith(w + '?') || t === w);
    };

    const segments = splitIntoQA(text).flatMap(seg => seg.split('\n').filter(line => line.trim() !== ''));

    return (
        <div className="context-item chat-mode">
            <div className="chat-container context-mode">
                {segments.map((line, idx) => (
                    <div key={idx} className={`chat-bubble ${isQuestion(line) ? 'user' : 'bot'} context-bubble`}>
                        {line}
                    </div>
                ))}
            </div>
        </div>
    );
}


function FailureReasonParser({ error }: { error: string }) {
    // Handle the full AssertionError format from DeepEval
    const errorStr = error.replace('AssertionError:', '').trim();

    if (!errorStr.includes('Metrics:')) {
        return <div className="raw-error">{error}</div>;
    }

    try {
        // Parse: "Metrics: Faithfulness (score: 0.67, threshold: 0.7, strict: False, error: None, reason: The score is...) failed."
        const metricsSection = errorStr.split('Metrics:')[1];
        const metricName = metricsSection.split('(')[0].trim();

        // Extract the content inside parentheses
        const parensContent = metricsSection.substring(
            metricsSection.indexOf('(') + 1,
            metricsSection.lastIndexOf(')')
        );

        // Parse individual fields
        const scoreMatch = parensContent.match(/score:\s*([\d.]+)/);
        const thresholdMatch = parensContent.match(/threshold:\s*([\d.]+)/);
        const reasonMatch = parensContent.match(/reason:\s*(.+)/);

        const score = scoreMatch ? parseFloat(scoreMatch[1]).toFixed(2) : '?';
        const threshold = thresholdMatch ? parseFloat(thresholdMatch[1]).toFixed(2) : '0.70';
        const reason = reasonMatch ? reasonMatch[1].replace(/\)$/, '').trim() : 'No reason provided';

        return (
            <div className="structured-error">
                <div className="error-metric">
                    <span className="label">Metric:</span>
                    <span className="value">{metricName}</span>
                </div>
                <div className="error-score">
                    <span className="label">Score:</span>
                    <span className={`value ${parseFloat(score) < parseFloat(threshold) ? 'danger' : 'success'}`}>
                        {score}
                    </span>
                    <span className="threshold">/ {threshold} threshold</span>
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
