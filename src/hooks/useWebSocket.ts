import { useEffect, useRef, useCallback, useState } from 'react';

interface WSMessage {
  type: string;
  [key: string]: any;
}

interface UseWebSocketOptions {
  onTaskUpdate?: (data: any) => void;
  onProgressUpdate?: (data: any) => void;
  onAchievement?: (data: any) => void;
  onConnected?: () => void;
}

const isValidTokenFormat = (token: string): boolean => {
  return typeof token === 'string' && token.length > 0;
};

const getSecureToken = (): string | null => {
  try {
    const stored = localStorage.getItem('skillmap_state');
    if (!stored) return null;
    const state = JSON.parse(stored);
    const token = state?.auth?.token;
    if (!token || !isValidTokenFormat(token)) return null;
    return token;
  } catch {
    return null;
  }
};

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const hasEverConnected = useRef(false);

  const connect = useCallback(() => {
    (async () => {
      try {
        await fetch('/api/auth/whoami', { credentials: 'include' });

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          hasEverConnected.current = true;
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
          options.onConnected?.();

          const token = getSecureToken();
          if (token) {
            ws.send(JSON.stringify({ type: 'auth', token }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data);

            switch (message.type) {
              case 'task_update':
                options.onTaskUpdate?.(message);
                break;
              case 'progress_update':
                options.onProgressUpdate?.(message);
                break;
              case 'achievement_earned':
                options.onAchievement?.(message);
                break;
              case 'connected':
                break;
            }
          } catch (e) {
            console.error('WebSocket message parse error:', e);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          wsRef.current = null;

          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              connect();
            }, delay);
          }
        };

        ws.onerror = (_event) => {
        };
      } catch (e) {
        console.error('WebSocket connection failed:', e);
      }
    })();
  }, [options]);

  const subscribeTask = useCallback((taskId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe_task', taskId }));
    }
  }, []);

  const unsubscribeTask = useCallback((taskId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe_task', taskId }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    subscribeTask,
    unsubscribeTask,
    disconnect,
    reconnect: connect,
  };
}
