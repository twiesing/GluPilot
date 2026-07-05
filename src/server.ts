import "./env.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { estimateCarbs } from "./vision.js";
import { calculateDosing, splitBolus } from "./dosing.js";
import { getLatestGlucose, dexcomConfigured } from "./dexcom.js";

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

// Optionaler Zugriffsschutz per Bearer-Token – schützt nur die Analyse-API,
// die Web-App-Assets (HTML, Icons, Manifest, SW) bleiben öffentlich.
app.addHook("onRequest", async (request, reply) => {
  if (!API_TOKEN) return;
  if (!request.url.startsWith("/analyze")) return;
  const header = request.headers.authorization ?? "";
  if (header !== `Bearer ${API_TOKEN}`) {
    reply.code(401).send({ error: "Unauthorized" });
  }
});

// Web-App und statische Assets aus public/ ausliefern (inkl. index.html).
app.register(fastifyStatic, { root: PUBLIC_DIR });

app.get("/health", async () => ({ status: "ok" }));

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
      hint: hint ?? "",
      image_count: images.length,
      disclaimer: DISCLAIMER,
    };
  } catch (err) {
    request.log.error(err);
    reply.code(502).send({ error: "Analyse fehlgeschlagen." });
  }
});

app
  .listen({ port: PORT, host: HOST })
  .then((address) =>
    app.log.info(
      `Sidecar läuft auf ${address} (Dexcom: ${dexcomConfigured() ? "aktiv" : "aus"})`,
    ),
  )
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
