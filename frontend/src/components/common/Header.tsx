

interface HeaderProps {
    currentPage: string;
    status: 'online' | 'offline' | 'checking';
}

export function Header({ currentPage, status }: HeaderProps) {
    const getTitle = () => {
        switch (currentPage) {
            case 'synthesis': return 'QA Synthesis';
            case 'documents': return 'Documents';
            case 'data': return 'Synthetic Data';
            case 'evaluation': return 'Evaluation';
            default: return 'Configuration';
        }
    }

    return (
        <header className="header">
            <div className="brand">
                <span className="brand-tag">
                    {getTitle()}
                </span>
            </div>
            <div className="status">
                <span className={`status-dot ${status === 'online' ? 'online' : status === 'offline' ? 'offline' : ''}`} />
                <span>{status === 'online' ? 'API AI Connected' : status === 'checking' ? 'Connecting...' : 'Offline'}</span>
            </div>
        </header>
    );
}
