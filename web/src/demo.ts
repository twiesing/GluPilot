import type { DosingConfig, Glucose, HistoryEntry } from "./api";

/** Dev-Demo für die Dosier-Faktoren. */
export function demoConfig(): DosingConfig {
  return {
    grams_per_be: 12,
    factor_iu_per_be: 0.5,
    target_mgdl: 100,
    isf_mgdl: 60,
    correction_threshold_mgdl: 160,
  };
}

/** Dev-Demo für den aktuellen Glukosewert. */
export function demoGlucose(): Glucose {
  return {
    mgdl: 142,
    mmol: 7.9,
    trend_arrow: "↗",
    trend_label: "leicht steigend",
    minutes_ago: 3,
  };
}

/** Nur im Dev genutzte Beispieldaten, damit der Verlauf befüllt aussieht. */
export function demoHistory(): HistoryEntry[] {
  const h = 3600_000;
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
  const e = (
    ms: number,
    iu: number,
    carbs: number,
    conf: string,
    glucose: number | null,
    items: [string, number][],
    hint = "",
  ): HistoryEntry => ({
    id: `demo-${ms}`,
    ts: ago(ms),
    insulin_units: iu,
    insulin_units_exact: iu,
    carbs_g: carbs,
    be: Math.round((carbs / 12) * 10) / 10,
    meal_units: iu,
    correction_units: null,
    confidence: conf,
    hint,
    items: items.map(([name, carbs_g]) => ({ name, carbs_g })),
    glucose_mgdl: glucose,
    image_count: 1,
  });

  return [
    e(1.5 * h, 1, 14, "hoch", 132, [["Apfel", 14]]),
    e(4 * h, 5.5, 78, "mittel", 165, [
      ["Spaghetti", 62],
      ["Bolognese", 10],
      ["Parmesan", 6],
    ]),
    e(7 * h, 3.5, 42, "hoch", 138, [
      ["Vollkornbrötchen", 30],
      ["Frischkäse", 2],
      ["Orangensaft", 10],
    ]),
    e(26 * h, 6, 84, "mittel", 182, [["Pizza Margherita", 84]], "große Portion"),
    e(30 * h, 1.5, 18, "hoch", 121, [
      ["Caesar Salad", 8],
      ["Hähnchen", 0],
      ["Croutons", 10],
    ]),
    e(50 * h, 3, 40, "hoch", null, [
      ["Müsli", 28],
      ["Joghurt", 6],
      ["Beeren", 6],
    ]),
  ];
}
