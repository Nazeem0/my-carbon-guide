import type { User } from "firebase/auth";

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
export const WS_BASE = API_BASE.replace(/^http/, "ws");

async function authHeaders(user: User): Promise<HeadersInit> {
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail: string;
    try {
      const body = await res.json();
      detail = body.detail ?? res.statusText;
    } catch {
      detail = await res.text().catch(() => res.statusText);
    }
    throw new ApiError(detail || res.statusText, res.status);
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T>(user: User, path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: await authHeaders(user),
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(user: User, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: await authHeaders(user),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(user: User, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: await authHeaders(user),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}
