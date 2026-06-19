import { WS_BASE } from "./api";

export type SyncMessage =
  | { type: "SYNC"; profile: Record<string, unknown>; activities: unknown[] }
  | { type: "PROFILE_UPDATE"; profile: Record<string, unknown> }
  | { type: "PING" };

type Listener = (msg: SyncMessage) => void;

let ws: WebSocket | null = null;
const listeners = new Set<Listener>();

export function connectSync(token: string) {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  ws = new WebSocket(`${WS_BASE}/ws/sync?token=${encodeURIComponent(token)}`);

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data) as SyncMessage;
    if (msg.type === "PING") return;
    listeners.forEach((listener) => listener(msg));
  };

  ws.onclose = () => {
    ws = null;
  };
}

export function disconnectSync() {
  ws?.close();
  ws = null;
}

export function subscribeSync(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
