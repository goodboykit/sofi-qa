import { useEffect, useState, useCallback } from 'react';
import { getDocuments, uploadDocument, deleteDocument } from '../lib/api';

interface Document {
    id: string;
    name: string;
    size: number;
    uploaded_at: string;
    type: string;
}

export default function Documents() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const fetchDocuments = useCallback(async () => {
        try {
            const res = await getDocuments();
            setDocuments(res.data.documents);
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleUpload = async (files: FileList) => {
        setUploading(true);
        for (const file of Array.from(files)) {
            try {
                await uploadDocument(file);
            } catch (error) {
                console.error('Failed to upload:', error);
            }
        }
        setUploading(false);
        fetchDocuments();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this document?')) return;
        try {
            await deleteDocument(id);
            fetchDocuments();
        } catch (error) {
            console.error('Failed to delete:', error);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="fade-in">
            <header className="page-header">
                <h1 className="page-title">Documents</h1>
                <p className="page-description">
                    Upload PDF or DOCX files to use as source material for synthesis
                </p>
            </header>

            {/* Upload Zone */}
            <div
                className={`upload-zone ${dragActive ? 'dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
            >
                <input
                    id="file-input"
                    type="file"
                    multiple
                    accept=".pdf,.docx"
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files && handleUpload(e.target.files)}
                />
                <div className="upload-icon">📤</div>
                <div className="upload-text">
                    {uploading ? 'Uploading...' : 'Drag & drop files here, or click to browse'}
                </div>
                <div className="upload-hint">Supports PDF and DOCX files</div>
            </div>

            {/* Documents Table */}
            <div className="card" style={{ marginTop: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title">Uploaded Documents ({documents.length})</h2>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <div className="spinner" style={{ margin: '0 auto' }} />
                    </div>
                ) : documents.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📁</div>
                        <p>No documents yet. Upload some files to get started!</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Size</th>
                                    <th>Uploaded</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.map((doc) => (
                                    <tr key={doc.id}>
                                        <td>{doc.name}</td>
                                        <td>
                                            <span className="badge badge-info">{doc.type}</span>
                                        </td>
                                        <td>{formatSize(doc.size)}</td>
                                        <td>{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                                        <td>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDelete(doc.id)}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
