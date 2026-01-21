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
                        <div className="empty" style={{ marginTop: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.7 }}>
                            <span className="empty-icon" style={{ fontSize: '64px', marginBottom: '16px', color: 'var(--text-muted)' }}>{Icons.database}</span>
                            <span className="empty-title" style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No data generated yet</span>
                            <span className="empty-desc" style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Run synthesis to generate QA pairs</span>
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
                                                {item.input || item.scenario || item.user_input}
                                            </div>
                                            <div className="data-box output">
                                                <span className="data-box-label">Expected Output</span>
                                                {item.expected_output || item.expectedOutput || item.expected_outcome || item.expectedOutcome || '(No expected output found)'}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="data-display-stack">
                                            <div className="data-box input">
                                                <span className="data-box-label">Scenario</span>
                                                {item.scenario || item.input || item.user_input}
                                            </div>
                                            <div className="data-box output">
                                                <span className="data-box-label">Expected Outcome</span>
                                                {item.expected_outcome || item.expectedOutcome || item.expected_output || item.expectedOutput || '(No expected outcome found)'}
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
                                                        <div key={cIdx} className="context-item chat-mode" style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                                                            <div className="data-box-label" style={{ marginBottom: '8px', opacity: 0.6, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                                Retrieval Chunk #{cIdx + 1}
                                                            </div>
                                                            <div className="chat-container context-mode">
                                                                {segments.map((line, lIdx) => {
                                                                    const t = line.trim().toLowerCase();
                                                                    const questionStarters = [
                                                                        // English - Standard Question Words
                                                                        'what', 'when', 'where', 'who', 'why', 'how', 'which', 'whose', 'whom',

                                                                        // English - Auxiliary & Modal Verbs (starting a sentence)
                                                                        'is', 'are', 'am', 'was', 'were',
                                                                        'do', 'does', 'did',
                                                                        'can', 'could',
                                                                        'will', 'would', 'shall', 'should',
                                                                        'have', 'has', 'had',
                                                                        'may', 'might', 'must',

                                                                        // English - Common Phrases (Specific checks)
                                                                        'is there', 'are there', 'is it', 'is the', 'are you', 'are we',
                                                                        'do you', 'do we', 'do they',
                                                                        'can i', 'can we', 'can you',

                                                                        // Tagalog / Filipino - Question Words
                                                                        'ano', 'anu-ano', 'saan', 'nasaan', 'kailan', 'kelan', 'sino', 'sinu-sino',
                                                                        'bakit', 'paano', 'pano', 'gaano', 'ilan', 'magkano', 'alin', 'kanino',

                                                                        // Tagalog / Filipino - Common Question Starters & Particles
                                                                        'pwede', 'puwede', 'maaari',
                                                                        'meron', 'mayroon', 'may', 'wala',
                                                                        'libre', 'open', 'bukas', 'sarado', 'available',
                                                                        'totoo', 'talaga', 'ganoon', 'ganon', 'diba', 'di ba',
                                                                        'kailangan', 'kelangan', 'need',
                                                                        'ok lang', 'okay lang',
                                                                        'allowed', 'accept', 'valid', 'included',
                                                                        'paki', 'possible', 'how much'
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
