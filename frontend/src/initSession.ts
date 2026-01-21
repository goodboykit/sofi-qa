import axios from 'axios';

export function initSession() {
    // Get or Create Session ID
    let sessionId = sessionStorage.getItem('sofi_session_id');
    if (!sessionId) {
        sessionId = 'sess-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('sofi_session_id', sessionId);
    }

    // Set Global Axios Header
    // This ensures ALL subsequent requests have the header
    axios.defaults.headers.common['x-session-id'] = sessionId;

    // Also add an interceptor just to be safe for re-instantiated instances
    axios.interceptors.request.use(config => {
        config.headers['x-session-id'] = sessionId;
        return config;
    });

    console.log('✅ Session Initialized:', sessionId);
}
