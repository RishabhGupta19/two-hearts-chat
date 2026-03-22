import { useRef, useEffect, useCallback, useState } from 'react';

const WS_BASE = import.meta.env.VITE_WS_BASE_URL || 'ws://127.0.0.1:8000';

export const useWebSocket = ({ coupleId, enabled, onMessage, onTyping }) => {
  const wsRef = useRef(null);
  const retryCount = useRef(0);
  const retryTimer = useRef(null);
  const [connected, setConnected] = useState(false);
  const enabledRef = useRef(enabled);
  const onMessageRef = useRef(onMessage);
  const onTypingRef = useRef(onTyping);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onTypingRef.current = onTyping; }, [onTyping]);

  const cleanup = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    retryCount.current = 0;
  }, []);

  const connect = useCallback(() => {
    if (!coupleId || !enabledRef.current) return;
    cleanup();

    const url = `${WS_BASE}/ws/chat/${coupleId}/`;
    const token = localStorage.getItem('access_token');
    const ws = new WebSocket(token ? `${url}?token=${token}` : url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      retryCount.current = 0;
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'typing') {
          onTypingRef.current?.(msg);
        } else {
          onMessageRef.current?.(msg);
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (enabledRef.current) {
        const delay = Math.min(1000 * 2 ** retryCount.current, 30000);
        retryCount.current += 1;
        retryTimer.current = setTimeout(() => {
          if (enabledRef.current) connect();
        }, delay);
      }
    };

    ws.onerror = (err) => {
      console.error('WS error:', err);
    };
  }, [coupleId, cleanup]);

  useEffect(() => {
    if (enabled && coupleId) {
      connect();
    } else {
      cleanup();
    }
    return cleanup;
  }, [enabled, coupleId, connect, cleanup]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  const sendTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing' }));
    }
  }, []);

  return { connected, send, sendTyping, cleanup };
};
