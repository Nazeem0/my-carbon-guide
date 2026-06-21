import { WS_BASE } from "./api";

export type SyncMessage =
  | { type: "SYNC"; profile: Record<string, unknown>; activities: unknown[] }
  | { type: "PROFILE_UPDATE"; profile: Record<string, unknown> }
  | { type: "PING" };

type Listener = (msg: SyncMessage) => void;
type TokenGetter = () => Promise<string>;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let getToken: TokenGetter | null = null;
const MAX_RECONNECT_DELAY = 30000;
const listeners = new Set<Listener>();

async function scheduleReconnect() {
  if (reconnectTimer || !getToken) return;
  const delay = Math.min(1000 * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY);
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    reconnectAttempts++;
    await connectSync(getToken!);
  }, delay);
}

export async function connectSync(tokenGetter: TokenGetter) {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  getToken = tokenGetter;

  let token: string;
  try {
    token = await tokenGetter();
  } catch {
    // Token fetch failed (e.g. user signed out, network error) — retry with backoff
    scheduleReconnect();
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
      scheduleReconnect();
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
  getToken = null;
  ws?.close();
  ws = null;
}

export function subscribeSync(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
