import { ServerMessage, ClientMessage } from '../types/index.ts';

export type SocketListener = (msg: ServerMessage) => void;
export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'offline';
export type StatusListener = (status: ConnectionStatus, retrySecondsLeft?: number) => void;

// Default fallback host if VITE_WEBSOCKET_URL is not set in Vercel environment variables.
// Note: In production on Vercel, set VITE_WEBSOCKET_URL=wss://ologle-backend.vercel.app/ws
// in your Vercel Project Settings -> Environment Variables.
const DEFAULT_SIGNALING_HOST = 'ologle-backend.vercel.app';

export function resolveWebSocketUrl(
  configuredUrl: string | undefined,
  isProduction: boolean,
  protocol: string,
  host: string,
  existingSessionId?: string | null
): string {
  const appendSessionId = (rawUrl: string): string => {
    const cleanId = existingSessionId?.trim();
    if (!cleanId) return rawUrl;
    try {
      const parsed = new URL(rawUrl);
      parsed.searchParams.set('sessionId', cleanId);
      return parsed.toString();
    } catch {
      const separator = rawUrl.includes('?') ? '&' : '?';
      return `${rawUrl}${separator}sessionId=${encodeURIComponent(cleanId)}`;
    }
  };

  const configured = configuredUrl?.trim();
  // When VITE_WEBSOCKET_URL is set in Vercel environment variables, use it.
  if (configured) {
    try {
      const url = new URL(configured);
      // Accept http(s):// values (e.g. a pasted Vercel backend URL) and normalize to ws(s)://,
      // since older browsers reject non-ws schemes in the WebSocket constructor.
      if (url.protocol === 'https:') url.protocol = 'wss:';
      else if (url.protocol === 'http:') url.protocol = 'ws:';
      // Normalize pathname: strip trailing slashes and ensure path is /ws (never /ws/ or /ws/ws)
      const cleanedPath = (url.pathname || '').replace(/\/+$/, '');
      if (!cleanedPath || cleanedPath === '/') {
        url.pathname = '/ws';
      } else if (cleanedPath.endsWith('/ws/ws')) {
        url.pathname = cleanedPath.replace(/\/ws\/ws$/, '/ws');
      } else {
        url.pathname = cleanedPath;
      }
      return appendSessionId(url.toString());
    } catch {
      return appendSessionId(configured);
    }
  }

  const websocketProtocol = protocol === 'https:' ? 'wss:' : 'ws:';

  // Dev / Vite preview / local testing: connect to same host where dev server runs /ws
  if (!isProduction || host.includes('localhost') || host.includes('127.0.0.1')) {
    return appendSessionId(`${websocketProtocol}//${host}/ws`);
  }

  // If the frontend is hosted directly on the Node backend (e.g. on Render or custom server)
  if (host.endsWith('.onrender.com')) {
    return appendSessionId(`${websocketProtocol}//${host}/ws`);
  }

  // When deployed on Vercel without VITE_WEBSOCKET_URL set at build time:
  if (isProduction && (host.endsWith('.vercel.app') || host.includes('vercel'))) {
    console.warn(
      '[OLOGLE] VITE_WEBSOCKET_URL is not defined in your Vercel Project Settings.\n' +
      'Please add VITE_WEBSOCKET_URL=wss://YOUR-ACTUAL-BACKEND-DOMAIN/ws in Vercel -> Settings -> Environment Variables.'
    );
  }

  return appendSessionId(`wss://${DEFAULT_SIGNALING_HOST}/ws`);
}

class OlogleClientSocket {
  private socket: WebSocket | null = null;
  private listeners: Set<SocketListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private reconnectTimer: any = null;
  private countdownTimer: any = null;
  private heartbeatTimer: any = null;
  private connectTimeoutTimer: any = null;
  private isExplicitlyClosed = false;
  private attemptCount = 0;
  private retrySecondsLeft = 0;
  private connectionAttemptId = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private pendingOutboundQueue: { msg: ClientMessage; timestamp: number }[] = [];
  public status: ConnectionStatus = 'disconnected';
  public sessionId: string | null = null;
  public isConnected = false;
  public currentActiveRoomId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('online', () => {
        if (!this.isExplicitlyClosed) {
          this.reconnectNow();
        }
      });
      window.addEventListener('offline', () => {
        this.clearTimers();
        this.cleanupSocket(this.socket);
        this.socket = null;
        this.isConnected = false;
        this.setStatus('offline');
      });
    }
  }

  private cleanupSocket(sock: WebSocket | null): void {
    if (!sock) return;
    try {
      sock.onopen = null;
      sock.onmessage = null;
      sock.onclose = null;
      sock.onerror = null;
      if (sock.readyState === WebSocket.OPEN || sock.readyState === WebSocket.CONNECTING) {
        sock.close();
      }
    } catch { }
  }

  public connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Clean up any stale socket reference before opening a new one
    if (this.socket) {
      this.cleanupSocket(this.socket);
      this.socket = null;
    }

    this.isExplicitlyClosed = false;
    this.connectionAttemptId++;
    const currentAttemptId = this.connectionAttemptId;
    this.setStatus(this.attemptCount > 0 ? 'reconnecting' : 'connecting');
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:5173';
    const wsUrl = resolveWebSocketUrl(
      import.meta.env.VITE_WEBSOCKET_URL || import.meta.env.VITE_API_URL,
      import.meta.env.PROD,
      protocol,
      host,
      this.sessionId
    );

    try {
      const socket = new WebSocket(wsUrl);
      this.socket = socket;

      if (this.connectTimeoutTimer) {
        clearTimeout(this.connectTimeoutTimer);
      }
      // Guard against hung TCP/TLS handshakes (12s timeout)
      this.connectTimeoutTimer = setTimeout(() => {
        this.connectTimeoutTimer = null;
        if (this.socket === socket && socket.readyState === WebSocket.CONNECTING) {
          console.info('[socket]', {
            event: 'connect.timeout',
            attemptId: currentAttemptId,
            attemptCount: this.attemptCount,
          });
          this.cleanupSocket(socket);
          this.socket = null;
          this.isConnected = false;
          if (!this.isExplicitlyClosed) {
            this.scheduleReconnect();
          }
        }
      }, 12000);

      socket.onopen = () => {
        if (this.socket !== socket) return;
        if (this.connectTimeoutTimer) {
          clearTimeout(this.connectTimeoutTimer);
          this.connectTimeoutTimer = null;
        }
        this.isConnected = true;
        this.attemptCount = 0;
        this.retrySecondsLeft = 0;
        this.clearTimers();
        this.startHeartbeat();
        this.setStatus('connected');
        console.info('[socket]', {
          event: 'connected',
          attemptId: currentAttemptId,
          sessionId: this.sessionId ? this.sessionId.slice(0, 10) : null,
        });

        // Flush any buffered signaling messages on reconnect, strictly validating room ID
        if (this.pendingOutboundQueue.length > 0) {
          const queued = this.pendingOutboundQueue.splice(0);
          for (const item of queued) {
            const msgRoomId = (item.msg as any).roomId;
            // Validate that the signal belongs to the currently active room
            if (this.currentActiveRoomId && msgRoomId && msgRoomId !== this.currentActiveRoomId) {
              console.warn('[socket] Dropping stale buffered signaling message for departed room:', msgRoomId);
              continue;
            }
            try {
              socket.send(JSON.stringify(item.msg));
            } catch (err) {
              console.warn('[socket] Failed to flush queued signaling message:', err);
            }
          }
        }
      };

      socket.onmessage = (event) => {
        if (this.socket !== socket) return;
        try {
          const data: ServerMessage = JSON.parse(event.data);
          if (data.type === 'SESSION_REGISTERED') {
            this.sessionId = data.sessionId;
            console.info('[socket]', {
              event: 'session.registered',
              attemptId: currentAttemptId,
              sessionId: data.sessionId.slice(0, 10),
            });
          }
          if (data.type === 'PONG') {
            return;
          }
          this.notify(data);
        } catch {
          // Ignore malformed payloads
        }
      };

      socket.onclose = (ev) => {
        if (this.socket !== socket) return;
        if (this.connectTimeoutTimer) {
          clearTimeout(this.connectTimeoutTimer);
          this.connectTimeoutTimer = null;
        }
        this.socket = null;
        this.isConnected = false;
        this.stopHeartbeat();
        console.info('[socket]', {
          event: 'closed',
          attemptId: currentAttemptId,
          code: ev?.code || 0,
          explicit: this.isExplicitlyClosed,
        });
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        } else {
          this.setStatus('disconnected');
        }
      };

      socket.onerror = () => {
        if (this.socket !== socket) return;
        this.isConnected = false;
      };
    } catch {
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    // Send application-level PING every 20 seconds to keep proxies, load balancers, and NATs open indefinitely
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
        } catch { }
      }
    }, 20000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearTimers(): void {
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.stopHeartbeat();
  }

  private scheduleReconnect(): void {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setStatus('offline');
      return;
    }

    this.clearTimers();
    this.attemptCount++;

    // Do not endlessly reconnect when backend is permanently unavailable
    if (this.attemptCount > this.MAX_RECONNECT_ATTEMPTS) {
      console.warn('[socket]', {
        event: 'reconnect.exhausted',
        attempts: this.attemptCount - 1,
      });
      this.retrySecondsLeft = -1;
      this.setStatus('disconnected', -1);
      return;
    }

    // Exponential backoff strategy: 1s, 2s, 4s, 8s, 15s, max 30s + random jitter
    const BACKOFF_SCHEDULE = [1000, 2000, 4000, 8000, 15000];
    const baseDelay = this.attemptCount <= BACKOFF_SCHEDULE.length
      ? BACKOFF_SCHEDULE[this.attemptCount - 1]
      : 30000;
    const jitter = Math.floor(Math.random() * 500) - 250; // +/- 250ms
    const delayMs = Math.max(800, Math.min(30000, baseDelay + jitter));
    this.retrySecondsLeft = Math.ceil(delayMs / 1000);
    this.setStatus('reconnecting', this.retrySecondsLeft);

    this.countdownTimer = setInterval(() => {
      this.retrySecondsLeft = Math.max(0, this.retrySecondsLeft - 1);
      this.setStatus('reconnecting', this.retrySecondsLeft);
      if (this.retrySecondsLeft <= 0 && this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
    }, 1000);

    this.reconnectTimer = setTimeout(() => {
      this.clearTimers();
      this.connect();
    }, delayMs);
  }

  public reconnectNow(): void {
    this.clearTimers();
    const previousSocket = this.socket;
    this.socket = null;
    this.isConnected = false;
    this.attemptCount = 0;
    this.cleanupSocket(previousSocket);
    this.connect();
  }

  private setStatus(status: ConnectionStatus, retrySeconds?: number): void {
    this.status = status;
    for (const listener of this.statusListeners) {
      try {
        listener(status, retrySeconds);
      } catch (err) {
        console.error('Status listener error:', err);
      }
    }
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    // Send immediate initial status
    listener(this.status, this.retrySecondsLeft);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public onStatusChange(listener: StatusListener): () => void {
    return this.subscribeStatus(listener);
  }

  public subscribe(listener: SocketListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(msg: ServerMessage): void {
    for (const listener of this.listeners) {
      try {
        listener(msg);
      } catch (err) {
        console.error('Listener notification error:', err);
      }
    }
  }

  public setActiveRoomId(roomId: string | null): void {
    this.currentActiveRoomId = roomId;
    if (!roomId) {
      this.clearSignalingQueue();
    } else {
      // Discard any queued messages that belonged to a previous room
      this.pendingOutboundQueue = this.pendingOutboundQueue.filter((item) => {
        const msgRoomId = (item.msg as any).roomId;
        return !msgRoomId || msgRoomId === roomId;
      });
    }
  }

  public clearSignalingQueue(roomId?: string): void {
    if (roomId) {
      this.pendingOutboundQueue = this.pendingOutboundQueue.filter((item) => {
        return (item.msg as any).roomId !== roomId;
      });
    } else {
      this.pendingOutboundQueue = [];
    }
  }

  public send(msg: ClientMessage): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(msg));
        return true;
      } catch {
        // Fall through to queueing if message is signaling
      }
    }

    // Safely buffer critical WebRTC signaling messages during temporary network/socket reconnection
    if (msg.type === 'WEBRTC_SIGNAL') {
      const now = Date.now();
      const msgRoomId = (msg as any).roomId;

      // Drop immediately if signal belongs to an old room that is no longer active
      if (this.currentActiveRoomId && msgRoomId && msgRoomId !== this.currentActiveRoomId) {
        return false;
      }

      // Keep only fresh signals within 15 seconds matching current active room
      this.pendingOutboundQueue = this.pendingOutboundQueue.filter((item) => {
        const isFresh = now - item.timestamp < 15_000;
        const matchesRoom = !this.currentActiveRoomId || !(item.msg as any).roomId || (item.msg as any).roomId === this.currentActiveRoomId;
        return isFresh && matchesRoom;
      });

      if (this.pendingOutboundQueue.length < 50) {
        this.pendingOutboundQueue.push({ msg, timestamp: now });
      }
      if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
        this.connect();
      }
      return true;
    }

    return false;
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.clearTimers();
    this.pendingOutboundQueue = [];
    this.currentActiveRoomId = null;
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.close();
    }
    this.isConnected = false;
    this.setStatus('disconnected');
  }
}

export const ologleSocket = new OlogleClientSocket();
export const haylooSocket = ologleSocket;
