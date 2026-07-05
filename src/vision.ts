import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5-mini";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface FoodItem {
  name: string;
  carbs_g: number;
}

export interface CarbEstimate {
  carbs_g: number;
  confidence: "niedrig" | "mittel" | "hoch";
  items: FoodItem[];
  assumptions: string;
  note: string;
  split_recommended: boolean;
  split_reason: string;
}

const SYSTEM_PROMPT = [
  "Du bist ein Ernährungsassistent für das Kohlenhydratzählen bei Diabetes.",
  "Du bekommst ein oder mehrere Fotos EINER Mahlzeit (verschiedene Blickwinkel oder Teller derselben Mahlzeit).",
  "Schätze die Gesamtmenge an verwertbaren Kohlenhydraten in Gramm für die gesamte Mahlzeit.",
  "Wenn mehrere Fotos dieselbe Speise zeigen, NICHT doppelt zählen.",
  "WICHTIG: Nimm realistische, typische Portionsgrößen an, wie sie in Restaurant, Imbiss",
  "oder auf einem gefüllten Teller üblich sind. Unterschätze NICHT – eine zu niedrige",
  "Kohlenhydratschätzung führt zu zu wenig Insulin. Wähle im Zweifel die realistische",
  "obere Mitte statt der kleinsten denkbaren Portion.",
  "Gib je erkanntem Bestandteil die geschätzten Kohlenhydrate an.",
  "Nenne deine Annahmen (geschätztes Gewicht je Bestandteil, Zubereitung) knapp im Feld assumptions.",
  "Wenn die Mahlzeit fett- oder eiweißreich ist (z. B. Frittiertes, Wurst, Käse, Sahne),",
  "weise im Feld note auf einen möglichen verzögerten Blutzuckeranstieg hin; sonst leerer String.",
  "Setze split_recommended=true, wenn die Mahlzeit deutlich fett-/eiweißreich ist",
  "(z. B. Pizza, Pommes/Frittiertes, Burger, viel Käse/Sahne/Fleisch, Aufläufe) und ein",
  "aufgeteilter Bolus (Teil sofort, Teil verzögert) sinnvoll wäre; sonst false.",
  "Begründe das kurz in split_reason (z. B. 'hoher Fett-/Eiweißanteil, verzögerter Anstieg');",
  "wenn nicht empfohlen, leerer String.",
].join(" ");

const JSON_SCHEMA = {
  name: "carb_estimate",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      carbs_g: {
        type: "number",
        description: "Geschätzte Gesamt-Kohlenhydrate der Mahlzeit in Gramm.",
      },
      confidence: {
        type: "string",
        description: "Sicherheit der Schätzung.",
        enum: ["niedrig", "mittel", "hoch"],
      },
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            carbs_g: { type: "number" },
          },
          required: ["name", "carbs_g"],
        },
      },
      assumptions: { type: "string" },
      note: {
        type: "string",
        description:
          "Hinweis z. B. auf verzögerten BZ-Anstieg bei Fett/Eiweiß. Leerer String, wenn nichts.",
      },
      split_recommended: {
        type: "boolean",
        description: "true, wenn ein aufgeteilter Bolus (Dual-Wave) sinnvoll ist.",
      },
      split_reason: {
        type: "string",
        description: "Kurze Begründung für den Split. Leerer String, wenn nicht empfohlen.",
      },
    },
    required: [
      "carbs_g",
      "confidence",
      "items",
      "assumptions",
      "note",
      "split_recommended",
      "split_reason",
    ],
  },
} as const;

/** Normalisiert Base64 (mit oder ohne data:-Präfix) zu einer data-URL. */
function toDataUrl(image: string): string {
  if (image.startsWith("data:")) return image;
  return `data:image/jpeg;base64,${image}`;
}

export async function estimateCarbs(
  images: string[],
  hint?: string,
): Promise<CarbEstimate> {
  const imageContent = images.map((img) => ({
    type: "image_url" as const,
    image_url: { url: toDataUrl(img) },
  }));

  const userText =
    hint && hint.trim().length > 0
      ? "Schätze die Kohlenhydrate dieser Mahlzeit. Zusätzliche Angaben des " +
        `Nutzers (unbedingt berücksichtigen, sie sind genauer als das Foto): ${hint.trim()}`
      : "Schätze die Kohlenhydrate dieser Mahlzeit.";

  const response = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_schema", json_schema: JSON_SCHEMA },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [{ type: "text", text: userText }, ...imageContent],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Keine Antwort vom Modell erhalten.");
  }

  return JSON.parse(content) as CarbEstimate;
}
