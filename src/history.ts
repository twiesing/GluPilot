// Persistiert jede Berechnung append-only als JSON-Line auf der Platte.
// Bewusst OHNE Foto: nur das Ergebnis – klein und ohne Gesundheitsbild-Daten.

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/** Speicherort (relativ zum Arbeitsverzeichnis). Im Container ein Volume. */
const FILE = process.env.HISTORY_FILE ?? "data/history.jsonl";
/**
 * Wie viele Einträge /history maximal zurückgibt (neueste zuerst).
 * 0 (Standard) = unbegrenzt – gespeichert wird ohnehin append-only alles.
 */
const MAX = Number(process.env.HISTORY_MAX ?? 0);

export interface HistoryEntry {
  id: string;
  ts: string;
  insulin_units: number;
  insulin_units_exact: number;
  carbs_g: number;
  be: number;
  meal_units: number;
  correction_units: number | null;
  confidence: string;
  hint: string;
  items: { name: string; carbs_g: number }[];
  glucose_mgdl: number | null;
  image_count: number;
}

let counter = 0;

/** Alle Einträge in Dateireihenfolge (älteste zuerst). */
async function readRaw(): Promise<HistoryEntry[]> {
  let text: string;
  try {
    text = await readFile(FILE, "utf8");
  } catch {
    return [];
  }
  const entries: HistoryEntry[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      // JSON.parse liefert any -> ohne Cast der HistoryEntry zuweisbar.
      entries.push(JSON.parse(trimmed));
    } catch {
      // Beschädigte Zeile überspringen.
    }
  }
  return entries;
}

/** Hängt einen Eintrag an (ID wird hier vergeben). Gibt die ID zurück. */
export async function appendHistory(
  entry: Omit<HistoryEntry, "id">,
): Promise<string> {
  const id = `${Date.now()}-${counter++}`;
  await mkdir(dirname(FILE), { recursive: true });
  await appendFile(FILE, JSON.stringify({ id, ...entry }) + "\n", "utf8");
  return id;
}

/** Neueste Einträge zuerst (max. HISTORY_MAX). Leere Liste, wenn nichts da ist. */
export async function readHistory(): Promise<HistoryEntry[]> {
  const entries = (await readRaw()).reverse();
  return MAX > 0 ? entries.slice(0, MAX) : entries;
}

/** Löscht einen einzelnen Eintrag. true, wenn er existierte. */
export async function removeHistory(id: string): Promise<boolean> {
  const entries = await readRaw();
  const next = entries.filter((e) => e.id !== id);
  if (next.length === entries.length) return false;
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(
    FILE,
    next.map((e) => JSON.stringify(e)).join("\n") + (next.length ? "\n" : ""),
    "utf8",
  );
  return true;
}

/** Löscht die gesamte Historie. */
export async function clearHistory(): Promise<void> {
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, "", "utf8");
}
