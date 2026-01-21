import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import type { Document } from '../types';

export function useDocuments() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [uploading, setUploading] = useState(false);

    const fetchDocuments = useCallback(async () => {
        try {
            const response = await axios.get('/api/documents');
            setDocuments(response.data.documents || []);
        } catch {
            // silent
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const uploadFile = async (file: File) => {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            await axios.post('/api/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            await fetchDocuments();
            return true; // Success
        } catch (err) {
            console.error('Upload failed:', err);
            return false; // Failure
        } finally {
            setUploading(false);
        }
    };

    const deleteDocument = async (filename: string) => {
        try {
            await axios.delete(`/api/documents/${encodeURIComponent(filename)}`);
            await fetchDocuments();
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    return {
        documents,
        uploading,
        fetchDocuments,
        uploadFile,
        deleteDocument
    };
}
