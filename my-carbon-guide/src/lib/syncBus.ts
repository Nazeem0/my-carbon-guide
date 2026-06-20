import { WS_BASE } from "./api";

export type SyncMessage =
  | { type: "SYNC"; profile: Record<string, unknown>; activities: unknown[] }
  | { type: "PROFILE_UPDATE"; profile: Record<string, unknown> }
  | { type: "PING" };

type Listener = (msg: SyncMessage) => void;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000;
const listeners = new Set<Listener>();

function scheduleReconnect(token: string) {
  if (reconnectTimer) return;
  const delay = Math.min(1000 * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectAttempts++;
    connectSync(token);
  }, delay);
}

export function connectSync(token: string) {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  ws = new WebSocket(`${WS_BASE}/ws/sync?token=${encodeURIComponent(token)}`);

  ws.onopen = () => {
    reconnectAttempts = 0;
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data) as SyncMessage;
    if (msg.type === "PING") return;
    listeners.forEach((listener) => listener(msg));
  };

  ws.onclose = () => {
    ws = null;
    if (reconnectAttempts < 10) {
      scheduleReconnect(token);
    }
  };

  ws.onerror = () => {
    ws?.close();
  };
}

export function disconnectSync() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;
  ws?.close();
  ws = null;
}

export function subscribeSync(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
