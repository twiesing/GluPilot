# GluPilot

Mahlzeit fotografieren → OpenAI-Vision schätzt die Kohlenhydrate → die App rechnet BE
und Insulinmenge (Faktor **0,5 IE/BE**, **12 g/BE**), optional mit Blutzucker-Korrektur
(Dexcom) und Split-Bolus. Als installierbare **PWA** (React + Astryx) mit einer schlanken
HTTP-**API** dahinter (auch für Apple Shortcuts nutzbar).

> ⚠️ **Kein Medizinprodukt, keine ärztliche Beratung.** Die Kohlenhydrat-Schätzung
> ist ungenau. Menge und Dosis **vor jeder Injektion selbst prüfen**. Nutzung auf
> eigene Verantwortung.

## Features

- **Foto → Dosis**: ein oder mehrere Fotos einer Mahlzeit, Ergebnis mit IE, KH, BE,
  Bestandteilen und Annahmen.
- **Dauer-Blutzucker**: aktueller Dexcom-Wert immer sichtbar (farbcodiert, mit Trend),
  serverseitig gecacht.
- **Verlauf/Journal**: jede Berechnung wird serverseitig gespeichert (was gegessen wurde
  + Dosis), mit Tages-Zusammenfassung.
- **Korrektur & Split-Bolus** aus dem aktuellen BZ.
- **Erinnerungen** via Pushover (z. B. „2. Bolus-Teil in 2 h").
- **Dark Mode** (folgt dem System) und **PWA**-Installation (Homescreen, offline-Shell).

## Architektur

Monorepo (pnpm-Workspace), **ein** Container:

- `src/` – Backend (Fastify, TypeScript). Liefert die API **und** die gebauten
  Frontend-Assets aus `public/`.
- `web/` – Frontend (React 19 + Vite + [Astryx](https://astryx.atmeta.com) Neutral-Theme,
  Figtree selbst gehostet). `vite build` schreibt nach `../public` (Build-Artefakt,
  gitignored).

## Entwicklung

```bash
pnpm install
cp .env.example .env        # OPENAI_API_KEY eintragen; optional API_TOKEN, DEXCOM_*, PUSHOVER_*

# Variante A: zwei Prozesse mit Hot-Reload
pnpm dev                    # Backend auf :8787
pnpm dev:web                # Vite-Dev-Server (proxyt /analyze,/history,/glucose,/config,/reminders ans Backend)

# Variante B: einmal bauen und produktiv fahren
pnpm build                  # tsc (Backend) + vite build (Frontend -> public/)
pnpm start                  # Backend serviert API + gebaute App auf :8787
```

Der Service-Worker wird nur im **Produktions**-Build registriert (im Dev cacht er sonst
alte Stände). Reminder brauchen `PUSHOVER_*`.

## Deployment (Docker)

Multi-Stage-`Dockerfile` (Node 24 Alpine): Build-Stage baut Backend + Frontend, Runtime
serviert alles auf `8080` mit HEALTHCHECK auf `/health`. Frontend-Deps liegen als
`devDependencies` → das Runtime-Image bleibt schlank.

`docker-compose.yml` folgt dem Caddy-Schema (externes `caddy`-Netz, `CADDY_*`-Variablen)
und mountet ein Volume `glupilot-data` auf `/app/data` (Verlauf + Erinnerungen bleiben
über Neustarts erhalten). Vor dem Deploy:

- `CADDY_DOMAIN` auf die echte Domain setzen.
- `.env` neben der Compose-Datei anlegen (siehe `.env.example`).

Bei jedem Push auf `main` baut die GitHub Action das Image und pusht es nach
`ghcr.io/twiesing/glupilot`. Lokal testen:
`docker build -t glupilot . && docker run -p 8080:8080 --env-file .env glupilot`.

## API

Alle Datenpfade sind – falls `API_TOKEN` gesetzt ist – per
`Authorization: Bearer <token>` geschützt. Offen bleiben nur `/health` und die
statischen App-Assets (`/`, JS/CSS, Icons, Manifest, Service-Worker).

| Endpoint | Zweck |
| --- | --- |
| `POST /analyze` | Bild(er) analysieren → Dosis-Ergebnis (s. u.). |
| `GET /glucose` | Aktueller Dexcom-Wert `{ glucose, dexcom_configured }`. |
| `GET /history` | Frühere Berechnungen (neueste zuerst). |
| `DELETE /history` | Verlauf leeren. |
| `POST /reminders` | Erinnerung planen `{ minutes, title, body }` → Pushover. |
| `GET /config` | Dosier-Faktoren (read-only) für die Einstellungen. |
| `GET /health` | Liveness-Check (immer offen). |

### `POST /analyze`

Nimmt **ein oder mehrere** Bilder derselben Mahlzeit entgegen:

```json
{ "images": ["<base64>", "<base64>"] }
```

Einzelbild alternativ `{ "image": "<base64>" }` (mit oder ohne `data:`-Präfix), oder –
am einfachsten für Shortcuts – das Foto direkt als **roher Datei-Body** mit
`Content-Type: image/jpeg`. Optionaler **Hinweis** per JSON-Feld `hint`, Query `?hint=`
oder Header `X-Hint`.

Response (gekürzt):

```json
{
  "carbs_g": 90, "be": 7.5, "factor_iu_per_be": 0.5,
  "meal_units": 4, "correction_units": 1, "target_mgdl": 100, "isf_mgdl": 60,
  "insulin_units": 5, "confidence": "mittel",
  "items": [{ "name": "Pommes frites", "carbs_g": 52 }],
  "assumptions": "…", "note": "…",
  "split_recommended": true,
  "split": { "now_units": 3.5, "later_units": 1.5, "delay_hours": 2 },
  "glucose": { "mgdl": 160, "trend_arrow": "↗", "trend_label": "leicht steigend", "minutes_ago": 3 },
  "dexcom_configured": true, "reminders_enabled": true, "disclaimer": "…"
}
```

- `meal_units` = `carbs_g / 12 × Faktor`, gerundet auf 0,5 IE.
- `correction_units` = `(BZ − target_mgdl) / isf_mgdl`, nur ab `CORRECTION_THRESHOLD_MGDL`.
- `split` (nur bei `split_recommended`): 60 % der Mahlzeit + Korrektur sofort, 40 % nach `delay_hours`.
- `glucose` ist `null`, wenn Dexcom nicht konfiguriert/erreichbar ist.

## Apple Shortcut

1. **Foto aufnehmen** → **Bild konvertieren** → **JPEG**.
2. *(optional)* **Nach Eingabe fragen** (Hinweis).
3. **Inhalte von URL abrufen**: POST auf `https://<host>/analyze`, Anfragetext **Datei**
   = das JPEG, Header `X-Hint` (optional) und `Authorization: Bearer <API_TOKEN>` (falls gesetzt).
4. **Wörterbuchwert** `insulin_units`, `carbs_g`, `be`, `note` → **Ergebnis anzeigen**.

## Konfiguration (`.env`)

| Variable | Default | Zweck |
| --- | --- | --- |
| `OPENAI_API_KEY` | – | **Pflicht**. |
| `OPENAI_MODEL` | `gpt-5-mini` | Vision-Modell (günstiger: `gpt-4.1-mini`). |
| `PORT` / `HOST` | `8787` / `0.0.0.0` | Port; `0.0.0.0` = im LAN erreichbar. |
| `API_TOKEN` | – (leer) | Bearer-Token für alle Datenpfade. Leer = kein Schutz. |
| `HISTORY_FILE` | `data/history.jsonl` | Speicherort des Verlaufs. |
| `HISTORY_MAX` | `0` | Max. zurückgegebene Einträge (`0` = unbegrenzt). |
| `BOLUS_FACTOR_IU_PER_BE` | `0.5` | Insulinfaktor: IE pro BE. |
| `CORRECTION_TARGET_MGDL` | `100` | BZ-Zielwert für die Korrektur. |
| `CORRECTION_ISF_MGDL` | `60` | 1 IE senkt um X mg/dL. |
| `CORRECTION_THRESHOLD_MGDL` | `160` | Korrektur erst ab diesem BZ. |
| `DEXCOM_REGION` | `ous` | `ous` (Europa), `us`, `jp`. |
| `DEXCOM_USERNAME` / `DEXCOM_PASSWORD` | – | Dexcom-Share-Konto; leer = Glukose aus. |
| `GLUCOSE_CACHE_SECONDS` | `60` | Server-Cache für den Glukosewert. |
| `PUSHOVER_TOKEN` / `PUSHOVER_USER` | – | Für Erinnerungen; leer = Erinnerungen aus. |
| `PUSHOVER_DEVICE` | – (leer) | Optional: an ein bestimmtes Gerät senden. |

### Absicherung

Bei gesetztem `API_TOKEN` sind Analyse, Glukose, Verlauf, Erinnerungen und Faktoren
geschützt; die App-Assets bleiben öffentlich (sonst lädt die PWA nicht). PWA einmalig
freischalten: `https://<host>/#token=DEIN_TOKEN` öffnen – das Token landet per
URL-Fragment (nie an den Server gesendet, kein Log-Leak) in `localStorage` und wird
danach als Bearer-Header mitgeschickt. Auf einer öffentlichen Domain unbedingt setzen.
