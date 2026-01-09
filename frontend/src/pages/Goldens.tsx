import { useEffect, useState } from 'react';
import { getGoldens, deleteGolden, updateGolden } from '../lib/api';

interface Golden {
    id: number;
    input: string;
    expected_output: string;
    context?: string[];
    source_file?: string;
}

type GoldenType = 'single' | 'multi';

export default function Goldens() {
    const [singleGoldens, setSingleGoldens] = useState<Golden[]>([]);
    const [multiGoldens, setMultiGoldens] = useState<Golden[]>([]);
    const [activeTab, setActiveTab] = useState<GoldenType>('single');
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchGoldens = async () => {
        try {
            const res = await getGoldens();
            setSingleGoldens(res.data.single_turn);
            setMultiGoldens(res.data.multi_turn);
        } catch (error) {
            console.error('Failed to fetch goldens:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGoldens();
    }, []);

    const handleDelete = async (type: GoldenType, id: number) => {
        if (!confirm('Delete this golden?')) return;
        try {
            await deleteGolden(type, id);
            fetchGoldens();
        } catch (error) {
            console.error('Failed to delete:', error);
        }
    };

    const handleSaveEdit = async (type: GoldenType, id: number) => {
        try {
            await updateGolden(type, id, { expected_output: editValue });
            setEditingId(null);
            fetchGoldens();
        } catch (error) {
            console.error('Failed to update:', error);
        }
    };

    const goldens = activeTab === 'single' ? singleGoldens : multiGoldens;
    const filteredGoldens = goldens.filter(g =>
        g.input.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.expected_output?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fade-in">
            <header className="page-header">
                <h1 className="page-title">Goldens</h1>
                <p className="page-description">
                    Browse and edit generated Q&A pairs
                </p>
            </header>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                <button
                    className={`btn ${activeTab === 'single' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('single')}
                >
                    Single-Turn ({singleGoldens.length})
                </button>
                <button
                    className={`btn ${activeTab === 'multi' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('multi')}
                >
                    Multi-Turn ({multiGoldens.length})
                </button>
            </div>

            {/* Search */}
            <div className="form-group">
                <input
                    type="text"
                    placeholder="🔍 Search goldens..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Goldens List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px' }}>
                    <div className="spinner" style={{ margin: '0 auto' }} />
                </div>
            ) : filteredGoldens.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">💎</div>
                    <p>
                        {searchTerm
                            ? 'No goldens match your search'
                            : `No ${activeTab}-turn goldens yet. Run synthesis first!`}
                    </p>
                </div>
            ) : (
                <div>
                    {filteredGoldens.map(golden => (
                        <div key={golden.id} className="golden-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div className="golden-input">
                                    Q: {golden.input}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => {
                                            setEditingId(golden.id);
                                            setEditValue(golden.expected_output || '');
                                        }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleDelete(activeTab, golden.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>

                            {editingId === golden.id ? (
                                <div style={{ marginTop: '12px' }}>
                                    <textarea
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        rows={5}
                                        style={{ marginBottom: '12px' }}
                                    />
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleSaveEdit(activeTab, golden.id)}
                                        >
                                            Save
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setEditingId(null)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="golden-output">
                                    A: {golden.expected_output || <em style={{ color: 'var(--text-muted)' }}>No expected output</em>}
                                </div>
                            )}

                            {golden.source_file && (
                                <div className="golden-context">
                                    📄 Source: {golden.source_file}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
