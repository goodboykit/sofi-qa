import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './index.css';

// Hooks
import { useSessionStorage } from './hooks/useSessionStorage';

// Types
import type { LogEntry, Config, Document } from './types';

// Components
import { LoadingScreen } from './components/common/LoadingScreen';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { Modal } from './components/common/Modal';

// Pages
import { SynthesisPage } from './pages/SynthesisPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ConfigurationPage } from './pages/ConfigurationPage';
import { DataPage } from './pages/DataPage';
import { EvaluationPage } from './pages/EvaluationPage';

// ============================================
// App
// ============================================

type Page = 'synthesis' | 'documents' | 'configuration' | 'data' | 'evaluation';

function App() {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('synthesis');
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  // Shared State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [config, setConfig] = useSessionStorage<Config>('generation_config', {
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
    eval_threshold: 0.7,
    eval_timeout: 60,
    max_user_simulations: 2
  });
  const [singleTurnGoldens, setSingleTurnGoldens] = useSessionStorage<any[]>('goldens_single', []);
  const [multiTurnGoldens, setMultiTurnGoldens] = useSessionStorage<any[]>('goldens_multi', []);

  // UI State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dataTab, setDataTab] = useState<'single' | 'multi'>('single');
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  // Derived
  const syntheticData = dataTab === 'single' ? singleTurnGoldens : multiTurnGoldens;

  // Init
  // Init Session & API
  useEffect(() => {
    // 1. Session ID Management
    let sessionId = localStorage.getItem('sofi_session_id');
    if (!sessionId) {
      // Simple fallback UUID generator since we might not have 'uuid' package installed
      sessionId = 'sess-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('sofi_session_id', sessionId);
    }

    // 2. Axios Interceptor
    // Remove existing interceptors to prevent duplicates on hot reload
    axios.interceptors.request.clear();
    axios.interceptors.request.use(config => {
      config.headers['x-session-id'] = sessionId;
      return config;
    });

    const timer = setTimeout(() => setLoading(false), 2300);
    return () => clearTimeout(timer);
  }, []);

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

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/documents');
      setDocuments(response.data.documents || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (currentPage === 'documents') fetchDocuments();
  }, [currentPage, fetchDocuments]);

  // Config Fetch
  const fetchConfig = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/config');
      setConfig(res.data);
    } catch {
      console.error('Failed to fetch config');
    }
  }, []);

  // Synthetic Data Fetch
  const fetchSyntheticData = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/synthetic-data');
      if (res.data.single_turn && res.data.single_turn.length > 0) {
        setSingleTurnGoldens(res.data.single_turn);
      }
      if (res.data.multi_turn && res.data.multi_turn.length > 0) {
        setMultiTurnGoldens(res.data.multi_turn);
      }
    } catch {
      console.error('Failed to fetch synthetic data');
    }
  }, []);

  useEffect(() => {
    const initConfig = async () => {
      const saved = window.sessionStorage.getItem('generation_config');
      if (!saved) {
        await fetchConfig();
      }
    };
    initConfig();
  }, [fetchConfig]);

  // Load synthetic data on startup
  useEffect(() => {
    // Only fetch if session storage is empty
    const savedSingle = window.sessionStorage.getItem('goldens_single');
    const savedMulti = window.sessionStorage.getItem('goldens_multi');
    if (!savedSingle || savedSingle === '[]' || !savedMulti || savedMulti === '[]') {
      fetchSyntheticData();
    }
  }, [fetchSyntheticData]);

  const saveConfig = async () => {
    try {
      await axios.post('http://localhost:8000/api/config', config);
      setSuccessModalOpen(true);
    } catch (err) {
      console.error('Failed to save config:', err);
      alert('Failed to save configuration.');
    }
  };

  // Document Handlers
  const uploadFile = async (files: FileList) => {
    if (!files[0]) return;
    const file = files[0];

    if (!file.name.match(/\.(pdf|docx|xlsx|csv|txt)$/i)) {
      alert('Supported formats: PDF, DOCX, XLSX, CSV, TXT');
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

  const deleteDocument = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await axios.delete(`http://localhost:8000/api/documents/${id}`);
      await fetchDocuments();
    } catch {
      alert('Failed to delete');
    }
  }

  // Synthesis Handler
  const handleSynthesisComplete = (single: any[], multi: any[]) => {
    setSingleTurnGoldens(single);
    setMultiTurnGoldens(multi);
  };

  return (
    <>
      {loading && <LoadingScreen />}

      {!loading && (
        <div className="app-layout">
          <Sidebar
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            running={false} // State moved to SynthesisPage, so logic for badge needs prop if we want it back.
            // However, strictly speaking, Sidebar doesn't NEED to know running state if we accept removal of "pulse" on sidebar.
            // If we want it, we need to lift `running` state back up.
            // For this refactor, let's keep it simple.
            evalRunning={false} // Same as above.
            documentsCount={documents.length}
            status={status}
          />

          <div className="main-container">
            <Header currentPage={currentPage} status={status} />

            {currentPage === 'synthesis' && (
              <SynthesisPage
                status={status}
                documents={documents}
                config={config}
                onSynthesisComplete={handleSynthesisComplete}
                logs={logs}
                setLogs={setLogs}
              />
            )}

            {currentPage === 'documents' && (
              <DocumentsPage
                documents={documents}
                uploading={uploading}
                onUpload={uploadFile}
                confirmDelete={deleteDocument} // Mapping both for compatibility
              />
            )}

            {currentPage === 'configuration' && (
              <ConfigurationPage
                config={config}
                setConfig={setConfig}
                saveConfig={saveConfig}
              />
            )}

            {currentPage === 'data' && (
              <DataPage
                syntheticData={syntheticData}
                dataTab={dataTab}
                setDataTab={setDataTab}
              />
            )}

            {currentPage === 'evaluation' && (
              <EvaluationPage
                status={status}
                singleTurnGoldens={singleTurnGoldens}
                multiTurnGoldens={multiTurnGoldens}
                config={config}
              />
            )}
          </div>
        </div>
      )}
      <Modal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        title="Success"
        footer={
          <button className="btn-secondary" onClick={() => setSuccessModalOpen(false)}>
            Close
          </button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p>Configuration has been saved successfully.</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Your settings have been written to disk and will persist across restarts.
          </p>
        </div>
      </Modal>
    </>
  );
}

export default App;
