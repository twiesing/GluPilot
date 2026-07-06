// Minimaler Client für die (inoffizielle) Dexcom-Share-API.
// Nachgebaut nach pydexcom / Home Assistant dexcom-Komponente.
// Zugangsdaten kommen aus .env, werden nie geloggt.

const REGION = (process.env.DEXCOM_REGION ?? "ous").toLowerCase();
const USERNAME = process.env.DEXCOM_USERNAME ?? "";
const PASSWORD = process.env.DEXCOM_PASSWORD ?? "";

const BASE_URLS: Record<string, string> = {
  us: "https://share2.dexcom.com",
  ous: "https://shareous1.dexcom.com",
  jp: "https://share.dexcom.jp",
};
const APPLICATION_ID = "d89443d2-327c-4a6f-89e5-496bbb0317db";
const BASE = BASE_URLS[REGION] ?? BASE_URLS.ous;

const HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent": "Dexcom Share/3.0.2.11 CFNetwork/711.2.23 Darwin/14.0.0",
};

// Trend-Index (0..9) -> Pfeil + deutsche Bezeichnung.
const TRENDS: { arrow: string; label: string }[] = [
  { arrow: "", label: "unbekannt" },
  { arrow: "↑↑", label: "schnell steigend" },
  { arrow: "↑", label: "steigend" },
  { arrow: "↗", label: "leicht steigend" },
  { arrow: "→", label: "stabil" },
  { arrow: "↘", label: "leicht fallend" },
  { arrow: "↓", label: "fallend" },
  { arrow: "↓↓", label: "schnell fallend" },
  { arrow: "?", label: "nicht berechenbar" },
  { arrow: "–", label: "außerhalb des Messbereichs" },
];
// Ältere API liefert Trend als Text.
const TREND_NAMES = [
  "None",
  "DoubleUp",
  "SingleUp",
  "FortyFiveUp",
  "Flat",
  "FortyFiveDown",
  "SingleDown",
  "DoubleDown",
  "NotComputable",
  "RateOutOfRange",
];

export interface GlucoseReading {
  mgdl: number;
  mmol: number;
  trend_arrow: string;
  trend_label: string;
  minutes_ago: number;
}

export function dexcomConfigured(): boolean {
  return USERNAME.length > 0 && PASSWORD.length > 0;
}

let sessionId: string | null = null;

// Kurzer Cache, damit nicht jeder Client-Poll live gegen Dexcom geht.
const CACHE_MS = Number(process.env.GLUCOSE_CACHE_SECONDS ?? 60) * 1000;
let glucoseCache: { reading: GlucoseReading; at: number } | null = null;

async function postJson(path: string, body: unknown): Promise<string> {
  const res = await fetch(`${BASE}/ShareWebServices/Services/${path}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Dexcom ${path} -> HTTP ${res.status}`);
  }
  // Antworten sind JSON-Strings (in Anführungszeichen).
  return (await res.text()).replace(/^"|"$/g, "");
}

async function login(): Promise<string> {
  const accountId = await postJson("General/AuthenticatePublisherAccount", {
    accountName: USERNAME,
    password: PASSWORD,
    applicationId: APPLICATION_ID,
  });
  const session = await postJson("General/LoginPublisherAccountById", {
    accountId,
    password: PASSWORD,
    applicationId: APPLICATION_ID,
  });
  return session;
}

function parseTrend(trend: unknown): { arrow: string; label: string } {
  let idx = 0;
  if (typeof trend === "number") {
    idx = trend;
  } else if (typeof trend === "string") {
    const byName = TREND_NAMES.indexOf(trend);
    idx = byName >= 0 ? byName : 0;
  }
  return TRENDS[idx] ?? TRENDS[0];
}

function parseTimestamp(wt: unknown): number {
  // Format "Date(1587657970000)" bzw. "/Date(1587657970000-0000)/".
  if (typeof wt !== "string") return Date.now();
  const m = wt.match(/Date\((\d+)/);
  return m ? Number(m[1]) : Date.now();
}

/**
 * Aktuellen Glukosewert holen. Gibt null zurück, wenn nicht konfiguriert
 * oder die API nicht erreichbar ist (best effort, blockiert die Analyse nie).
 */
export async function getLatestGlucose(): Promise<GlucoseReading | null> {
  if (!dexcomConfigured()) return null;

  // Frischer Cache-Treffer: minutes_ago um die Cache-Alterung korrigieren.
  if (glucoseCache && Date.now() - glucoseCache.at < CACHE_MS) {
    const agedMin = Math.round((Date.now() - glucoseCache.at) / 60000);
    return {
      ...glucoseCache.reading,
      minutes_ago: glucoseCache.reading.minutes_ago + agedMin,
    };
  }

  const fetchLatest = async (): Promise<string> => {
    if (!sessionId) sessionId = await login();
    const url =
      `${BASE}/ShareWebServices/Services/Publisher/ReadPublisherLatestGlucoseValues` +
      `?sessionId=${sessionId}&minutes=1440&maxCount=1`;
    const res = await fetch(url, { method: "POST", headers: HEADERS });
    if (!res.ok) throw new Error(`Dexcom glucose -> HTTP ${res.status}`);
    return res.text();
  };

  try {
    let text: string;
    try {
      text = await fetchLatest();
    } catch {
      // Session evtl. abgelaufen -> einmal neu einloggen.
      sessionId = null;
      text = await fetchLatest();
    }

    const rows: unknown = JSON.parse(text);
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const row = rows[0] as { Value?: number; Trend?: unknown; WT?: unknown };
    if (typeof row.Value !== "number") return null;

    const trend = parseTrend(row.Trend);
    const ts = parseTimestamp(row.WT);
    const reading: GlucoseReading = {
      mgdl: row.Value,
      mmol: Math.round((row.Value / 18.0182) * 10) / 10,
      trend_arrow: trend.arrow,
      trend_label: trend.label,
      minutes_ago: Math.max(0, Math.round((Date.now() - ts) / 60000)),
    };
    glucoseCache = { reading, at: Date.now() };
    return reading;
  } catch {
    return null;
  }
}
