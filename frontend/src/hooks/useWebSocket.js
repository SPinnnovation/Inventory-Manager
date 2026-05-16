import { useEffect, useRef, useState } from 'react';

/**
 * Manages a single WebSocket connection with automatic exponential-backoff
 * reconnection on close/error.
 *
 * @param {object} options
 * @param {string|null}  options.url       Full WebSocket URL (ws:// or wss://)
 * @param {function}     options.onMessage Stable callback (useCallback) invoked
 *                                         with the parsed JSON payload on each message
 * @param {boolean}      [options.enabled=true]  Pass false to prevent connecting
 *                                               (e.g. while the user is logged out)
 * @returns {{ status: 'connecting'|'connected'|'disconnected' }}
 */
export default function useWebSocket({ url, onMessage, enabled = true }) {
    const wsRef    = useRef(null);
    const retryRef = useRef(0);
    const timerRef = useRef(null);
    const [status, setStatus] = useState('disconnected');

    useEffect(() => {
        if (!enabled || !url) return;

        function connect() {
            setStatus('connecting');
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setStatus('connected');
                retryRef.current = 0;
            };

            ws.onmessage = (e) => {
                try {
                    onMessage(JSON.parse(e.data));
                } catch {
                    // malformed frame — ignore
                }
            };

            // onerror always precedes onclose; onclose handles the reconnect
            ws.onerror = () => {};

            ws.onclose = () => {
                setStatus('disconnected');
                // Exponential backoff: 1s → 2s → 4s → … capped at 30s
                const delay = Math.min(1000 * 2 ** retryRef.current, 30_000);
                retryRef.current += 1;
                timerRef.current = setTimeout(connect, delay);
            };
        }

        connect();

        return () => {
            clearTimeout(timerRef.current);
            if (wsRef.current) {
                // Prevent onclose from scheduling another reconnect during cleanup
                wsRef.current.onclose = null;
                wsRef.current.close();
            }
        };
    }, [url, enabled]); // onMessage must be a stable reference (useCallback in caller)

    return { status };
}
