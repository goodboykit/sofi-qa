import { Icons } from './Icons';

interface SidebarProps {
    currentPage: string;
    setCurrentPage: (page: any) => void;
    running: boolean;
    evalRunning: boolean;
    documentsCount: number;
    status: 'online' | 'offline' | 'checking';
}

export function Sidebar({ currentPage, setCurrentPage, running, evalRunning, documentsCount, status }: SidebarProps) {
    return (
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
                    <span className="nav-badge">{documentsCount}</span>
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
    );
}
