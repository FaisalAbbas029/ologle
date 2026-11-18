import { ServerMessage, ClientMessage } from '../types/index.ts';

export type SocketListener = (msg: ServerMessage) => void;
export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
export type StatusListener = (status: ConnectionStatus, retrySecondsLeft?: number) => void;

// Default fallback host if VITE_WEBSOCKET_URL is not set in Vercel environment variables.
// Note: In production on Vercel, set VITE_WEBSOCKET_URL=wss://YOUR-ACTUAL-BACKEND-DOMAIN/ws
// in your Vercel Project Settings -> Environment Variables.
const DEFAULT_SIGNALING_HOST = 'ologle-signaling.onrender.com';

export function resolveWebSocketUrl(
  configuredUrl: string | undefined,
  isProduction: boolean,
  protocol: string,
  host: string
): string {
  const configured = configuredUrl?.trim();
  // When VITE_WEBSOCKET_URL is set in Vercel environment variables, use it.
  if (configured) {
    try {
      const url = new URL(configured);
      // Accept http(s):// values (e.g. a pasted Vercel backend URL) and normalize to ws(s)://,
      // since older browsers reject non-ws schemes in the WebSocket constructor.
      if (url.protocol === 'https:') url.protocol = 'wss:';
      else if (url.protocol === 'http:') url.protocol = 'ws:';
      // Ensure the WebSocket path is /ws if not explicitly defined
      if (!url.pathname || url.pathname === '/') {
        url.pathname = '/ws';
      }
      return url.toString();
    } catch {
      return configured;
    }
  }

  const websocketProtocol = protocol === 'https:' ? 'wss:' : 'ws:';

  // Dev / Vite preview / local testing: connect to same host where dev server runs /ws
  if (!isProduction || host.includes('localhost') || host.includes('127.0.0.1')) {
    return `${websocketProtocol}//${host}/ws`;
  }

  // If the frontend is hosted directly on the Node backend (e.g. on Render or custom server)
  if (host.endsWith('.onrender.com')) {
    return `${websocketProtocol}//${host}/ws`;
  }

  // When deployed on Vercel without VITE_WEBSOCKET_URL set at build time:
  if (isProduction && (host.endsWith('.vercel.app') || host.includes('vercel'))) {
    console.warn(
      '[OLOGLE] VITE_WEBSOCKET_URL is not defined in your Vercel Project Settings.\n' +
      'Please add VITE_WEBSOCKET_URL=wss://YOUR-ACTUAL-BACKEND-DOMAIN/ws in Vercel -> Settings -> Environment Variables.'
    );
  }

  return `wss://${DEFAULT_SIGNALING_HOST}/ws`;
}

class OlogleClientSocket {
  private socket: WebSocket | null = null;
  private listeners: Set<SocketListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private reconnectTimer: any = null;
  private countdownTimer: any = null;
  private isExplicitlyClosed = false;
  private attemptCount = 0;
  private retrySecondsLeft = 0;
  public status: ConnectionStatus = 'disconnected';
  public sessionId: string | null = null;
  public isConnected = false;

  public connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    this.setStatus(this.attemptCount > 0 ? 'reconnecting' : 'connecting');
    const wsUrl = resolveWebSocketUrl(
      import.meta.env.VITE_WEBSOCKET_URL,
      import.meta.env.PROD,
      window.location.protocol,
      window.location.host
    );

    try {
      const socket = new WebSocket(wsUrl);
      this.socket = socket;

      socket.onopen = () => {
        if (this.socket !== socket) return;
        this.isConnected = true;
        this.attemptCount = 0;
        this.retrySecondsLeft = 0;
        this.clearTimers();
        this.setStatus('connected');
      };

      socket.onmessage = (event) => {
        if (this.socket !== socket) return;
        try {
          const data: ServerMessage = JSON.parse(event.data);
          if (data.type === 'SESSION_REGISTERED') {
            this.sessionId = data.sessionId;
          }
          this.notify(data);
        } catch {
          // Ignore malformed payloads
        }
      };

      socket.onclose = () => {
        if (this.socket !== socket) return;
        this.socket = null;
        this.isConnected = false;
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

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.clearTimers();
    this.attemptCount++;
    // Exponential backoff: 1.5s, 3s, 6s, max 10s + random jitter
    const delayMs = Math.min(10000, Math.pow(1.8, this.attemptCount) * 1000 + Math.random() * 500);
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
    if (previousSocket && previousSocket.readyState !== WebSocket.CLOSED) {
      previousSocket.close();
    }
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

  public send(msg: ClientMessage): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.clearTimers();
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
