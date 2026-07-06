import type { ReactNode } from "react";
import { CameraIcon, GearIcon, HistoryIcon } from "./icons";

export type Screen = "analyze" | "history" | "info";

const TABS: { id: Screen; label: string; icon: ReactNode }[] = [
  { id: "analyze", label: "Analyse", icon: <CameraIcon /> },
  { id: "history", label: "Verlauf", icon: <HistoryIcon /> },
  { id: "info", label: "Einstellungen", icon: <GearIcon /> },

];

export function BottomNav({
  active,
  onChange,
}: {
  active: Screen;
  onChange: (s: Screen) => void;
}) {
  return (
    <nav className="bottomnav" aria-label="Hauptnavigation">
      <div className="bottomnav__inner">
        {TABS.map((t) => (
          <button
            key={t.id}
            className="navitem"
            data-active={active === t.id}
            aria-current={active === t.id ? "page" : undefined}
            onClick={() => onChange(t.id)}
          >
            {t.icon}
            <span className="navitem__label">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
