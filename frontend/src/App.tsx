import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './index.css';

// Hooks
import { useSessionStorage } from './hooks/useSessionStorage';
import { useDocuments } from './hooks/useDocuments';
import { useSynthesis } from './hooks/useSynthesis';
import { useEvaluation } from './hooks/useEvaluation';

// Types
import type { Config, Document } from './types';

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

type Page = 'synthesis' | 'documents' | 'configuration' | 'data' | 'evaluation';

function App() {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('synthesis');
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  // Config & Goldens (Session Persistence)
  const [config, setConfig] = useSessionStorage<Config>('generation_config', {
    task: '',
    scenario: '',
    model_name: 'gpt-4o-mini',
    input_format: '',
    expected_output_format: '',
    num_goldens: 2,
    reasoning_weight: 0.5,
    multicontext_weight: 0.5,
    num_evolutions: 2,
    api_key: ''
  });
  const [singleTurnGoldens, setSingleTurnGoldens] = useSessionStorage<any[]>('goldens_single', []);
  const [multiTurnGoldens, setMultiTurnGoldens] = useSessionStorage<any[]>('goldens_multi', []);

  // UI State (Modals & Tabs)
  const [dataTab, setDataTab] = useState<'single' | 'multi'>('single');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [uploadSuccessModal, setUploadSuccessModal] = useState<{ open: boolean, filename: string }>({ open: false, filename: '' });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ open: boolean, docId: string, docName: string }>({ open: false, docId: '', docName: '' });
  const [overwriteModal, setOverwriteModal] = useState<{ open: boolean, file: File | null }>({ open: false, file: null });

  // Custom Hooks
  const {
    documents,
    uploading,
    uploadFile: hookUploadFile,
    deleteDocument: hookDeleteDocument
  } = useDocuments();

  const handleSynthesisComplete = useCallback((single: any[], multi: any[]) => {
    setSingleTurnGoldens(single);
    setMultiTurnGoldens(multi);
  }, [setSingleTurnGoldens, setMultiTurnGoldens]);

  const {
    running: synthesisRunning,
    progress: synthesisProgress,
    results: synthesisResults,
    logs: synthesisLogs,
    start: startSynthesisHook,
    stop: stopSynthesisHook
  } = useSynthesis({ onComplete: handleSynthesisComplete });

  const {
    running: evalRunning,
    result: evalResult,
    message: evalMessage,
    logs: evalLogs,
    start: startEvaluationHook,
    stop: stopEvaluationHook
  } = useEvaluation();

  // Derived Data
  const syntheticData = dataTab === 'single' ? singleTurnGoldens : multiTurnGoldens;

  // Initialization
  useEffect(() => {
    // Session ID
    let sessionId = sessionStorage.getItem('sofi_session_id');
    if (!sessionId) {
      sessionId = 'sess-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('sofi_session_id', sessionId);
    }

    // Axios Interceptor
    axios.interceptors.request.clear();
    axios.interceptors.request.use(config => {
      config.headers['x-session-id'] = sessionId;
      return config;
    });

    // Loading Simulation
    const timer = setTimeout(() => setLoading(false), 2300);
    return () => clearTimeout(timer);
  }, []);

  // Health Check
  useEffect(() => {
    const check = async () => {
      try {
        await axios.get('/api/health');
        setStatus('online');
      } catch {
        setStatus('offline');
      }
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  // Config Validation
  useEffect(() => {
    const initConfig = async () => {
      const saved = window.sessionStorage.getItem('generation_config');
      if (!saved) {
        try {
          const res = await axios.get('/api/config');
          setConfig(res.data);
        } catch {
          console.error('Failed to fetch config');
        }
      }
    };
    initConfig();
  }, [setConfig]);

  // Document Modal Handlers
  const uploadFile = async (files: FileList) => {
    if (!files[0]) return;
    const file = files[0];

    if (!file.name.match(/\.(pdf|docx|xlsx|csv|txt)$/i)) {
      alert('Supported formats: PDF, DOCX, XLSX, CSV, TXT');
      return;
    }

    const existingDoc = documents.find(d => d.name.toLowerCase() === file.name.toLowerCase());
    if (existingDoc) {
      setOverwriteModal({ open: true, file });
      return;
    }

    await performUpload(file);
  };

  const performUpload = async (file: File) => {
    const success = await hookUploadFile(file);
    if (success) {
      setUploadSuccessModal({ open: true, filename: file.name });
    } else {
      alert('Upload failed. Please try again.');
    }
  };

  const confirmOverwrite = async () => {
    if (overwriteModal.file) {
      setOverwriteModal({ open: false, file: null });
      await performUpload(overwriteModal.file);
    }
  };

  const confirmDelete = (doc: Document) => {
    setDeleteConfirmModal({ open: true, docId: doc.id, docName: doc.name });
  };

  const deleteDocument = async () => {
    const doc = documents.find(d => d.id === deleteConfirmModal.docId);
    const filename = doc ? doc.name : deleteConfirmModal.docName;

    if (!filename) return;

    const success = await hookDeleteDocument(filename);
    if (!success) {
      alert('Failed to delete');
    }
    setDeleteConfirmModal({ open: false, docId: '', docName: '' });
  };

  const saveConfig = async () => {
    try {
      await axios.post('/api/config', config);
      setSuccessModalOpen(true);
    } catch (err) {
      console.error('Failed to save config:', err);
      alert('Failed to save configuration.');
    }
  };

  // Action Wrappers
  const startSynthesis = () => startSynthesisHook(documents, config, status);
  const startEvaluation = () => startEvaluationHook(singleTurnGoldens, multiTurnGoldens, config, status);

  return (
    <>
      {loading && <LoadingScreen />}

      {!loading && (
        <div className="app-layout">
          <Sidebar
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            running={false}
            evalRunning={false}
            documentsCount={documents.length}
            status={status}
          />

          <div className="main-container">
            <Header currentPage={currentPage} status={status} />

            {currentPage === 'synthesis' && (
              <SynthesisPage
                status={status}
                logs={synthesisLogs}
                running={synthesisRunning}
                progress={synthesisProgress}
                results={synthesisResults}
                onStart={startSynthesis}
                onStop={stopSynthesisHook}
              />
            )}

            {currentPage === 'documents' && (
              <DocumentsPage
                documents={documents}
                uploading={uploading}
                onUpload={uploadFile}
                confirmDelete={confirmDelete}
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
                running={evalRunning}
                result={evalResult}
                message={evalMessage}
                logs={evalLogs}
                onStart={startEvaluation}
                onStop={stopEvaluationHook}
              />
            )}
          </div>
        </div>
      )}

      {/* Modals */}
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
          <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>Configuration has been saved successfully.</p>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Your settings have been written to disk and will persist across restarts.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={uploadSuccessModal.open}
        onClose={() => setUploadSuccessModal({ open: false, filename: '' })}
        title="Success"
        footer={
          <button className="btn-secondary" onClick={() => setUploadSuccessModal({ open: false, filename: '' })}>
            Close
          </button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>Document uploaded successfully.</p>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
            <strong>{uploadSuccessModal.filename}</strong> is ready for synthesis.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={deleteConfirmModal.open}
        onClose={() => setDeleteConfirmModal({ open: false, docId: '', docName: '' })}
        title="Delete Document"
        footer={
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setDeleteConfirmModal({ open: false, docId: '', docName: '' })}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={deleteDocument} style={{ background: '#ef4444', borderColor: '#ef4444' }}>
              Delete
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>Are you sure you want to delete this document?</p>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
            <strong>{deleteConfirmModal.docName}</strong> will be permanently removed.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={overwriteModal.open}
        onClose={() => setOverwriteModal({ open: false, file: null })}
        title="Replace File"
        footer={
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setOverwriteModal({ open: false, file: null })}>
              Cancel
            </button>
            <button className="btn" onClick={confirmOverwrite} style={{ background: '#f59e0b', borderColor: '#f59e0b' }}>
              Replace
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>A file with this name already exists.</p>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
            <strong>{overwriteModal.file?.name}</strong> will be replaced with the new file.
          </p>
        </div>
      </Modal>
    </>
  );
}

export default App;
