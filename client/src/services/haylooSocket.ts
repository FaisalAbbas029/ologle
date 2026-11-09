import { ServerMessage, ClientMessage } from '../types/index.ts';

export type SocketListener = (msg: ServerMessage) => void;
export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
export type StatusListener = (status: ConnectionStatus, retrySecondsLeft?: number) => void;

class HaylooClientSocket {
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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.attemptCount = 0;
        this.retrySecondsLeft = 0;
        this.clearTimers();
        this.setStatus('connected');
      };

      this.socket.onmessage = (event) => {
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

      this.socket.onclose = () => {
        this.isConnected = false;
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        } else {
          this.setStatus('disconnected');
        }
      };

      this.socket.onerror = () => {
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
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.setStatus('disconnected');
  }
}

export const haylooSocket = new HaylooClientSocket();

