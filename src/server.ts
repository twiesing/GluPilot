import "./env.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { estimateCarbs } from "./vision.js";
import {
  calculateDosing,
  splitBolus,
  GRAMS_PER_BE,
  FACTOR_IU_PER_BE,
  TARGET_MGDL,
  CORRECTION_ISF_MGDL,
  CORRECTION_THRESHOLD_MGDL,
} from "./dosing.js";
import { getLatestGlucose, dexcomConfigured } from "./dexcom.js";
import { appendHistory, readHistory, clearHistory } from "./history.js";
import {
  pushConfigured,
  addReminder,
  listReminders,
  removeReminder,
  startReminderScheduler,
} from "./push.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(HERE, "..", "public");

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";
const API_TOKEN = process.env.API_TOKEN ?? "";

const DISCLAIMER =
  "Automatische Schätzung – keine medizinische Beratung. Kohlenhydrate und " +
  "Insulinvorschlag vor jeder Injektion selbst prüfen.";

const app = Fastify({
  logger: true,
  // Fotos können groß sein: Limit auf 25 MB anheben.
  bodyLimit: 25 * 1024 * 1024,
});

// Rohes Bild als Body akzeptieren (robustester Shortcuts-Weg: Foto direkt senden).
app.addContentTypeParser(
  /^image\//,
  { parseAs: "buffer" },
  (_req, body, done) => done(null, body),
);
app.addContentTypeParser(
  "application/octet-stream",
  { parseAs: "buffer" },
  (_req, body, done) => done(null, body),
);

// Optionaler Zugriffsschutz per Bearer-Token – schützt Analyse, Historie,
// Glukose, Erinnerungen und Faktoren; nur /health und die Web-App-Assets
// (HTML, Icons, Manifest, SW) bleiben öffentlich.
app.addHook("onRequest", async (request, reply) => {
  if (!API_TOKEN) return;
  if (
    !request.url.startsWith("/analyze") &&
    !request.url.startsWith("/history") &&
    !request.url.startsWith("/glucose") &&
    !request.url.startsWith("/reminders") &&
    !request.url.startsWith("/config")
  )
    return;
  const header = request.headers.authorization ?? "";
  if (header !== `Bearer ${API_TOKEN}`) {
    reply.code(401).send({ error: "Unauthorized" });
  }
});

// Web-App und statische Assets aus public/ ausliefern (inkl. index.html).
app.register(fastifyStatic, { root: PUBLIC_DIR });

app.get("/health", async () => ({ status: "ok" }));

// Dosier-Faktoren (read-only) für die Anzeige in den Einstellungen.
app.get("/config", async () => ({
  grams_per_be: GRAMS_PER_BE,
  factor_iu_per_be: FACTOR_IU_PER_BE,
  target_mgdl: TARGET_MGDL,
  isf_mgdl: CORRECTION_ISF_MGDL,
  correction_threshold_mgdl: CORRECTION_THRESHOLD_MGDL,
}));

interface AnalyzeBody {
  images?: unknown;
  image?: unknown;
  hint?: unknown;
}

/** Erster nicht-leerer String aus den Kandidaten, getrimmt. */
function firstHint(...candidates: unknown[]): string | undefined {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c.trim();
  }
  return undefined;
}


app.post<{ Querystring: { hint?: string } }>("/analyze", async (request, reply) => {
  const rawBody = request.body;
  let images: string[] = [];
  let jsonHint: unknown;

  if (Buffer.isBuffer(rawBody)) {
    // Rohes Foto als Datei-Body (einfachster Shortcuts-Weg).
    images = [rawBody.toString("base64")];
  } else {
    // JSON: { images: [base64, ...] } oder { image: base64 }, optional hint.
    const body = (rawBody ?? {}) as AnalyzeBody;
    jsonHint = body.hint;
    const raw = body.images ?? (body.image != null ? [body.image] : []);
    const list = Array.isArray(raw) ? raw : [];
    images = list.filter((i): i is string => typeof i === "string" && i.length > 0);
  }

  // Optionaler Hinweis des Nutzers: JSON-Feld, Query ?hint= oder Header X-Hint.
  // HTTP-Header liefert Bytes als latin1 -> für Umlaute nach UTF-8 dekodieren.
  const headerHint = request.headers["x-hint"];
  const decodedHeaderHint =
    typeof headerHint === "string"
      ? Buffer.from(headerHint, "latin1").toString("utf8")
      : undefined;
  const hint = firstHint(jsonHint, request.query.hint, decodedHeaderHint);

  request.log.info(
    {
      contentType: request.headers["content-type"],
      imageCount: images.length,
      hasHint: hint !== undefined,
    },
    "analyze request",
  );

  if (images.length === 0) {
    reply.code(400).send({
      error:
        "Kein Bild erhalten. Sende das Foto als Datei-Body (Content-Type image/*) " +
        "oder als JSON { image: <base64> } bzw. { images: [<base64>, ...] }.",
    });
    return;
  }

  try {
    // Analyse und Glukoseabruf parallel – Dexcom blockiert die Analyse nie.
    const [estimate, glucose] = await Promise.all([
      estimateCarbs(images, hint),
      getLatestGlucose(),
    ]);
    const dosing = calculateDosing(estimate.carbs_g, glucose?.mgdl);

    const split = estimate.split_recommended
      ? splitBolus(dosing.meal_units, dosing.correction_units ?? 0)
      : null;

    // Ergebnis persistieren (best effort – Schreibfehler blockieren die Antwort nie).
    appendHistory({
      ts: new Date().toISOString(),
      insulin_units: dosing.insulin_units,
      insulin_units_exact: dosing.insulin_units_exact,
      carbs_g: dosing.carbs_g,
      be: dosing.be,
      meal_units: dosing.meal_units,
      correction_units: dosing.correction_units,
      confidence: estimate.confidence,
      hint: hint ?? "",
      items: estimate.items,
      glucose_mgdl: glucose?.mgdl ?? null,
      image_count: images.length,
    }).catch((e) => request.log.error(e, "history append failed"));

    return {
      ...dosing,
      confidence: estimate.confidence,
      items: estimate.items,
      assumptions: estimate.assumptions,
      note: estimate.note,
      split_recommended: estimate.split_recommended,
      split_reason: estimate.split_reason,
      split,
      glucose,
      dexcom_configured: dexcomConfigured(),
      reminders_enabled: pushConfigured(),
      hint: hint ?? "",
      image_count: images.length,
      disclaimer: DISCLAIMER,
    };
  } catch (err) {
    request.log.error(err);
    reply.code(502).send({ error: "Analyse fehlgeschlagen." });
  }
});

// Aktueller Glukosewert (Dexcom) – für die permanente Anzeige in der App.
app.get("/glucose", async () => ({
  glucose: await getLatestGlucose(),
  dexcom_configured: dexcomConfigured(),
}));

// Verlauf früherer Berechnungen (neueste zuerst).
app.get("/history", async () => ({ entries: await readHistory() }));

// Verlauf löschen.
app.delete("/history", async () => {
  await clearHistory();
  return { status: "cleared" };
});

interface ReminderBody {
  minutes?: unknown;
  title?: unknown;
  body?: unknown;
}

// Erinnerung planen (Versand via Pushover, wenn konfiguriert).
app.post<{ Body: ReminderBody }>("/reminders", async (request, reply) => {
  if (!pushConfigured()) {
    reply.code(503).send({ error: "Erinnerungen nicht konfiguriert." });
    return;
  }
  const b = request.body ?? {};
  const minutes = Number(b.minutes);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) {
    reply.code(400).send({ error: "minutes muss zwischen 1 und 1440 liegen." });
    return;
  }
  const title = typeof b.title === "string" && b.title.trim() ? b.title.trim() : "GluPilot";
  const body =
    typeof b.body === "string" && b.body.trim() ? b.body.trim() : "Erinnerung";
  const { id, due } = await addReminder(minutes, title, body);
  return { id, due };
});

// Aktive Erinnerungen auflisten.
app.get("/reminders", async () => ({ reminders: await listReminders() }));

// Erinnerung abbrechen.
app.delete<{ Params: { id: string } }>("/reminders/:id", async (request, reply) => {
  const ok = await removeReminder(request.params.id);
  if (!ok) {
    reply.code(404).send({ error: "Erinnerung nicht gefunden." });
    return;
  }
  return { status: "cancelled" };
});

app
  .listen({ port: PORT, host: HOST })
  .then((address) => {
    startReminderScheduler((msg, err) => app.log.error({ err }, msg));
    app.log.info(
      `GluPilot läuft auf ${address} (Dexcom: ${dexcomConfigured() ? "aktiv" : "aus"}, ` +
        `Erinnerungen: ${pushConfigured() ? "aktiv" : "aus"})`,
    );
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
