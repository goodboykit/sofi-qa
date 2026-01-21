import { useState, useRef } from 'react';
import axios from 'axios';
import type { Config } from '../types';

export function useEvaluation() {
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [message, setMessage] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const eventSourceRef = useRef<EventSource | null>(null);

    const start = async (singleTurn: any[], multiTurn: any[], config: Config, status: string) => {
        if (status !== 'online') {
            setMessage('Backend not available');
            return;
        }
        setRunning(true);
        setResult(null);
        setLogs([]);
        setMessage('Initializing test run...');

        try {
            const startRes = await axios.post('/api/evaluation/start', {
                single_turn_goldens: singleTurn,
                multi_turn_goldens: multiTurn,
                config: config
            });

            const jobId = startRes.data.job_id;
            setMessage('Connecting to event stream...');

            const eventSource = new EventSource(`/api/evaluation/stream?job_id=${jobId}`);
            eventSourceRef.current = eventSource;

            eventSource.addEventListener('log', (e) => {
                setLogs(prev => [...prev, e.data]);
                setMessage('Running tests...');
            });

            eventSource.addEventListener('test', (e) => {
                const test = JSON.parse(e.data);
                setLogs(prev => [...prev, `${test.status === 'passed' ? '✓' : '✗'} ${test.name}`]);
            });

            eventSource.addEventListener('complete', (e) => {
                const res = JSON.parse(e.data);
                setResult(res);
                setMessage(`Completed: ${res.passed} passed, ${res.failed} failed`);
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
        start,
        stop
    };
}
