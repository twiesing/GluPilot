// Lädt .env in process.env, bevor andere Module Umgebungsvariablen lesen.
// Muss als ERSTER Import in server.ts stehen (ESM wertet Importe der Reihe nach aus).
import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}
