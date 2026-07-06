import { DropIcon } from "./icons";
import type { Glucose } from "./api";

function range(mgdl: number): "low" | "high" | "ok" {
  if (mgdl < 70) return "low";
  if (mgdl > 180) return "high";
  return "ok";
}

export function GlucoseBar({
  glucose,
  dexcomConfigured,
}: {
  glucose: Glucose | null;
  dexcomConfigured: boolean;
}) {
  if (!glucose) {
    if (!dexcomConfigured) return null;
    return (
      <div className="bg-bar" data-range="none">
        <DropIcon size={15} />
        <span>Dexcom aktiv · kein aktueller Wert</span>
      </div>
    );
  }

  const ago =
    glucose.minutes_ago === 0 ? "gerade eben" : `vor ${glucose.minutes_ago} min`;

  return (
    <div className="bg-bar" data-range={range(glucose.mgdl)}>
      <span className="bg-bar__dot" />
      <span className="bg-bar__val">{glucose.mgdl}</span>
      <span className="bg-bar__unit">mg/dL</span>
      <span className="bg-bar__arrow">{glucose.trend_arrow}</span>
      <span className="bg-bar__meta">
        {glucose.trend_label}
        <br />
        {ago}
      </span>
    </div>
  );
}
