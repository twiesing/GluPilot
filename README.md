# GluPilot

Mahlzeit fotografieren → OpenAI-Vision schätzt die Kohlenhydrate → die App rechnet BE
und Insulinmenge (Faktor **0,5 IE/BE**, **12 g/BE**), optional mit Blutzucker-Korrektur
(Dexcom) und Split-Bolus. Als installierbare **PWA** und als HTTP-API (auch für Apple
Shortcuts).

> ⚠️ **Kein Medizinprodukt, keine ärztliche Beratung.** Die Kohlenhydrat-Schätzung
> ist ungenau. Menge und Dosis **vor jeder Injektion selbst prüfen**. Nutzung auf
> eigene Verantwortung.

## Setup

```bash
pnpm install
cp .env.example .env   # OPENAI_API_KEY eintragen, optional API_TOKEN setzen
pnpm dev               # oder: pnpm start
```

Der Server läuft standardmäßig auf `http://<dein-mac>:8787` und ist per `HOST=0.0.0.0`
im lokalen Netz (also vom iPhone) erreichbar.

## Web-App / PWA (empfohlen)

Öffne auf dem iPhone im Safari `http://<dein-mac>:8787/`. Die Seite bietet:

- **Foto aufnehmen** über das native Kamera-/Dateifeld oder **Galerie** (kein Kurzbefehl nötig).
- **Mehrere Fotos** einer Mahlzeit (verschiedene Winkel) – werden zusammen ausgewertet.
- optionales **Hinweis**-Feld (Portionsgröße etc.).
- Ergebnisanzeige mit **IE**, **Kohlenhydraten**, **BE**, Bestandteilen und Hinweis.

Das Bild wird im Browser automatisch zu JPEG konvertiert und verkleinert – damit sind
HEIC-Fotos und große Uploads kein Problem.

**Als App installieren:** Safari → Teilen → „Zum Home-Bildschirm". Dank Web-Manifest,
Icons und Service-Worker läuft sie danach im Standalone-Modus (eigenes Icon, ohne
Browser-Leiste) und startet auch offline (die Analyse selbst braucht Netz).

## Deployment (Docker)

`Dockerfile` baut ein schlankes Image (Node 24 Alpine, Multi-Stage, lauscht auf `8080`,
mit HEALTHCHECK auf `/health`). Bei jedem Push auf `main` baut die GitHub Action
`.github/workflows/docker.yml` das Image und pusht es nach
`ghcr.io/twiesing/glupilot` (`latest` + `sha`-Tag).

`docker-compose.yml` folgt dem Caddy-Schema (externes `caddy`-Netz, `CADDY_*`-Variablen).
Vor dem Deploy anpassen:

- `CADDY_DOMAIN` auf die echte Domain setzen.
- `.env` neben der Compose-Datei anlegen (siehe `.env.example`) – hält `OPENAI_API_KEY`,
  optional `API_TOKEN`, `DEXCOM_*` und die Korrekturwerte.

Ist das GHCR-Package privat, auf dem Server einmalig `docker login ghcr.io` (oder Package
öffentlich schalten). Lokal testen: `docker build -t glupilot . && docker run -p 8080:8080 --env-file .env glupilot`.

## API

### `POST /analyze`

Nimmt **ein oder mehrere** Bilder derselben Mahlzeit entgegen.

Request (JSON):

```json
{ "images": ["<base64>", "<base64>", "..."] }
```

Einzelbild alternativ: `{ "image": "<base64>" }`. Base64 mit oder ohne
`data:image/jpeg;base64,`-Präfix.

**Einfachster Weg (empfohlen für Shortcuts):** das Foto direkt als roher Datei-Body
mit `Content-Type: image/jpeg` senden – kein JSON, kein Base64 nötig.

**Optionaler Hinweis** zur besseren Schätzung (z. B. Portionsgröße, Zubereitung):
per JSON-Feld `hint`, Query `?hint=...` oder Header `X-Hint`.

Falls `API_TOKEN` gesetzt ist, muss der Header `Authorization: Bearer <token>`
mitgeschickt werden.

Response:

```json
{
  "carbs_g": 90,
  "be": 7.5,
  "factor_iu_per_be": 0.5,
  "meal_units": 4,
  "correction_units": 1,
  "target_mgdl": 100,
  "isf_mgdl": 60,
  "insulin_units": 5,
  "confidence": "mittel",
  "items": [{ "name": "Pommes frites", "carbs_g": 52 }],
  "assumptions": "Pommes ca. 180 g.",
  "note": "Frittiertes: verzögerter Blutzuckeranstieg möglich.",
  "split_recommended": true,
  "split_reason": "Hoher Fett-/Eiweißanteil, verzögerter Anstieg",
  "split": { "now_units": 3.5, "later_units": 1.5, "delay_hours": 2 },
  "glucose": {
    "mgdl": 160, "mmol": 8.9,
    "trend_arrow": "↗", "trend_label": "leicht steigend", "minutes_ago": 3
  },
  "hint": "",
  "image_count": 1,
  "disclaimer": "..."
}
```

- `meal_units` = `carbs_g / 12 × 0,5`, gerundet auf 0,5 IE.
- `correction_units` = `(BZ − target_mgdl) / isf_mgdl` (nur wenn Dexcom einen Wert
  liefert; kann negativ sein), `insulin_units` = `meal_units + correction_units` (min. 0).
- `split` (nur bei `split_recommended`): fett-/eiweißreiche Mahlzeit → Dual-Wave-Vorschlag
  (60 % der Mahlzeit + Korrektur sofort, 40 % nach `delay_hours`).
- `glucose` ist `null`, wenn Dexcom nicht konfiguriert oder nicht erreichbar ist.

### `GET /health`

Liveness-Check (kein Token nötig).

## Apple Shortcut einrichten

Einfachster, getesteter Aufbau (ein Foto, roher Datei-Body):

1. **Foto aufnehmen**
2. **Bild konvertieren** → **JPEG**
   (iPhone-Fotos sind sonst HEIC, das die Vision-API nicht akzeptiert.)
3. *(optional)* **Nach Eingabe fragen** (Text) – für einen Hinweis wie „doppelte Portion“.
4. **Inhalte von URL abrufen**:
   - URL: `http://<dein-mac>:8787/analyze`
   - Methode: **POST**
   - Anfragetext: **Datei** = das konvertierte Bild aus Schritt 2
   - Header (optional): `X-Hint` = die Eingabe aus Schritt 3
   - Header (falls `API_TOKEN` gesetzt): `Authorization` = `Bearer <API_TOKEN>`
5. **Wörterbuchwert abrufen** (`carbs_g`, `be`, `insulin_units`, `note`) → in einer
   **Text**-Aktion zusammenbauen → **Ergebnis anzeigen**.

## Konfiguration (`.env`)

| Variable                | Default      | Zweck                                        |
| ----------------------- | ------------ | -------------------------------------------- |
| `OPENAI_API_KEY`        | –            | Pflicht.                                     |
| `OPENAI_MODEL`          | `gpt-5-mini` | Vision-Modell. Billiger, aber unterschätzt: `gpt-4.1-mini`. |
| `PORT`                  | `8787`       | Port.                                        |
| `HOST`                  | `0.0.0.0`    | `0.0.0.0` = im LAN erreichbar.               |
| `API_TOKEN`             | – (leer)     | Wenn gesetzt: Bearer-Token für `/analyze`.   |
| `DEXCOM_REGION`         | `ous`        | `ous` (Europa), `us`, `jp`.                  |
| `DEXCOM_USERNAME`       | – (leer)     | Dexcom-Share-Konto; leer = Glukose aus.      |
| `DEXCOM_PASSWORD`       | – (leer)     | Dexcom-Share-Passwort.                       |
| `CORRECTION_TARGET_MGDL`| `100`        | Blutzucker-Zielwert für die Korrektur.       |
| `CORRECTION_ISF_MGDL`   | `60`         | 1 IE senkt um X mg/dL (Korrekturfaktor).     |

### Absicherung

`API_TOKEN` schützt nur `/analyze`; die Web-App-Assets bleiben öffentlich. Die PWA
einmalig freischalten: `http://<host>:8787/#token=DEIN_TOKEN` öffnen – das Token landet
per URL-Fragment (nie an den Server gesendet, kein Log-Leak) in `localStorage` und wird
danach als Bearer-Header mitgeschickt.

### Blutzucker-Korrektur & Split-Bolus

Ist Dexcom konfiguriert, wird beim Analysieren der aktuelle Wert geholt und als Korrektur
eingerechnet (`insulin_units = meal_units + correction_units`). Bei fett-/eiweißreichen
Mahlzeiten wird zusätzlich ein aufgeteilter Bolus vorgeschlagen. **Keine medizinische
Beratung** – Ziel/Faktor sind deine persönlichen Werte, jede Dosis vor der Injektion prüfen.
