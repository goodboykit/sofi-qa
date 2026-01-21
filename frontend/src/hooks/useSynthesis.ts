import { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import type { Config, Document, LogEntry } from '../types';

interface UseSynthesisProps {
    onComplete: (single: any[], multi: any[]) => void;
}

export function useSynthesis({ onComplete }: UseSynthesisProps) {
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<{ singleTurn: number, multiTurn: number, duration: string } | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const jobIds = useRef<string[]>([]);
    const shouldStop = useRef(false);
    const logIdCounter = useRef(0);

    const log = useCallback((message: string, type: LogEntry['type'] = 'info') => {
        const time = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
        setLogs(prev => [...prev, { id: logIdCounter.current++, time, message, type }]);
    }, []);

    const start = async (documents: Document[], config: Config, status: string) => {
        if (status !== 'online') {
            log('Backend not available', 'error');
            return;
        }

        setRunning(true);
        setProgress(0);
        setResults(null);
        setLogs([]);
        shouldStop.current = false;
        jobIds.current = [];

        const startTime = Date.now();
        log('Starting synthesis pipeline', 'primary');

        try {
            // Check documents
            log('Scanning documents');
            setProgress(10);

            if (documents.length === 0) {
                log('No documents uploaded', 'warning');
                log('Please upload documents in the Documents tab', 'info');
                setRunning(false);
                return;
            }

            log(`Processing ${documents.length} document(s)`, 'success');
            setProgress(20);

            // Single-turn
            log('Generating single-turn Q&A', 'primary');
            const ids = documents.map(d => d.id);

            const job1 = await axios.post('/api/synthesis/start', {
                document_ids: ids,
                synthesis_type: 'single',
                max_goldens_per_context: config.num_goldens,
                config: config
            });

            jobIds.current.push(job1.data.job_id);
            log(`Job ${job1.data.job_id} started`);
            setProgress(30);

            let done1 = false;
            let result1Data = [];
            while (!done1 && !shouldStop.current) {
                await new Promise(r => setTimeout(r, 2000));
                if (shouldStop.current) break;

                const res = await axios.get(`/api/synthesis/status/${job1.data.job_id}`);

                if (res.data.status === 'running') {
                    log(res.data.message);
                    setProgress(p => Math.min(p + 5, 45));
                } else if (res.data.status === 'completed') {
                    done1 = true;
                    result1Data = res.data.result?.data || [];
                    log(`Single-turn: ${res.data.result?.count || 0} pairs`, 'success');
                    setProgress(50);
                } else if (res.data.status === 'failed' || res.data.status === 'cancelled') {
                    throw new Error(res.data.message);
                }
            }

            if (shouldStop.current) {
                log('Synthesis stopped by user', 'warning');
                return;
            }

            // Multi-turn
            log('Generating multi-turn conversations', 'primary');

            const job2 = await axios.post('/api/synthesis/start', {
                document_ids: ids,
                synthesis_type: 'multi',
                max_goldens_per_context: config.num_goldens,
                config: config
            });

            jobIds.current.push(job2.data.job_id);
            log(`Job ${job2.data.job_id} started`);
            setProgress(60);

            let done2 = false;
            let result2Data = [];
            while (!done2 && !shouldStop.current) {
                await new Promise(r => setTimeout(r, 2000));
                if (shouldStop.current) break;

                const res = await axios.get(`/api/synthesis/status/${job2.data.job_id}`);

                if (res.data.status === 'running') {
                    log(res.data.message);
                    setProgress(p => Math.min(p + 5, 85));
                } else if (res.data.status === 'completed') {
                    done2 = true;
                    result2Data = res.data.result?.data || [];
                    log(`Multi-turn: ${res.data.result?.count || 0} conversations`, 'success');
                    setProgress(90);
                } else if (res.data.status === 'failed' || res.data.status === 'cancelled') {
                    throw new Error(res.data.message);
                }
            }

            if (shouldStop.current) {
                log('Synthesis stopped by user', 'warning');
                return;
            }

            // Results
            log('Finalizing');
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);

            setResults({
                singleTurn: result1Data.length,
                multiTurn: result2Data.length,
                duration: `${duration}s`
            });

            // Save to parent/persistence
            onComplete(result1Data, result2Data);

            setProgress(100);
            log(`Completed in ${duration}s`, 'success');
            log('Output: Saved to Session Storage', 'success');

        } catch (err) {
            if (!shouldStop.current) {
                log(err instanceof Error ? err.message : 'Error occurred', 'error');
            }
        } finally {
            setRunning(false);
            jobIds.current = [];
        }
    };

    const stop = async () => {
        shouldStop.current = true;
        log('Stopping synthesis...', 'warning');

        for (const jobId of jobIds.current) {
            try {
                await axios.post(`/api/synthesis/cancel/${jobId}`);
                log(`Job ${jobId} cancelled`, 'warning');
            } catch {
                // Job may have already completed
            }
        }
        setRunning(false);
    };

    return {
        running,
        progress,
        results,
        logs,
        start,
        stop
    };
}
