import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './index.css';

// ============================================
// Icons
// ============================================

const Icons = {
  play: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  stop: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  terminal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  ),
};

// ============================================
// Types
// ============================================

interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'primary';
}

interface Results {
  singleTurn: number;
  multiTurn: number;
  duration: string;
}

// ============================================
// App
// ============================================

function App() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Results | null>(null);
  const logId = useRef(0);
  const consoleRef = useRef<HTMLDivElement>(null);
  const currentJobIds = useRef<string[]>([]);
  const shouldStop = useRef(false);

  // Loading screen timer
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2300);
    return () => clearTimeout(timer);
  }, []);

  // Health check
  useEffect(() => {
    const check = async () => {
      try {
        await axios.get('http://localhost:8000/api/health');
        setStatus('online');
      } catch {
        setStatus('offline');
      }
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  const log = (message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
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

      const docsRes = await axios.get('http://localhost:8000/api/documents');
      const docs = docsRes.data.documents;

      if (docs.length === 0) {
        log('No documents found in data/source_docs/', 'warning');
        setRunning(false);
        return;
      }

      log(`Found ${docs.length} document(s)`, 'success');
      setProgress(20);

      // Single-turn
      log('Generating single-turn Q&A', 'primary');
      const ids = docs.map((d: { id: string }) => d.id);

      const job1 = await axios.post('http://localhost:8000/api/synthesis/start', {
        document_ids: ids,
        synthesis_type: 'single',
        max_goldens_per_context: 2
      });

      currentJobIds.current.push(job1.data.job_id);
      log(`Job ${job1.data.job_id} started`);
      setProgress(30);

      let done1 = false;
      while (!done1 && !shouldStop.current) {
        await new Promise(r => setTimeout(r, 2000));
        if (shouldStop.current) break;

        const res = await axios.get(`http://localhost:8000/api/synthesis/status/${job1.data.job_id}`);

        if (res.data.status === 'running') {
          log(res.data.message);
          setProgress(p => Math.min(p + 5, 45));
        } else if (res.data.status === 'completed') {
          done1 = true;
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
        max_goldens_per_context: 3
      });

      currentJobIds.current.push(job2.data.job_id);
      log(`Job ${job2.data.job_id} started`);
      setProgress(60);

      let done2 = false;
      while (!done2 && !shouldStop.current) {
        await new Promise(r => setTimeout(r, 2000));
        if (shouldStop.current) break;

        const res = await axios.get(`http://localhost:8000/api/synthesis/status/${job2.data.job_id}`);

        if (res.data.status === 'running') {
          log(res.data.message);
          setProgress(p => Math.min(p + 5, 85));
        } else if (res.data.status === 'completed') {
          done2 = true;
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
      const goldensRes = await axios.get('http://localhost:8000/api/goldens');
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      setResults({
        singleTurn: goldensRes.data.single_turn?.length || 0,
        multiTurn: goldensRes.data.multi_turn?.length || 0,
        duration: `${duration}s`
      });

      setProgress(100);
      log(`Completed in ${duration}s`, 'success');
      log('Output: data/synthetic_data/', 'success');

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

    // Cancel all running jobs on the backend
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
    <>
      {/* Loading Screen */}
      {loading && (
        <div className="loading-screen">
          <img src="/sofi-logo.png" alt="SoFi" className="loading-logo" />
          <div className="loading-bar-container">
            <div className="loading-bar" />
          </div>
          <p className="loading-text">Loading</p>
        </div>
      )}

      {/* Main App - Only render after loading */}
      {!loading && (
        <div className="app">
          {/* Header */}
          <header className="header">
            <div className="brand">
              <img src="/sofi-logo.png" alt="SOFi" className="brand-logo" />
              <span className="brand-tag">QA Synthesis</span>
            </div>
            <div className="status">
              <span className={`status-dot ${status === 'online' ? 'online' : status === 'offline' ? 'offline' : ''}`} />
              <span>{status === 'online' ? 'API AI Connected' : status === 'checking' ? 'Connecting...' : 'Offline'}</span>
            </div>
          </header>

          {/* Main */}
          <main className="main">
            {/* Hero */}
            <div className="hero-card">
              <div className="hero-content">
                <h1 className="hero-title">Generate <span>Synthetic Q&A</span> Data</h1>
                <p className="hero-desc">
                  Transform documents into high-quality question-answer pairs using DeepEval's synthesis engine.
                </p>
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
                  <button
                    className="btn btn-stop"
                    onClick={stop}
                  >
                    {Icons.stop}
                    Stop
                  </button>
                )}
              </div>
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
                    <div className="empty-icon">{Icons.terminal}</div>
                    <div className="empty-title">No output yet</div>
                    <div className="empty-desc">Click Start Synthesis to begin</div>
                  </div>
                ) : (
                  logs.map(l => (
                    <div key={l.id} className={`log ${l.type}`}>
                      <span className="log-time">{l.time}</span>
                      <span className="log-icon">{getIcon(l.type)}</span>
                      <span className="log-text">{l.message}</span>
                    </div>
                  ))
                )}
              </div>

              {(running || progress > 0) && (
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
                      <div className="result-value">{results.singleTurn}</div>
                      <div className="result-label">Single-Turn</div>
                    </div>
                    <div className="result-item">
                      <div className="result-value">{results.multiTurn}</div>
                      <div className="result-label">Multi-Turn</div>
                    </div>
                    <div className="result-item">
                      <div className="result-value">{results.duration}</div>
                      <div className="result-label">Duration</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Footer */}
          <footer className="footer">
            <p className="footer-text">
              Powered by <a href="https://github.com/confident-ai/deepeval" target="_blank" rel="noopener noreferrer">DeepEval</a>
            </p>
          </footer>
        </div>
      )}
    </>
  );
}

export default App;
