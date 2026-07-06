// Erinnerungen über Pushover: persistente Reminder mit fälligem Zeitpunkt, die
// ein Intervall verschickt – funktioniert unabhängig davon, ob die App offen ist.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const TOKEN = process.env.PUSHOVER_TOKEN ?? "";
const USER = process.env.PUSHOVER_USER ?? "";
// Optional: an ein bestimmtes Gerät senden (sonst alle Geräte des Users).
const DEVICE = process.env.PUSHOVER_DEVICE ?? "";
const FILE = process.env.REMINDERS_FILE ?? "data/reminders.json";
const API = "https://api.pushover.net/1/messages.json";

export function pushConfigured(): boolean {
  return TOKEN.length > 0 && USER.length > 0;
}

interface Reminder {
  id: string;
  due: number;
  title: string;
  body: string;
}

async function load(): Promise<Reminder[]> {
  try {
    const parsed = JSON.parse(await readFile(FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function save(list: Reminder[]): Promise<void> {
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(list), "utf8");
}

let counter = 0;

/** Legt eine Erinnerung an; delayMinutes ab jetzt. Gibt die ID zurück. */
export async function addReminder(
  delayMinutes: number,
  title: string,
  body: string,
): Promise<string> {
  const list = await load();
  const id = `${Date.now()}-${counter++}`;
  list.push({ id, due: Date.now() + delayMinutes * 60_000, title, body });
  await save(list);
  return id;
}

async function send(r: Reminder): Promise<void> {
  const payload: Record<string, string> = {
    token: TOKEN,
    user: USER,
    title: r.title,
    message: r.body,
  };
  if (DEVICE) payload.device = DEVICE;
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Pushover -> HTTP ${res.status}`);
}

/** Startet den Scheduler, der fällige Erinnerungen verschickt. */
export function startReminderScheduler(
  log: (msg: string, err?: unknown) => void,
): void {
  if (!pushConfigured()) return;
  setInterval(async () => {
    const list = await load();
    const now = Date.now();
    const due = list.filter((r) => r.due <= now);
    if (due.length === 0) return;

    await save(list.filter((r) => r.due > now));
    for (const r of due) {
      try {
        await send(r);
      } catch (err) {
        log("pushover send failed", err);
      }
    }
  }, 20_000);
}
