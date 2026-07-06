// API-Client für das Fastify-Backend (/analyze, /history) inkl. Token-Handling.

const TOKEN_KEY = "glupilot_token";

export interface FoodItem {
  name: string;
  carbs_g: number;
}

export interface Glucose {
  mgdl: number;
  mmol: number;
  trend_arrow: string;
  trend_label: string;
  minutes_ago: number;
}

export interface SplitBolus {
  now_units: number;
  later_units: number;
  delay_hours: number;
}

export interface AnalyzeResult {
  carbs_g: number;
  be: number;
  factor_iu_per_be: number;
  meal_units: number;
  correction_units: number | null;
  target_mgdl: number;
  isf_mgdl: number;
  insulin_units: number;
  insulin_units_exact: number;
  confidence: string;
  items: FoodItem[];
  assumptions: string;
  note: string;
  split_recommended: boolean;
  split_reason: string;
  split: SplitBolus | null;
  glucose: Glucose | null;
  dexcom_configured: boolean;
  reminders_enabled: boolean;
  hint: string;
  image_count: number;
  disclaimer: string;
}

export interface HistoryEntry {
  ts: string;
  insulin_units: number;
  insulin_units_exact: number;
  carbs_g: number;
  be: number;
  meal_units: number;
  correction_units: number | null;
  confidence: string;
  hint: string;
  items: FoodItem[];
  glucose_mgdl: number | null;
  image_count: number;
}

/** Fehler mit HTTP-Status, damit die UI 401 (Token nötig) erkennen kann. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setToken(value: string): void {
  if (value) localStorage.setItem(TOKEN_KEY, value);
  else localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: "Bearer " + t } : {};
}

/**
 * Token-Bootstrap: einmalig via #token=... übergeben, dann in localStorage.
 * Das URL-Fragment wird nie an den Server gesendet (kein Log-Leak).
 */
export function bootstrapToken(): void {
  const m = location.hash.match(/token=([^&]+)/);
  if (m) {
    setToken(decodeURIComponent(m[1]));
    history.replaceState(null, "", location.pathname);
  }
}

export async function analyze(
  images: string[],
  hint: string,
): Promise<AnalyzeResult> {
  const res = await fetch("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ images, hint }),
  });
  if (!res.ok) throw new ApiError(res.status, "HTTP " + res.status);
  return res.json();
}

export interface DosingConfig {
  grams_per_be: number;
  factor_iu_per_be: number;
  target_mgdl: number;
  isf_mgdl: number;
  correction_threshold_mgdl: number;
}

export async function getConfig(): Promise<DosingConfig> {
  const res = await fetch("/config", { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, "HTTP " + res.status);
  return res.json();
}

export interface GlucoseResponse {
  glucose: Glucose | null;
  dexcom_configured: boolean;
}

export async function getGlucose(): Promise<GlucoseResponse> {
  const res = await fetch("/glucose", { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, "HTTP " + res.status);
  return res.json();
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const res = await fetch("/history", { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, "HTTP " + res.status);
  const data = await res.json();
  return data.entries ?? [];
}

export interface Reminder {
  id: string;
  due: number;
  title: string;
  body: string;
}

export async function scheduleReminder(
  minutes: number,
  title: string,
  body: string,
): Promise<{ id: string; due: number }> {
  const res = await fetch("/reminders", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ minutes, title, body }),
  });
  if (!res.ok) throw new ApiError(res.status, "HTTP " + res.status);
  return res.json();
}

export async function getReminders(): Promise<Reminder[]> {
  const res = await fetch("/reminders", { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, "HTTP " + res.status);
  const data = await res.json();
  return data.reminders ?? [];
}

export async function cancelReminder(id: string): Promise<void> {
  const res = await fetch(`/reminders/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 404) {
    throw new ApiError(res.status, "HTTP " + res.status);
  }
}

export async function clearHistory(): Promise<void> {
  const res = await fetch("/history", {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new ApiError(res.status, "HTTP " + res.status);
}
