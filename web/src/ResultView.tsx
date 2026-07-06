import {
  Badge,
  Card,
  Divider,
  HStack,
  Item,
  List,
  Text,
  VStack,
} from "@astryxdesign/core";
import type { BadgeVariant } from "@astryxdesign/core/Badge";
import type { AnalyzeResult } from "./api";
import { fmt } from "./format";
import { DropIcon, WarnIcon } from "./icons";
import { ReminderCard } from "./ReminderCard";

const CONF_VARIANT: Record<string, BadgeVariant> = {
  hoch: "success",
  mittel: "warning",
  niedrig: "error",
};

export function ResultView({
  d,
  onRemindersChanged,
}: {
  d: AnalyzeResult;
  onRemindersChanged: () => void;
}) {
  const hasCorrection = d.correction_units != null;
  return (
    <VStack gap={3}>
      {/* Hero: die Insulindosis – der eine Blickfang. */}
      <div className="hero">
        <div className="hero__label">Insulin gesamt</div>
        <div>
          <span className="hero__num">{fmt(d.insulin_units)}</span>
          <span className="hero__unit">IE</span>
        </div>
        <div className="hero__meta">
          berechnet {fmt(d.insulin_units_exact)} IE · Faktor{" "}
          {fmt(d.factor_iu_per_be)} · 12 g je BE
        </div>
        {d.glucose ? (
          <div className="hero__pill">
            <DropIcon size={15} />
            <span>
              <b>{d.glucose.mgdl}</b> mg/dL {d.glucose.trend_arrow}{" "}
              {d.glucose.trend_label} ·{" "}
              {d.glucose.minutes_ago === 0
                ? "gerade eben"
                : `vor ${d.glucose.minutes_ago} min`}
            </span>
          </div>
        ) : d.dexcom_configured ? (
          <div className="hero__pill">
            <DropIcon size={15} />
            <span>Dexcom aktiv · kein aktueller Wert</span>
          </div>
        ) : null}
      </div>

      {/* KH / BE */}
      <HStack gap={3}>
        <Card padding={4} style={{ flex: 1 }} className="elev">
          <VStack gap={0.5}>
            <Text type="label" color="secondary">
              Kohlenhydrate
            </Text>
            <Text size="2xl" className="metric">
              {fmt(d.carbs_g)} g
            </Text>
          </VStack>
        </Card>
        <Card padding={4} style={{ flex: 1 }} className="elev">
          <VStack gap={0.5}>
            <Text type="label" color="secondary">
              Broteinheiten
            </Text>
            <Text size="2xl" className="metric">
              {fmt(d.be)}
            </Text>
          </VStack>
        </Card>
      </HStack>

      {/* Dosis-Zusammensetzung */}
      {hasCorrection && (
        <Card padding={4} className="elev">
          <VStack gap={1.5}>
            <Text type="label" color="accent">
              Zusammensetzung
            </Text>
            <HStack justify="between">
              <Text color="secondary">Mahlzeit</Text>
              <Text className="metric">{fmt(d.meal_units)} IE</Text>
            </HStack>
            <HStack justify="between">
              <Text color="secondary">
                Korrektur (BZ {d.glucose ? d.glucose.mgdl : "–"} → Ziel{" "}
                {d.target_mgdl})
              </Text>
              <Text className="metric">
                {(d.correction_units ?? 0) >= 0 ? "+" : ""}
                {fmt(d.correction_units ?? 0)} IE
              </Text>
            </HStack>
            <Divider variant="subtle" />
            <HStack justify="between">
              <Text weight="semibold">Gesamt</Text>
              <Text weight="semibold" className="metric">
                {fmt(d.insulin_units)} IE
              </Text>
            </HStack>
          </VStack>
        </Card>
      )}

      {/* Split-Bolus */}
      {d.split_recommended && d.split && (
        <Card padding={4}>
          <VStack gap={2}>
            <Text type="label" color="accent">
              Bolus aufteilen
            </Text>
            <HStack gap={3}>
              <Card padding={3} variant="muted" style={{ flex: 1 }}>
                <VStack gap={0.5} hAlign="center">
                  <Text size="xl" className="metric">
                    {fmt(d.split.now_units)} IE
                  </Text>
                  <Text type="supporting" size="xsm">
                    sofort
                  </Text>
                </VStack>
              </Card>
              <Card padding={3} variant="muted" style={{ flex: 1 }}>
                <VStack gap={0.5} hAlign="center">
                  <Text size="xl" className="metric">
                    {fmt(d.split.later_units)} IE
                  </Text>
                  <Text type="supporting" size="xsm">
                    nach {d.split.delay_hours} h
                  </Text>
                </VStack>
              </Card>
            </HStack>
            {d.split_reason && (
              <Text type="supporting" size="sm">
                {d.split_reason}
              </Text>
            )}
          </VStack>
        </Card>
      )}

      {/* Erinnerung (nur bei Split-Bolus und wenn Pushover konfiguriert) */}
      {d.reminders_enabled && (
        <ReminderCard d={d} onScheduled={onRemindersChanged} />
      )}

      {/* Bestandteile */}
      <Card padding={4}>
        <VStack gap={1.5}>
          <HStack justify="between" vAlign="center">
            <Text type="label" color="accent">
              Bestandteile
            </Text>
            {d.confidence && (
              <Badge
                variant={CONF_VARIANT[d.confidence] ?? "neutral"}
                label={`Sicherheit: ${d.confidence}`}
              />
            )}
          </HStack>
          <List>
            {d.items.map((it, i) => (
              <Item key={i} label={it.name} endContent={`${fmt(it.carbs_g)} g`} />
            ))}
          </List>
        </VStack>
      </Card>

      {/* Annahmen / Hinweis */}
      <Card padding={4}>
        <VStack gap={1.5}>
          <Text type="label" color="accent">
            Annahmen
          </Text>
          <Text type="supporting" size="sm">
            {d.assumptions || "–"}
          </Text>
          {d.note && d.note.trim() && (
            <>
              <Divider variant="subtle" />
              <HStack gap={1} vAlign="center">
                <WarnIcon size={15} />
                <Text type="label" color="secondary">
                  Verzögerter Anstieg
                </Text>
              </HStack>
              <Text type="supporting" size="sm">
                {d.note}
              </Text>
            </>
          )}
        </VStack>
      </Card>
    </VStack>
  );
}
