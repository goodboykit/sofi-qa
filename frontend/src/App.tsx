import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './index.css';

interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'highlight';
  icon: string;
}

interface SynthesisResult {
  singleTurnCount: number;
  multiTurnCount: number;
  duration: string;
}

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SynthesisResult | null>(null);
  const logIdRef = useRef(0);
  const outputRef = useRef<HTMLDivElement>(null);

  // Check backend health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await axios.get('http://localhost:8000/api/health');
        setBackendStatus('online');
      } catch {
        setBackendStatus('offline');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (message: string, type: LogEntry['type'] = 'info', icon = '📝') => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, {
      id: logIdRef.current++,
      time,
      message,
      type,
      icon
    }]);
  };

  const startSynthesis = async () => {
    if (backendStatus !== 'online') {
      addLog('Backend is not available. Please ensure the server is running.', 'error', '❌');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setResults(null);
    setLogs([]);

    const startTime = Date.now();

    addLog('Initializing SoFi-QA synthesis pipeline...', 'highlight', '🚀');

    try {
      // Step 1: Check for documents
      addLog('Checking for source documents...', 'info', '📂');
      setProgress(10);

      const docsResponse = await axios.get('http://localhost:8000/api/documents');
      const documents = docsResponse.data.documents;

      if (documents.length === 0) {
        addLog('No documents found. Please add PDF or DOCX files to data/source_docs/', 'warning', '⚠️');
        setIsRunning(false);
        return;
      }

      addLog(`Found ${documents.length} document(s): ${documents.map((d: { name: string }) => d.name).join(', ')}`, 'success', '✅');
      setProgress(20);

      // Step 2: Start Single-Turn Synthesis
      addLog('Starting single-turn Q&A synthesis...', 'highlight', '⚡');
      const documentIds = documents.map((d: { id: string }) => d.id);

      const singleTurnJob = await axios.post('http://localhost:8000/api/synthesis/start', {
        document_ids: documentIds,
        synthesis_type: 'single',
        max_goldens_per_context: 2
      });

      addLog(`Single-turn job started (ID: ${singleTurnJob.data.job_id})`, 'info', '🔄');
      setProgress(30);

      // Poll for single-turn completion
      let singleComplete = false;
      while (!singleComplete) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const statusRes = await axios.get(`http://localhost:8000/api/synthesis/status/${singleTurnJob.data.job_id}`);
        const status = statusRes.data;

        if (status.status === 'running') {
          addLog(status.message, 'info', '⏳');
          setProgress(prev => Math.min(prev + 5, 45));
        } else if (status.status === 'completed') {
          singleComplete = true;
          addLog(`Single-turn synthesis complete: ${status.result?.count || 0} Q&A pairs generated`, 'success', '✅');
          setProgress(50);
        } else if (status.status === 'failed') {
          addLog(`Single-turn synthesis failed: ${status.message}`, 'error', '❌');
          throw new Error(status.message);
        }
      }

      // Step 3: Start Multi-Turn Synthesis
      addLog('Starting multi-turn conversational synthesis...', 'highlight', '💬');

      const multiTurnJob = await axios.post('http://localhost:8000/api/synthesis/start', {
        document_ids: documentIds,
        synthesis_type: 'multi',
        max_goldens_per_context: 3
      });

      addLog(`Multi-turn job started (ID: ${multiTurnJob.data.job_id})`, 'info', '🔄');
      setProgress(60);

      // Poll for multi-turn completion
      let multiComplete = false;
      while (!multiComplete) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const statusRes = await axios.get(`http://localhost:8000/api/synthesis/status/${multiTurnJob.data.job_id}`);
        const status = statusRes.data;

        if (status.status === 'running') {
          addLog(status.message, 'info', '⏳');
          setProgress(prev => Math.min(prev + 5, 85));
        } else if (status.status === 'completed') {
          multiComplete = true;
          addLog(`Multi-turn synthesis complete: ${status.result?.count || 0} conversations generated`, 'success', '✅');
          setProgress(90);
        } else if (status.status === 'failed') {
          addLog(`Multi-turn synthesis failed: ${status.message}`, 'error', '❌');
          throw new Error(status.message);
        }
      }

      // Step 4: Get final results
      addLog('Fetching generated goldens...', 'info', '📊');
      const goldensRes = await axios.get('http://localhost:8000/api/goldens');

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      setResults({
        singleTurnCount: goldensRes.data.single_turn?.length || 0,
        multiTurnCount: goldensRes.data.multi_turn?.length || 0,
        duration: `${duration}s`
      });

      setProgress(100);
      addLog(`✨ Synthesis pipeline completed in ${duration}s!`, 'highlight', '🎉');
      addLog(`Output saved to: data/synthetic_data/`, 'success', '💾');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog(`Error: ${errorMessage}`, 'error', '❌');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="app-wrapper">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">⚡</div>
          <div>
            <div className="logo-text">SoFi-QA</div>
            <div className="logo-subtitle">Synthetic QA Generator</div>
          </div>
        </div>

        <div className="status-indicator">
          <div className={`status-dot ${backendStatus === 'online' ? '' : backendStatus === 'checking' ? 'running' : 'offline'}`}></div>
          <span className="status-text">
            {backendStatus === 'online' ? 'API Connected' : backendStatus === 'checking' ? 'Connecting...' : 'API Offline'}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Hero Section */}
        <section className="hero">
          <h1 className="hero-title">
            Generate <span>Synthetic Q&A</span> Data
          </h1>
          <p className="hero-description">
            Transform your documents into high-quality question-answer pairs using DeepEval's
            advanced synthesis engine. Perfect for training and evaluating AI models.
          </p>
        </section>

        {/* Start Button */}
        <div className="start-button-container">
          <button
            className={`start-button ${isRunning ? 'running' : ''}`}
            onClick={startSynthesis}
            disabled={isRunning || backendStatus !== 'online'}
          >
            <span className="button-content">
              {isRunning ? (
                <>
                  <div className="button-spinner"></div>
                  Processing...
                </>
              ) : (
                <>
                  <span className="button-icon">🚀</span>
                  Start Synthesis
                </>
              )}
            </span>
          </button>
        </div>

        {/* Output Console */}
        <div className="output-container">
          <div className="output-card">
            <div className="output-header">
              <div className="output-header-left">
                <div className="terminal-dots">
                  <div className="terminal-dot red"></div>
                  <div className="terminal-dot yellow"></div>
                  <div className="terminal-dot green"></div>
                </div>
                <span className="output-title">Synthesis Output</span>
              </div>

              <div className="output-stats">
                <div className="stat">
                  <span>Logs:</span>
                  <span className="stat-value">{logs.length}</span>
                </div>
              </div>
            </div>

            <div className="output-body" ref={outputRef}>
              {logs.length === 0 ? (
                <div className="empty-output">
                  <div className="empty-icon">📋</div>
                  <div className="empty-text">No output yet</div>
                  <div className="empty-hint">Click "Start Synthesis" to begin generating Q&A pairs</div>
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className={`log-entry ${log.type}`}>
                    <span className="log-time">{log.time}</span>
                    <span className="log-icon">{log.icon}</span>
                    <span className="log-message">{log.message}</span>
                  </div>
                ))
              )}
            </div>

            {/* Progress Bar */}
            {(isRunning || progress > 0) && (
              <div className="progress-container" style={{ padding: '0 28px 24px' }}>
                <div className="progress-header">
                  <span className="progress-label">Progress</span>
                  <span className="progress-value">{progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            {/* Results Summary */}
            {results && (
              <div className="results-summary" style={{ padding: '0 28px 28px' }}>
                <div className="result-card">
                  <div className="result-value">{results.singleTurnCount}</div>
                  <div className="result-label">Single-Turn Q&A</div>
                </div>
                <div className="result-card">
                  <div className="result-value">{results.multiTurnCount}</div>
                  <div className="result-label">Multi-Turn Conv.</div>
                </div>
                <div className="result-card">
                  <div className="result-value">{results.duration}</div>
                  <div className="result-label">Total Time</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        Built with 💜 using <a href="https://github.com/confident-ai/deepeval" target="_blank" rel="noopener noreferrer">DeepEval</a> •
        Powered by FastAPI & React
      </footer>
    </div>
  );
}

export default App;
