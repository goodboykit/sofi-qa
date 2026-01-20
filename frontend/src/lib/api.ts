import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Documents
export const getDocuments = () => api.get('/documents');
export const uploadDocument = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const deleteDocument = (id: string) => api.delete(`/documents/${id}`);

// Synthesis
export const startSynthesis = (data: {
  document_ids: string[];
  synthesis_type: string;
  max_goldens_per_context: number;
  config: any;
}) => api.post('/synthesis/start', data);

export const getSynthesisStatus = (jobId: string) =>
  api.get(`/synthesis/status/${jobId}`);

// Evaluation
export const startEvaluation = (data: {
  single_turn_goldens: any[];
  multi_turn_goldens: any[];
  config: any;
}) => api.post('/evaluation/start', data);

// Health
export const getHealth = () => api.get('/health');

export default api;
