// Dosierlogik – bewusst deterministisch im Code, NICHT vom Sprachmodell berechnet.

/** Kohlenhydrate pro Broteinheit (BE). */
export const GRAMS_PER_BE = 12;

/** Insulinfaktor: IE pro BE (Default 0,5, per Env überschreibbar). */
export const FACTOR_IU_PER_BE = Number(process.env.BOLUS_FACTOR_IU_PER_BE ?? 0.5);

/** Blutzucker-Zielwert (mg/dL) für die Korrektur. */
export const TARGET_MGDL = Number(process.env.CORRECTION_TARGET_MGDL ?? 100);
/** Korrekturfaktor: um wie viel mg/dL 1 IE den Blutzucker senkt. */
export const CORRECTION_ISF_MGDL = Number(process.env.CORRECTION_ISF_MGDL ?? 60);

/** Rundet auf 0,5 (übliche Pen-Schrittweite). */
function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export interface DosingResult {
  carbs_g: number;
  be: number;
  factor_iu_per_be: number;
  /** Bolus nur für die Mahlzeit. */
  meal_units: number;
  /** Korrektur aus dem aktuellen Blutzucker (kann negativ sein), null ohne Wert. */
  correction_units: number | null;
  /** Zielwert und Faktor, die der Korrektur zugrunde liegen. */
  target_mgdl: number;
  isf_mgdl: number;
  /** Gesamtdosis = Mahlzeit + Korrektur, nie unter 0. */
  insulin_units: number;
}

/**
 * Berechnet die Dosis. Ohne glucoseMgdl entfällt die Korrektur
 * (correction_units = null, insulin_units = Mahlzeitenbolus).
 */
export function calculateDosing(
  carbsGrams: number,
  glucoseMgdl?: number,
): DosingResult {
  const be = carbsGrams / GRAMS_PER_BE;
  const meal = roundToHalf(be * FACTOR_IU_PER_BE);

  let correction: number | null = null;
  if (typeof glucoseMgdl === "number") {
    correction = roundToHalf((glucoseMgdl - TARGET_MGDL) / CORRECTION_ISF_MGDL);
  }

  const total = Math.max(0, meal + (correction ?? 0));

  return {
    carbs_g: Math.round(carbsGrams),
    be: Math.round(be * 10) / 10,
    factor_iu_per_be: FACTOR_IU_PER_BE,
    meal_units: meal,
    correction_units: correction,
    target_mgdl: TARGET_MGDL,
    isf_mgdl: CORRECTION_ISF_MGDL,
    insulin_units: roundToHalf(total),
  };
}

/** Anteil des Sofort-Bolus beim aufgeteilten (Dual-Wave) Bolus. */
export const SPLIT_UPFRONT_SHARE = 0.6;
/** Verzögerung des zweiten Bolus-Teils in Stunden. */
export const SPLIT_DELAY_HOURS = 2;

export interface SplitBolus {
  now_units: number;
  later_units: number;
  delay_hours: number;
}

/**
 * Teilt in Sofort- und verzögerten Anteil. Nur der Mahlzeitenbolus wird
 * gesplittet (Fett/Eiweiß verzögert die Kohlenhydrate); die Korrektur kommt
 * komplett sofort dazu.
 */
export function splitBolus(mealUnits: number, correctionUnits: number): SplitBolus {
  const mealNow = roundToHalf(mealUnits * SPLIT_UPFRONT_SHARE);
  return {
    now_units: Math.max(0, roundToHalf(mealNow + correctionUnits)),
    later_units: roundToHalf(mealUnits - mealNow),
    delay_hours: SPLIT_DELAY_HOURS,
  };
}
