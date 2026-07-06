import { useEffect, useState } from "react";
import {
  analyze,
  ApiError,
  clearHistory,
  getGlucose,
  getHistory,
  type AnalyzeResult,
  type Glucose,
  type HistoryEntry,
} from "./api";
import { demoGlucose, demoHistory } from "./demo";
import { toJpeg } from "./format";
import { BottomNav, type Screen } from "./BottomNav";
import { AnalyzeScreen } from "./screens/AnalyzeScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

export function App() {
  const [screen, setScreen] = useState<Screen>("analyze");

  // Analyse-Zustand (in App gehalten, damit er Tab-Wechsel überlebt).
  const [photos, setPhotos] = useState<string[]>([]);
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState("");

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [authNotice, setAuthNotice] = useState("");

  const [glucose, setGlucose] = useState<Glucose | null>(null);
  const [dexcomConfigured, setDexcomConfigured] = useState(false);

  // Aktuellen Glukosewert beim Start und dann im Dexcom-Takt (5 Min) holen.
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const g = await getGlucose();
        if (!active) return;
        setGlucose(g.glucose);
        setDexcomConfigured(g.dexcom_configured);
      } catch {
        if (active && import.meta.env.DEV) {
          setGlucose(demoGlucose());
          setDexcomConfigured(true);
        }
      }
    };
    void load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  /** 401 → auf den Zugang-Tab wechseln und Hinweis zeigen. */
  function handleError(e: unknown, fallback: string) {
    if (e instanceof ApiError && e.status === 401) {
      setAuthNotice("Zugang nötig – bitte Token hinterlegen.");
      setScreen("info");
    } else {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`${fallback} (${msg})`);
    }
  }

  async function addFiles(files: File[]) {
    const next: string[] = [];
    for (const f of files) {
      try {
        next.push(await toJpeg(f, 1024, 0.85));
      } catch {
        setError("Ein Bild konnte nicht verarbeitet werden.");
      }
    }
    if (next.length) {
      setError("");
      setPhotos((p) => [...p, ...next]);
    }
  }

  async function runAnalyze() {
    if (photos.length === 0) return;
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const d = await analyze(photos, hint.trim());
      setResult(d);
      void loadHistory();
    } catch (e) {
      handleError(e, "Analyse fehlgeschlagen. Läuft der Server?");
    } finally {
      setLoading(false);
    }
  }

  function resetAnalyze() {
    setPhotos([]);
    setHint("");
    setResult(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadHistory() {
    try {
      const entries = await getHistory();
      setHistory(entries.length === 0 && import.meta.env.DEV ? demoHistory() : entries);
    } catch (e) {
      if (import.meta.env.DEV) {
        setHistory(demoHistory());
        return;
      }
      handleError(e, "Verlauf konnte nicht geladen werden.");
    }
  }

  async function onClearHistory() {
    try {
      await clearHistory();
      setHistory([]);
    } catch (e) {
      handleError(e, "Verlauf konnte nicht geleert werden.");
    }
  }

  function goTo(s: Screen) {
    setScreen(s);
    if (s === "history") void loadHistory();
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="app">
      <main className="app__main">
        {screen === "analyze" && (
          <AnalyzeScreen
            photos={photos}
            hint={hint}
            loading={loading}
            result={result}
            error={error}
            glucose={glucose}
            dexcomConfigured={dexcomConfigured}
            onAddFiles={addFiles}
            onRemovePhoto={(i) =>
              setPhotos((p) => p.filter((_, idx) => idx !== i))
            }
            onHintChange={setHint}
            onAnalyze={runAnalyze}
            onReset={resetAnalyze}
            onDismissError={() => setError("")}
          />
        )}
        {screen === "history" && (
          <HistoryScreen entries={history} onClear={onClearHistory} />
        )}
        {screen === "info" && (
          <SettingsScreen
            notice={authNotice}
            onDismissNotice={() => setAuthNotice("")}
          />
        )}
      </main>
      <BottomNav active={screen} onChange={goTo} />
    </div>
  );
}
