import { useState, useEffect, useRef, useCallback } from 'react';
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
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  file: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  synthesis: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  sliders: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  ),
  database: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  beaker: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 3h15" />
      <path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" />
      <path d="M6 14h12" />
    </svg>
  )
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

interface Document {
  id: string;
  name: string;
  size: number;
  uploaded_at: string;
  type: string;
}

interface EvalTest {
  name: string;
  status: 'passed' | 'failed';
  reason?: string;
  metrics?: string;
  details?: {
    input?: string;
    actual?: string;
    expected?: string;
    context?: string | string[];
    messages?: string[];
    expected_outcome?: string;
  };
}

interface EvalResult {
  tests: EvalTest[];
  passed: number;
  failed: number;
  total: number;
  output: string;
}

// Config Interface
interface Config {
  task: string;
  scenario: string;
  input_format: string;
  expected_output_format: string;
  reasoning_weight: number;
  multicontext_weight: number;
  api_key?: string;
  eval_metric_name?: string;
  eval_metric_criteria?: string;
  model_name?: string;
  num_evolutions?: number;
  num_goldens?: number;
  eval_threshold?: number;
}

type Page = 'synthesis' | 'documents' | 'configuration' | 'data' | 'evaluation';

// ============================================
// App
// ============================================

function App() {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('synthesis');
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Results | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [syntheticData, setSyntheticData] = useState<any[]>([]);
  const [dataTab, setDataTab] = useState<'single' | 'multi'>('single');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const logId = useRef(0);
  const consoleRef = useRef<HTMLDivElement>(null);
  const currentJobIds = useRef<string[]>([]);
  const shouldStop = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Evaluation state
  const [evalRunning, setEvalRunning] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [evalMessage, setEvalMessage] = useState('');
  const [evalLogs, setEvalLogs] = useState<string[]>([]);
  const evalConsoleRef = useRef<HTMLDivElement>(null);
  const evalEventSourceRef = useRef<EventSource | null>(null);

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

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/documents');
      setDocuments(response.data.documents || []);
    } catch {
      // Silent error
    }
  }, []);

  const fetchSyntheticData = useCallback(async (type: 'single' | 'multi') => {
    try {
      // Map 'single'/'multi' to 'single-turn'/'multi-turn' for API
      const apiType = type === 'single' ? 'single-turn' : 'multi-turn';
      const response = await axios.get(`http://localhost:8000/api/data/${apiType}`);
      setSyntheticData(response.data);
    } catch {
      setSyntheticData([]);
    }
  }, []);

  useEffect(() => {
    if (currentPage === 'documents') fetchDocuments();
    if (currentPage === 'data') fetchSyntheticData(dataTab);
  }, [currentPage, fetchDocuments, dataTab, fetchSyntheticData]);

  // Auto-scroll
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  // Configuration state
  const [config, setConfig] = useState<Config>({
    task: '',
    scenario: '',
    input_format: '',
    expected_output_format: '',
    reasoning_weight: 0.5,
    multicontext_weight: 0.5,
    api_key: '',
    eval_metric_name: '',
    eval_metric_criteria: '',
    model_name: 'gpt-4o-mini',
    num_evolutions: 2,
    num_goldens: 2,
    eval_threshold: 0.7
  });
  const [showConfigModal, setShowConfigModal] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/config');
      setConfig(res.data);
    } catch {
      console.error('Failed to fetch config');
    }
  }, []);

  useEffect(() => {
    if (currentPage === 'configuration') {
      fetchConfig();
    }
  }, [currentPage, fetchConfig]);

  const saveConfig = async () => {
    try {
      await axios.post('http://localhost:8000/api/config', config);
      log('Configuration saved successfully', 'success');
      setShowConfigModal(true);
    } catch {
      log('Failed to save configuration', 'error');
    }
  };


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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Upload file
  const uploadFile = async (file: File) => {
    if (!file.name.match(/\.(pdf|docx)$/i)) {
      alert('Only PDF and DOCX files are supported');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('http://localhost:8000/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchDocuments();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const [modal, setModal] = useState<{ isOpen: boolean; targetId: string | null }>({
    isOpen: false,
    targetId: null
  });
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);


  // Delete document handlers
  const confirmDelete = (docId: string) => {
    setModal({ isOpen: true, targetId: docId });
  };

  const closeModal = () => {
    setModal({ isOpen: false, targetId: null });
  };

  const handleDeleteConfirm = async () => {
    if (!modal.targetId) return;

    const docId = modal.targetId;
    closeModal(); // Close immediately for better UX

    try {
      await axios.delete(`http://localhost:8000/api/documents/${docId}`);
      await fetchDocuments();
      log('Document deleted successfully', 'success');
    } catch {
      alert('Failed to delete document');
      log('Failed to delete document', 'error');
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
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
        log('Go to Documents page to upload files', 'info');
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
        <div className="app-layout">
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-brand">
              <img src="/logo2.png" alt="SoFi" className="sidebar-logo sidebar-logo-collapsed" />
              <img src="/sofi-logo.png" alt="SoFi" className="sidebar-logo sidebar-logo-expanded" />
            </div>
            <nav className="sidebar-nav">
              <button
                className={`nav-item ${currentPage === 'synthesis' ? 'active' : ''}`}
                onClick={() => setCurrentPage('synthesis')}
              >
                {Icons.synthesis}
                <span className="nav-text">Synthesis</span>
                {running && <span className="nav-badge pulse" />}
              </button>
              <button
                className={`nav-item ${currentPage === 'configuration' ? 'active' : ''}`}
                onClick={() => setCurrentPage('configuration')}
              >
                {Icons.sliders}
                <span className="nav-text">Configuration</span>
              </button>
              <button
                className={`nav-item ${currentPage === 'documents' ? 'active' : ''}`}
                onClick={() => setCurrentPage('documents')}
              >
                {Icons.folder}
                <span className="nav-text">Documents</span>
                <span className="nav-badge">{documents.length}</span>
              </button>
              <button
                className={`nav-item ${currentPage === 'data' ? 'active' : ''}`}
                onClick={() => setCurrentPage('data')}
              >
                {Icons.database}
                <span className="nav-text">Data</span>
              </button>
              <button
                className={`nav-item ${currentPage === 'evaluation' ? 'active' : ''}`}
                onClick={() => setCurrentPage('evaluation')}
              >
                {Icons.beaker}
                <span className="nav-text">Evaluation</span>
                {evalRunning && <span className="nav-badge pulse" />}
              </button>
            </nav>
            <div className="sidebar-footer">
              <div className="status-mini">
                <span className={`status-dot ${status === 'online' ? 'online' : status === 'offline' ? 'offline' : ''}`} />
                <span className="nav-text">{status === 'online' ? 'Connected' : 'Offline'}</span>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="main-container">
            {/* Header */}
            <header className="header">
              <div className="brand">
                <span className="brand-tag">
                  {currentPage === 'synthesis' ? 'QA Synthesis' : currentPage === 'documents' ? 'Documents' : currentPage === 'data' ? 'Synthetic Data' : currentPage === 'evaluation' ? 'Evaluation' : 'Configuration'}
                </span>
              </div>
              <div className="status">
                <span className={`status-dot ${status === 'online' ? 'online' : status === 'offline' ? 'offline' : ''}`} />
                <span>{status === 'online' ? 'API AI Connected' : status === 'checking' ? 'Connecting...' : 'Offline'}</span>
              </div>
            </header>

            {/* Synthesis Page */}
            {currentPage === 'synthesis' && (
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
            )}

            {/* Documents Page */}
            {currentPage === 'documents' && (
              <main className="main">
                {/* Upload Zone */}
                <div
                  className={`upload-zone ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <span className="upload-icon">{uploading ? <span className="spinner-lg" /> : Icons.upload}</span>
                  <span className="upload-title">
                    {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
                  </span>
                  <span className="upload-desc">Supports PDF and DOCX files</span>
                </div>

                {/* Documents List */}
                <div className="documents-card">
                  <div className="documents-header">
                    <span className="documents-title">Source Documents</span>
                    <span className="documents-count">{documents.length} file(s)</span>
                  </div>

                  <div className="documents-body">
                    {documents.length === 0 ? (
                      <div className="empty" style={{ minHeight: '200px' }}>
                        <span className="empty-icon">{Icons.folder}</span>
                        <span className="empty-title">No documents</span>
                        <span className="empty-desc">Upload files to get started</span>
                      </div>
                    ) : (
                      <div className="documents-list">
                        {documents.map(doc => (
                          <div
                            key={doc.id}
                            className="document-item"
                            onClick={() => setPreviewDoc(doc)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="document-icon">
                              {Icons.file}
                            </div>
                            <div className="document-info">
                              <span className="document-name">{doc.name}</span>
                              <span className="document-meta">
                                {doc.type.toUpperCase()} • {formatFileSize(doc.size)}
                              </span>
                            </div>
                            <button
                              className="document-delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDelete(doc.id);
                              }}
                              title="Delete document"
                            >
                              {Icons.trash}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </main>
            )}

            {/* Configuration Page */}
            {currentPage === 'configuration' && (
              <main className="main" style={{ maxWidth: '1200px', margin: '0 auto', overflow: 'hidden' }}>
                <div className="card-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                  <div className="documents-card" style={{ height: '100%' }}>
                    <div className="documents-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="documents-title">System Configuration</span>

                    </div>

                    <div className="documents-body" style={{ padding: '32px', overflowY: 'auto' }}>
                      {/* Original Help Text Removed (moved to header) */}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>

                        {/* Left Column: Global Synthesis Settings */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                              Global Synthesis Settings
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              Control how the AI generates synthetic data. Use these settings to define the personality and difficulty of the Q&A pairs.
                            </p>
                            <div style={{ height: '1px', background: 'var(--border)', marginTop: '12px', marginBottom: '16px' }} />
                          </div>

                          {/* Model Selection */}
                          <div className="form-group">
                            <label className="label-with-tooltip">
                              AI Model
                              <span className="info-icon">i
                                <span className="tooltip-text">Select the brain used for generating data. 'gpt-4o-mini' is usually sufficient.</span>
                              </span>
                            </label>
                            <select
                              className="form-input"
                              style={{ minHeight: '44px' }}
                              value={config.model_name}
                              onChange={e => setConfig({ ...config, model_name: e.target.value })}
                            >
                              <option value="gpt-4o-mini">gpt-4o-mini</option>
                              <option value="gpt-4o">gpt-4o</option>
                              <option value="gpt-3.5-turbo">gpt-3.5-turbo (Legacy)</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="label-with-tooltip">
                              Task Description
                              <span className="info-icon">i
                                <span className="tooltip-text">Define the persona or role the AI should adopt (e.g., 'You are a helpful medical assistant').</span>
                              </span>
                            </label>
                            <textarea
                              className="textarea form-input"
                              rows={3}
                              placeholder="e.g. You are a helpful assistant..."
                              value={config.task}
                              onChange={e => setConfig({ ...config, task: e.target.value })}
                            />
                          </div>

                          <div className="form-group">
                            <label className="label-with-tooltip">
                              Scenario
                              <span className="info-icon">i
                                <span className="tooltip-text">Describe the context or situation for the data generation (e.g., 'A user asks about policy details').</span>
                              </span>
                            </label>
                            <textarea
                              className="textarea form-input"
                              rows={3}
                              placeholder="e.g. A user is asking about..."
                              value={config.scenario}
                              onChange={e => setConfig({ ...config, scenario: e.target.value })}
                            />
                          </div>

                          {/* Data Volume & Complexity Grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div className="form-group">
                              <label className="label-with-tooltip">
                                Data Volume
                                <span className="info-icon">i
                                  <span className="tooltip-text">Number of synthetic Q&A pairs to generate per source document.</span>
                                </span>
                              </label>
                              <input
                                type="number"
                                className="form-input"
                                min="1"
                                max="50"
                                value={config.num_goldens}
                                onChange={e => setConfig({ ...config, num_goldens: parseInt(e.target.value) || 5 })}
                              />
                            </div>
                            <div className="form-group">
                              <label className="label-with-tooltip">
                                Complexity
                                <span className="info-icon">i
                                  <span className="tooltip-text">Number of evolution steps to complicate the query (higher = harder questions).</span>
                                </span>
                              </label>
                              <input
                                type="number"
                                className="form-input"
                                min="1"
                                max="5"
                                value={config.num_evolutions}
                                onChange={e => setConfig({ ...config, num_evolutions: parseInt(e.target.value) || 1 })}
                              />
                            </div>
                          </div>

                          {/* Formatting */}
                          <div className="form-group">
                            <label className="label-with-tooltip">
                              Input Style
                              <span className="info-icon">i
                                <span className="tooltip-text">Format of the user query (e.g., 'A short, direct question').</span>
                              </span>
                            </label>
                            <input
                              className="form-input"
                              value={config.input_format}
                              onChange={e => setConfig({ ...config, input_format: e.target.value })}
                              placeholder="e.g. Short queries"
                            />
                          </div>

                          <div className="form-group">
                            <label className="label-with-tooltip">
                              Output Style
                              <span className="info-icon">i
                                <span className="tooltip-text">Format of the expected answer (e.g., 'A detailed paragraph with citations').</span>
                              </span>
                            </label>
                            <input
                              className="form-input"
                              value={config.expected_output_format}
                              onChange={e => setConfig({ ...config, expected_output_format: e.target.value })}
                              placeholder="e.g. Detailed answers"
                            />
                          </div>

                          {/* Weights Grid */}
                          <div style={{ background: 'var(--bg-card-hover)', padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                            <label className="label-with-tooltip" style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: '16px', display: 'flex' }}>
                              GENERATION MIX
                              <span className="info-icon" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>i
                                <span className="tooltip-text">Adjust the balance between different types of synthetic data generation.</span>
                              </span>
                            </label>

                            <div className="form-group" style={{ marginBottom: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label style={{ fontSize: '13px' }}>Reasoning Focus</label>
                                <span className="range-value">{config.reasoning_weight}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input
                                  type="range"
                                  min="0" max="1" step="0.1"
                                  style={{ flex: 1, backgroundSize: `${(config.reasoning_weight || 0) * 100}% 100%` }}
                                  value={config.reasoning_weight}
                                  onChange={e => setConfig({ ...config, reasoning_weight: parseFloat(e.target.value) })}
                                />
                              </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label style={{ fontSize: '13px' }}>Multi-Context Focus</label>
                                <span className="range-value">{config.multicontext_weight}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input
                                  type="range"
                                  min="0" max="1" step="0.1"
                                  style={{ flex: 1, backgroundSize: `${(config.multicontext_weight || 0) * 100}% 100%` }}
                                  value={config.multicontext_weight}
                                  onChange={e => setConfig({ ...config, multicontext_weight: parseFloat(e.target.value) })}
                                />
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* Right Column: Evaluation Settings */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                              Evaluation Settings
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              Define what "Quality" looks like. The system will use these rules to grade the generated chatbot responses.
                            </p>
                            <div style={{ height: '1px', background: 'var(--border)', marginTop: '12px', marginBottom: '16px' }} />
                          </div>

                          <div className="form-group">
                            <label className="label-with-tooltip">
                              Metric Name
                              <span className="info-icon">i
                                <span className="tooltip-text">Name of the custom metric used for evaluation (e.g., 'Correctness').</span>
                              </span>
                            </label>
                            <input
                              className="form-input"
                              style={{ minHeight: '44px' }}
                              value={config.eval_metric_name || ''}
                              onChange={e => setConfig({ ...config, eval_metric_name: e.target.value })}
                              placeholder="e.g. Professionalism, Accuracy, Empathy"
                            />
                          </div>

                          <div className="form-group">
                            <label className="label-with-tooltip">
                              Pass Threshold
                              <span className="info-icon">i
                                <span className="tooltip-text">Minimum score (0 to 1) required to pass the test. Higher is stricter.</span>
                              </span>
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="range"
                                min="0" max="1" step="0.1"
                                style={{ flex: 1, backgroundSize: `${(config.eval_threshold || 0) * 100}% 100%` }}
                                value={config.eval_threshold}
                                onChange={e => setConfig({ ...config, eval_threshold: parseFloat(e.target.value) })}
                              />
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '24px', textAlign: 'right' }}>{config.eval_threshold}</span>
                            </div>
                          </div>

                          <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <label className="label-with-tooltip">
                              Grading Criteria
                              <span className="info-icon">i
                                <span className="tooltip-text">Describe exactly what makes a response 'Good' vs 'Bad' for the AI judge.</span>
                              </span>
                            </label>
                            <textarea
                              className="form-input"
                              style={{ flex: 1, resize: 'none', minHeight: '200px', fontSize: '13px', lineHeight: '1.6' }}
                              value={config.eval_metric_criteria || ''}
                              onChange={e => setConfig({ ...config, eval_metric_criteria: e.target.value })}
                              placeholder="Describe exactly what makes a response 'Good' vs 'Bad'. e.g., 'The answer must be polite, concise, and contain at least one citation.'"
                            />
                          </div>

                        </div>

                      </div>

                      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" onClick={saveConfig}>
                          Save Configuration
                        </button>
                      </div>

                    </div>
                  </div>

                </div>
              </main>
            )}

            {/* Data Page */}
            {currentPage === 'data' && (
              <main className="main" style={{ maxWidth: '1200px', margin: '0 auto', padding: 0, gap: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
                <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', paddingTop: '24px', marginBottom: '16px' }}>
                  <div className="tabs">
                    <button
                      className={`tab-btn ${dataTab === 'single' ? 'active' : ''}`}
                      onClick={() => setDataTab('single')}
                    >
                      Single-Turn
                    </button>
                    <button
                      className={`tab-btn ${dataTab === 'multi' ? 'active' : ''}`}
                      onClick={() => setDataTab('multi')}
                    >
                      Multi-Turn
                    </button>
                  </div>
                  <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {syntheticData.length} entries
                  </div>
                </div>

                <div className="data-list-container" style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {syntheticData.length === 0 ? (
                      <div className="empty" style={{ marginTop: '40px' }}>
                        <span className="empty-icon">{Icons.database}</span>
                        <span className="empty-title">No data generated yet</span>
                        <span className="empty-desc">Run synthesis to generate QA pairs</span>
                      </div>
                    ) : (
                      syntheticData.map((item, idx) => (
                        <div key={idx} className="data-card">
                          <div className="data-card-header">
                            <span className="data-idx">#{idx + 1}</span>
                          </div>
                          <div className="data-card-body">
                            {dataTab === 'single' ? (
                              <div className="data-display-stack">
                                <div className="data-box input">
                                  <span className="data-box-label">Input</span>
                                  {item.input || item.scenario}
                                </div>
                                <div className="data-box output">
                                  <span className="data-box-label">Expected Output</span>
                                  {item.expected_output || item.expected_outcome}
                                </div>
                              </div>
                            ) : (
                              <div className="data-display-stack">
                                <div className="data-box input">
                                  <span className="data-box-label">Scenario</span>
                                  {item.scenario}
                                </div>
                                <div className="data-box output">
                                  <span className="data-box-label">Expected Outcome</span>
                                  {item.expected_outcome}
                                </div>
                              </div>
                            )}
                            <div className="data-context-toggle">
                              <details>
                                <summary>View Context</summary>
                                <div className="context-list">
                                  {Array.isArray(item.context) ? item.context.map((c: string, cIdx: number) => (
                                    <div key={cIdx} className="context-item chat-mode">
                                      <div className="chat-container context-mode">
                                        {c.split('\n').filter(line => line.trim() !== '').map((line, lIdx) => {
                                          const t = line.trim().toLowerCase();
                                          const questionWords = ['what', 'when', 'where', 'who', 'why', 'how', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'may', 'might', 'must', 'have', 'has', 'had'];
                                          const isQuestion = t.endsWith('?') || questionWords.some(w => t.startsWith(w + ' '));
                                          return (
                                            <div key={lIdx} className={`chat-bubble ${isQuestion ? 'user' : 'bot'} context-bubble`}>
                                              {line}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )) : item.context}
                                </div>
                              </details>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </main>
            )}

            {/* Evaluation Page */}
            {currentPage === 'evaluation' && (
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
                          onClick={() => {
                            if (status !== 'online') {
                              setEvalMessage('Backend not available');
                              return;
                            }
                            setEvalRunning(true);
                            setEvalResult(null);
                            setEvalLogs([]);
                            setEvalMessage('Connecting...');

                            const eventSource = new EventSource('http://localhost:8000/api/evaluation/stream');
                            evalEventSourceRef.current = eventSource;

                            eventSource.addEventListener('log', (e) => {
                              setEvalLogs(prev => [...prev, e.data]);
                              setEvalMessage('Running tests...');
                              // Auto-scroll
                              if (evalConsoleRef.current) {
                                evalConsoleRef.current.scrollTop = evalConsoleRef.current.scrollHeight;
                              }
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
                              setEvalMessage('Connection error');
                              setEvalRunning(false);
                              evalEventSourceRef.current = null;
                              eventSource.close();
                            };
                          }}
                          disabled={evalRunning || status !== 'online'}
                        >
                          {Icons.beaker}
                          Run Tests
                        </button>
                        {evalRunning && (
                          <button
                            className="btn btn-danger"
                            onClick={() => {
                              if (evalEventSourceRef.current) {
                                evalEventSourceRef.current.close();
                                evalEventSourceRef.current = null;
                              }
                              setEvalRunning(false);
                              setEvalMessage('Stopped by user');
                              setEvalLogs(prev => [...prev, '--- Test run stopped by user ---']);
                            }}
                          >
                            {Icons.stop}
                            Stop
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Logs - Only show if NO results (so we don't hide them if the user didn't run tests yet, OR if tests are running)
                    Actually user said "remove container of execution log... because it is result right".
                    So we hide logs fully if results exist.
                */}
                {!evalResult && (
                  <div className="documents-card">
                    <div className="documents-header">
                      <span className="documents-title">Execution Logs</span>
                      <span className="documents-count">{evalLogs.length} lines</span>
                    </div>
                    <div className="documents-body console-body" ref={evalConsoleRef}>
                      {evalLogs.map((log, i) => (
                        <div key={i} className="console-line">{log}</div>
                      ))}
                      {evalLogs.length === 0 && (
                        <div className="console-line text-muted">Waiting for execution...</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Results */}
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

                        {/* Summary Stats Integrated */}
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
                                    color: test.status === 'passed' ? '#4ade80' : '#f87171'
                                  }}>
                                    {test.status}
                                  </span>
                                </div>

                                {/* Description / Output */}
                                <div style={{
                                  marginTop: '8px',
                                  padding: '12px',
                                  background: test.status === 'passed' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(0,0,0,0.2)',
                                  borderRadius: '8px',
                                  fontFamily: 'monospace',
                                  fontSize: '12px',
                                  color: test.status === 'passed' ? '#86efac' : '#fca5a5', // Lighter green for text
                                  whiteSpace: 'pre-wrap',
                                  border: `1px solid ${test.status === 'passed' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`
                                }}>
                                  {test.status === 'passed' ? (
                                    <>
                                      <strong>result:</strong> {test.name} passed successfully.
                                      {test.metrics && (
                                        <div style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
                                          {test.metrics}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    test.reason ? (
                                      <>
                                        <strong>Error:</strong> {test.reason}
                                      </>
                                    ) : (
                                      <>
                                        <strong>Reason:</strong> Test assertion failed. Check console logs for details.
                                      </>
                                    )
                                  )}

                                  {test.details && (
                                    <div style={{ marginTop: '12px', borderTop: `1px dashed ${test.status === 'passed' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`, paddingTop: '12px' }}>
                                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Test Details</div>
                                      <div style={{ display: 'grid', gap: '8px', fontSize: '12px' }}>
                                        {test.details.input && (
                                          <div>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Input:</span> <span style={{ color: 'var(--text-secondary)' }}>{test.details.input}</span>
                                          </div>
                                        )}
                                        {test.details.messages && (
                                          <div>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Conversation:</span>
                                            <div style={{ marginTop: '4px', paddingLeft: '8px', borderLeft: '2px solid var(--border)' }}>
                                              {test.details.messages.map((m, i) => (
                                                <div key={i} style={{ marginBottom: '4px', color: 'var(--text-secondary)' }}>{m}</div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {test.details.output && (
                                          <div>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Output:</span> <span style={{ color: 'var(--text-secondary)' }}>{test.details.output}</span>
                                          </div>
                                        )}
                                        {test.details.expected_output && (
                                          <div>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Expected:</span> <span style={{ color: 'var(--text-secondary)' }}>{test.details.expected_output}</span>
                                          </div>
                                        )}
                                        {test.details.retrieval_context && test.details.retrieval_context.length > 0 && (
                                          <div>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Retrieval Context:</span>
                                            <div style={{ marginTop: '4px', paddingLeft: '8px', borderLeft: '2px solid var(--border)' }}>
                                              {test.details.retrieval_context.map((ctx, cIdx) => (
                                                <div key={cIdx} style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '11px' }}>{ctx}</div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Re-run Button */}
                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          // Reset state to show Hero again
                          setEvalResult(null);
                          setEvalLogs([]);
                          setEvalMessage(''); // Clear message
                          setEvalRunning(false);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                          <path d="M23 4v6h-6"></path>
                          <path d="M1 20v-6h6"></path>
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        Close & Run Again
                      </button>
                    </div>

                  </div>
                )}


              </main>
            )}

            {/* Footer */}
            <footer className="footer">
              <p>Powered by <a href="https://github.com/confident-ai/deepeval" target="_blank" rel="noopener noreferrer">DeepEval</a></p>
            </footer>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {modal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">Delete Document</span>
              <button className="modal-close" onClick={closeModal}>{Icons.x}</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this document? This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-danger" onClick={handleDeleteConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="modal-overlay">
          <div className="modal-content preview-modal">
            <div className="modal-header">
              <span className="modal-title">{previewDoc.name}</span>
              <button className="modal-close" onClick={() => setPreviewDoc(null)}>{Icons.x}</button>
            </div>
            <div className="modal-body preview-body">
              <iframe
                src={`http://localhost:8000/files/${previewDoc.name}`}
                className="document-preview-frame"
                title="Document Preview"
              />
            </div>
          </div>
        </div>
      )}
      {/* Data Page */}


      {/* Config Saved Modal */}
      {showConfigModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">Success</span>
              <button className="modal-close" onClick={() => setShowConfigModal(false)}>{Icons.x}</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                <div style={{ color: 'var(--accent)', transform: 'scale(1.2)' }}>{Icons.check}</div>
                <p style={{ textAlign: 'center', margin: 0 }}>Configuration saved successfully.</p>
              </div>
            </div>
            <div className="modal-actions" style={{ justifyContent: 'center', padding: '12px' }}>
              <button className="btn btn-primary" onClick={() => setShowConfigModal(false)}>Okay</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
