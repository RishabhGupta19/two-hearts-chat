import { useRef, useEffect, useCallback, useState } from 'react';

const ENV_WS_BASE = String(import.meta.env.VITE_WS_BASE_URL || "https://solace-nam6.onrender.com");
const ENV_API_BASE = String(import.meta.env.VITE_API_BASE_URL || '').trim();

const isValidCoupleId = (value) => {
  const v = String(value || '').trim();
  return Boolean(v) && v !== 'undefined' && v !== 'null';
};

const normalizeWsBase = (raw) => {
  const base = String(raw || '').trim();
  if (!base || base === 'undefined' || base === 'null' || base.includes('/undefined')) return '';

  // Reject relative paths like '/undefined' so we don't accidentally target Vercel host.
  if (!/^(wss?:\/\/|https?:\/\/)/i.test(base)) return '';

  try {
    const parsed = new URL(base);
    const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : parsed.protocol === 'http:' ? 'ws:' : parsed.protocol;
    return `${wsProtocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, '')}`;
  } catch (e) {
    return '';
  }
};

const resolveWsBase = () => {
  const normalizedEnvWs = normalizeWsBase(ENV_WS_BASE);
  if (normalizedEnvWs) {
    return normalizedEnvWs;
  }

  if (ENV_API_BASE && ENV_API_BASE !== 'undefined') {
    try {
      const apiUrl = new URL(ENV_API_BASE);
      const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${apiUrl.host}`;
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `${wsProtocol}//${window.location.hostname}:8000`;
    }
    return `${wsProtocol}//${window.location.host}`;
  }

  return '';
};

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
    if (!enabledRef.current || !isValidCoupleId(coupleId)) return;
    cleanup();

    const wsBase = resolveWsBase();
    if (!wsBase) return;
    const url = `${wsBase}/ws/chat/${String(coupleId).trim()}/`;
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
    if (enabled && isValidCoupleId(coupleId)) {
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
