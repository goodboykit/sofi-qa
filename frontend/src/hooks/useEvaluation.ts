import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import type { Config } from '../types';

export function useEvaluation() {
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [message, setMessage] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Fetch latest results on mount for session persistence
    useEffect(() => {
        const fetchLatest = async () => {
            // Only fetch if no result currently (e.g. fresh reload)
            if (!result) {
                try {
                    const res = await axios.get('/api/evaluation/latest');
                    if (res.data) {
                        setResult(res.data);
                        setLogs(['--- Loaded previous session results ---']);
                        setProgress(100);
                    }
                } catch (err) {
                    // Fail silently, just means no previous results
                    console.log('No previous session results found.');
                }
            }
        };
        fetchLatest();
    }, []);

    const start = async (singleTurn: any[], multiTurn: any[], config: Config, status: string) => {
        if (status !== 'online') {
            setMessage('Backend not available');
            return;
        }
        setRunning(true);
        setResult(null);
        setLogs([]);
        setProgress(0);
        setMessage('Initializing test run...');

        const totalTests = singleTurn.length + multiTurn.length;
        let completedTests = 0;

        try {
            const startRes = await axios.post('/api/evaluation/start', {
                single_turn_goldens: singleTurn,
                multi_turn_goldens: multiTurn,
                config: config
            });

            const jobId = startRes.data.job_id;
            setMessage('Connecting to event stream...');

            const sessionId = sessionStorage.getItem('sofi_session_id');
            const eventSource = new EventSource(`/api/evaluation/stream?job_id=${jobId}&session_id=${sessionId}`);
            eventSourceRef.current = eventSource;

            eventSource.addEventListener('log', (e) => {
                setLogs(prev => [...prev, e.data]);
                setMessage('Running tests...');
            });

            eventSource.addEventListener('test', (e) => {
                const test = JSON.parse(e.data);
                completedTests++;
                if (totalTests > 0) {
                    setProgress(Math.round((completedTests / totalTests) * 100));
                }
                setLogs(prev => [...prev, `${test.status === 'passed' ? '✓' : '✗'} ${test.name}`]);
            });

            eventSource.addEventListener('progress', (e) => {
                // Fallback if backend sends progress later
                const p = parseInt(e.data);
                if (!isNaN(p)) setProgress(p);
            });

            eventSource.addEventListener('complete', (e) => {
                const res = JSON.parse(e.data);
                setResult(res);
                setMessage(`Completed: ${res.passed} passed, ${res.failed} failed`);
                setProgress(100);
                setRunning(false);
                eventSourceRef.current = null;
                eventSource.close();
            });

            eventSource.addEventListener('error', (e: any) => {
                if (eventSource.readyState === EventSource.CLOSED) return;

                if (e.data) {
                    setMessage(`Error: ${e.data}`);
                } else {
                    setMessage('Connection closed');
                }
                setRunning(false);
                eventSourceRef.current = null;
                eventSource.close();
            });

            eventSource.onerror = () => {
                if (eventSource.readyState !== EventSource.CLOSED) {
                    setMessage('Connection error');
                    setRunning(false);
                    eventSourceRef.current = null;
                    eventSource.close();
                }
            };
        } catch (error) {
            setMessage('Failed to start evaluation');
            setRunning(false);
        }
    };

    const stop = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setRunning(false);
        setMessage('Stopped by user');
        setLogs(prev => [...prev, '--- Test run stopped by user ---']);
    };

    return {
        running,
        result,
        message,
        logs,
        progress,
        start,
        stop
    };
}
