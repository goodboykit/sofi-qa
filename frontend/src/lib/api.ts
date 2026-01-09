import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

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
}) => api.post('/synthesis/start', data);

export const getSynthesisStatus = (jobId: string) => 
  api.get(`/synthesis/status/${jobId}`);

// Goldens
export const getGoldens = () => api.get('/goldens');
export const getGoldensByType = (type: string) => api.get(`/goldens/${type}`);
export const updateGolden = (type: string, id: number, data: { 
  input?: string; 
  expected_output?: string; 
}) => api.put(`/goldens/${type}/${id}`, data);
export const deleteGolden = (type: string, id: number) => 
  api.delete(`/goldens/${type}/${id}`);

// Health
export const getHealth = () => api.get('/health');

export default api;
