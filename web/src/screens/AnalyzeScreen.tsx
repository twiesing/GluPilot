import { useRef, useState } from "react";
import {
  Banner,
  Button,
  Text,
  TextArea,
  VStack,
} from "@astryxdesign/core";
import type { AnalyzeResult, Glucose, Reminder } from "../api";
import { Masthead } from "../Masthead";
import { GlucoseBar } from "../GlucoseBar";
import { ActiveReminders } from "../ActiveReminders";
import { ResultView } from "../ResultView";
import { CameraIcon, GalleryIcon, RefreshIcon } from "../icons";

interface Props {
  photos: string[];
  hint: string;
  loading: boolean;
  result: AnalyzeResult | null;
  error: string;
  glucose: Glucose | null;
  dexcomConfigured: boolean;
  reminders: Reminder[];
  onCancelReminder: (id: string) => Promise<void>;
  onRemindersChanged: () => void;
  onAddFiles: (files: File[]) => void;
  onRemovePhoto: (i: number) => void;
  onHintChange: (v: string) => void;
  onAnalyze: () => void;
  onAnalyzeText: (text: string) => void;
  onReset: () => void;
  onDismissError: () => void;
}

export function AnalyzeScreen(p: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [textMode, setTextMode] = useState(false);
  const [mealText, setMealText] = useState("");

  function onFiles(ev: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(ev.target.files ?? [])];
    ev.target.value = "";
    p.onAddFiles(files);
  }

  const n = p.photos.length;

  return (
    <div className="screen">
      <Masthead />

      <GlucoseBar glucose={p.glucose} dexcomConfigured={p.dexcomConfigured} />

      <ActiveReminders reminders={p.reminders} onCancel={p.onCancelReminder} />

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onFiles}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={onFiles}
      />

      {!p.result && n === 0 && !textMode && (
        <VStack gap={3}>
          <button
            className="capture-panel"
            onClick={() => cameraRef.current?.click()}
            aria-label="Foto aufnehmen"
          >
            <div className="capture-panel__badge">
              <CameraIcon size={28} />
            </div>
            <div className="capture-panel__title">Foto aufnehmen</div>
            <div className="capture-panel__sub">
              Tippen und die Mahlzeit ablichten
            </div>
          </button>

          <Button
            label="Aus Galerie wählen"
            variant="ghost"
            icon={<GalleryIcon size={18} />}
            onClick={() => galleryRef.current?.click()}
            style={{ width: "100%" }}
          />

          <Button
            label="Stattdessen als Text beschreiben"
            variant="ghost"
            size="sm"
            onClick={() => setTextMode(true)}
            style={{ width: "100%" }}
          />

          <Text type="supporting" size="sm" style={{ textAlign: "center" }}>
            GluPilot schätzt Kohlenhydrate, Broteinheiten und die passende
            Insulindosis.
          </Text>
        </VStack>
      )}

      {!p.result && n === 0 && textMode && (
        <VStack gap={3}>
          <TextArea
            label="Mahlzeit beschreiben"
            value={mealText}
            onChange={setMealText}
            rows={4}
            placeholder="z. B. 2 Vollkornbrötchen mit Käse, ein Apfel, ein Glas Orangensaft"
          />
          <Button
            label="Berechnen"
            variant="primary"
            isLoading={p.loading}
            isDisabled={mealText.trim().length === 0}
            onClick={() => p.onAnalyzeText(mealText)}
            style={{ width: "100%" }}
          />
          <Button
            label="Zurück zum Foto"
            variant="ghost"
            size="sm"
            icon={<CameraIcon size={16} />}
            onClick={() => setTextMode(false)}
            style={{ width: "100%" }}
          />
        </VStack>
      )}

      {!p.result && n > 0 && (
        <VStack gap={3}>
          <div className="thumbs">
            {p.photos.map((src, i) => (
              <div key={i} className="thumb">
                <img src={src} alt="" />
                <button
                  className="thumb__x"
                  aria-label="Foto entfernen"
                  onClick={() => p.onRemovePhoto(i)}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className="thumb thumb--add"
              aria-label="Weiteres Foto"
              onClick={() => galleryRef.current?.click()}
            >
              +
            </button>
          </div>

          <TextArea
            label="Hinweis (optional)"
            value={p.hint}
            onChange={p.onHintChange}
            rows={3}
            placeholder="z. B. große Portion, Vollkorn, 2 Brötchen, glutenfrei …"
          />

          <Button
            label={
              p.loading
                ? "Analysiere …"
                : n > 1
                  ? `Berechnen · ${n} Fotos`
                  : "Berechnen"
            }
            variant="primary"
            isLoading={p.loading}
            onClick={p.onAnalyze}
            style={{ width: "100%" }}
          />
        </VStack>
      )}

      {p.error && (
        <Banner
          status="error"
          title={p.error}
          isDismissable
          onDismiss={p.onDismissError}
        />
      )}

      {p.result && (
        <VStack gap={3}>
          <ResultView d={p.result} onRemindersChanged={p.onRemindersChanged} />
          <Text type="supporting" size="xsm">
            {p.result.disclaimer}
          </Text>
          <Button
            label="Neue Mahlzeit"
            variant="primary"
            icon={<RefreshIcon size={18} />}
            onClick={p.onReset}
            style={{ width: "100%" }}
          />
        </VStack>
      )}
    </div>
  );
}
