import React, { useRef } from 'react';
import type { Document } from '../types';
import { Icons } from '../components/common/Icons';

interface DocumentsPageProps {
    documents: Document[];
    uploading: boolean;
    onUpload: (files: FileList) => void;
    confirmDelete: (id: string) => void;
}

export function DocumentsPage({ documents, uploading, onUpload, confirmDelete }: DocumentsPageProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = React.useState(false);

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
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onUpload(e.dataTransfer.files);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <main className="main" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div className="card-container">
                <div className="documents-card">
                    <div className="documents-header">
                        <span className="documents-title">Source Documents</span>
                        <span className="documents-count">{documents.length} files</span>
                    </div>

                    <div
                        className={`upload-area ${dragActive ? 'active' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={(e) => e.target.files && onUpload(e.target.files)}
                            className="file-input"
                        />
                        <div className="upload-icon">{Icons.upload}</div>
                        <div className="upload-text">
                            {uploading ? 'Uploading...' : 'Click to upload or drag files here'}
                        </div>
                        <div className="upload-hint">Supported: PDF, DOCX, TXT</div>
                    </div>

                    {documents.length > 0 && (
                        <div className="documents-list">
                            {documents.map((doc) => (
                                <div key={doc.id} className="document-item">
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
    );
}
