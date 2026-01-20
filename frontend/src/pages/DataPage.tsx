import { Icons } from '../components/common/Icons';

interface DataPageProps {
    syntheticData: any[];
    dataTab: 'single' | 'multi';
    setDataTab: (tab: 'single' | 'multi') => void;
}

export function DataPage({ syntheticData, dataTab, setDataTab }: DataPageProps) {
    return (
        <main className="main" style={{ maxWidth: '1200px', margin: '0 auto', padding: 0, gap: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', paddingTop: '24px', marginBottom: '16px' }}>
                <div className="tabs">
                    <button
                        className={`tab-btn ${dataTab === 'single' ? 'active' : ''}`}
                        onClick={() => setDataTab('single')}
                    >
                        Single-Turn
                    </button>
                    <button
                        className={`tab-btn ${dataTab === 'multi' ? 'active' : ''}`}
                        onClick={() => setDataTab('multi')}
                    >
                        Multi-Turn
                    </button>
                </div>
                <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {syntheticData.length} entries
                </div>
            </div>

            <div className="data-list-container" style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px 24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {syntheticData.length === 0 ? (
                        <div className="empty" style={{ marginTop: '40px' }}>
                            <span className="empty-icon">{Icons.database}</span>
                            <span className="empty-title">No data generated yet</span>
                            <span className="empty-desc">Run synthesis to generate QA pairs</span>
                        </div>
                    ) : (
                        syntheticData.map((item, idx) => (
                            <div key={idx} className="data-card">
                                <div className="data-card-header">
                                    <span className="data-idx">#{idx + 1}</span>
                                </div>
                                <div className="data-card-body">
                                    {dataTab === 'single' ? (
                                        <div className="data-display-stack">
                                            <div className="data-box input">
                                                <span className="data-box-label">Input</span>
                                                {item.input || item.scenario}
                                            </div>
                                            <div className="data-box output">
                                                <span className="data-box-label">Expected Output</span>
                                                {item.expected_output || item.expected_outcome}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="data-display-stack">
                                            <div className="data-box input">
                                                <span className="data-box-label">Scenario</span>
                                                {item.scenario}
                                            </div>
                                            <div className="data-box output">
                                                <span className="data-box-label">Expected Outcome</span>
                                                {item.expected_outcome}
                                            </div>
                                        </div>
                                    )}
                                    <div className="data-context-toggle">
                                        <details>
                                            <summary>View Context</summary>
                                            <div className="context-list">
                                                {Array.isArray(item.context) ? item.context.map((c: string, cIdx: number) => {
                                                    const splitIntoQA = (text: string): string[] => {
                                                        const parts: string[] = [];
                                                        if (text.includes('?')) {
                                                            const qSplit = text.split(/(\?)/);
                                                            let current = '';
                                                            for (let i = 0; i < qSplit.length; i++) {
                                                                if (qSplit[i] === '?') {
                                                                    current += '?';
                                                                    if (current.trim()) parts.push(current.trim());
                                                                    current = '';
                                                                } else {
                                                                    current += qSplit[i];
                                                                }
                                                            }
                                                            if (current.trim()) parts.push(current.trim());
                                                        } else {
                                                            const answerStarters = /([a-z,!.])(?=(Currently|Unfortunately|Actually|However|Yes|No|Oh|We |Our |The |It |I |Thank|Please|Sure|Absolutely|Of course|Certainly|So |Basically|Well |Right now|At the moment|Hindi|Oo|Wala|Meron|Mayroon|Opo|Sa |Ang |Yung |Kasi|Marami|Salamat|Pasensya|Libre|Kapag|Nag|May |Pwede |Puwede |Maaari |Kami |Tayo |Sila |Ito |Iyan |Iyon |Para |Dahil|Siguro|Depende|Sorry|Okay|Ok ))/g;
                                                            const splitText = text.replace(answerStarters, '$1|||SPLIT|||');
                                                            const rawParts = splitText.split('|||SPLIT|||');
                                                            rawParts.forEach(p => {
                                                                if (p.trim()) parts.push(p.trim());
                                                            });
                                                        }
                                                        return parts.length > 0 ? parts : [text];
                                                    };

                                                    const segments = splitIntoQA(c).flatMap(seg => seg.split('\n').filter(line => line.trim() !== ''));

                                                    return (
                                                        <div key={cIdx} className="context-item chat-mode">
                                                            <div className="chat-container context-mode">
                                                                {segments.map((line, lIdx) => {
                                                                    const t = line.trim().toLowerCase();
                                                                    const questionStarters = [
                                                                        'what', 'when', 'where', 'who', 'why', 'how', 'which',
                                                                        'is there', 'are there', 'is it', 'is the', 'are you', 'are we',
                                                                        'do you', 'do we', 'do they', 'does', 'did',
                                                                        'can i', 'can we', 'can you', 'could', 'would', 'will', 'shall',
                                                                        'have you', 'has', 'had',
                                                                        'ano', 'saan', 'nasaan', 'kailan', 'kelan', 'sino', 'bakit', 'paano', 'magkano', 'ilan', 'gaano',
                                                                        'pwede ba', 'puwede ba', 'pwede', 'puwede', 'maaari ba', 'maaari',
                                                                        'meron ba', 'mayroon ba', 'may ba', 'wala ba',
                                                                        'libre ba', 'open ba', 'available ba', 'bukas ba', 'sarado ba',
                                                                        'totoo ba', 'talaga ba', 'ganoon ba', 'ganon ba', 'diba',
                                                                        'kailangan ba', 'kelangan ba', 'need ba',
                                                                        'ok lang ba', 'okay lang ba', 'allowed ba', 'accept ba', 'valid ba', 'included ba'
                                                                    ];
                                                                    const isQuestion = t.endsWith('?') || questionStarters.some(w => t.startsWith(w + ' ') || t.startsWith(w + '?') || t === w);
                                                                    return (
                                                                        <div key={lIdx} className={`chat-bubble ${isQuestion ? 'user' : 'bot'} context-bubble`}>
                                                                            {line}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                }) : item.context}
                                            </div>
                                        </details>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}
