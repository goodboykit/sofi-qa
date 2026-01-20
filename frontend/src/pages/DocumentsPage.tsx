import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
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
    const [previewDoc, setPreviewDoc] = React.useState<Document | null>(null);

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
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const openPreview = (doc: Document) => {
        setPreviewDoc(doc);
    };

    const closePreview = () => {
        setPreviewDoc(null);
    };

    const getPreviewUrl = (doc: Document) => {
        return `/files/${doc.name}`;
    };

    const canPreviewInline = (type: string) => {
        return ['pdf', 'txt', 'csv'].includes(type.toLowerCase());
    };

    return (
        <main className="main">
            {/* Upload Dropzone */}
            <div
                className={`upload-dropzone ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.xlsx,.csv,.txt"
                    onChange={(e) => e.target.files && onUpload(e.target.files)}
                    style={{ display: 'none' }}
                />
                <div className="dropzone-icon">
                    {uploading ? <div className="upload-spinner"></div> : Icons.upload}
                </div>
                <div className="dropzone-text">
                    <span className="dropzone-title">
                        {uploading ? 'Uploading...' : 'Click to upload or drag & drop'}
                    </span>
                    <span className="dropzone-hint">
                        PDF, DOCX, XLSX, CSV, TXT supported
                    </span>
                </div>
            </div>

            {/* Documents List */}
            <div className="console-card" style={{ flex: 1 }}>
                <div className="console-header">
                    <span className="console-title">Source Documents</span>
                    <span className="console-meta">{documents.length} files</span>
                </div>
                <div className="console-body">
                    {documents.length === 0 ? (
                        <div className="empty">
                            <span className="empty-icon">{Icons.file}</span>
                            <span className="empty-title">No documents yet</span>
                            <span className="empty-desc">Upload files to get started</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="document-item"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => openPreview(doc)}
                                    title="Click to preview"
                                >
                                    <div className="document-icon">{Icons.file}</div>
                                    <div className="document-info">
                                        <span className="document-name">{doc.name}</span>
                                        <span className="document-meta">
                                            {doc.type} • {formatFileSize(doc.size)}
                                        </span>
                                    </div>
                                    <button
                                        className="document-delete"
                                        onClick={(e) => { e.stopPropagation(); confirmDelete(doc.id); }}
                                        title="Delete"
                                    >
                                        {Icons.trash}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Modal */}
            {previewDoc && (
                <div className="preview-modal-overlay" onClick={closePreview}>
                    <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="preview-header">
                            <div className="preview-title">
                                {Icons.file}
                                <span>{previewDoc.name}</span>
                            </div>
                            <div className="preview-actions">
                                <a
                                    href={getPreviewUrl(previewDoc)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="preview-open-btn"
                                    title="Open in new tab"
                                >
                                    {Icons.external}
                                </a>
                                <button className="preview-close-btn" onClick={closePreview} title="Close">
                                    {Icons.close}
                                </button>
                            </div>
                        </div>
                        <div className="preview-body">
                            {canPreviewInline(previewDoc.type) && previewDoc.type.toLowerCase() === 'pdf' ? (
                                <iframe
                                    src={getPreviewUrl(previewDoc)}
                                    className="preview-iframe"
                                    title={`Preview ${previewDoc.name}`}
                                />
                            ) : canPreviewInline(previewDoc.type) || ['docx', 'xlsx', 'txt', 'csv'].includes(previewDoc.type.toLowerCase()) ? (
                                <TextPreview doc={previewDoc} />
                            ) : (
                                <div className="preview-unsupported">
                                    <div className="preview-unsupported-icon">{Icons.file}</div>
                                    <p>Preview not available for this file type</p>
                                    <a
                                        href={getPreviewUrl(previewDoc)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-primary"
                                    >
                                        Download File
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

function TextPreview({ doc }: { doc: Document }) {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const res = await axios.get(`/api/documents/${doc.id}/preview`);
                setContent(res.data.content);
            } catch (err) {
                setError('Failed to load document preview.');
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, [doc.id]);

    if (loading) return (
        <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Loading preview...
        </div>
    );

    if (error) return (
        <div style={{ padding: '24px', color: 'var(--error)', textAlign: 'center' }}>
            {error}
        </div>
    );

    return (
        <div className="text-preview-container" style={{
            padding: '24px',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            fontSize: '13px',
            lineHeight: '1.5',
            color: 'var(--text-secondary)',
            overflowY: 'auto',
            height: '100%',
            background: 'var(--bg-card)'
        }}>
            {content}
        </div>
    );
}

