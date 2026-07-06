import {
  Button,
  Card,
  Divider,
  EmptyState,
  HStack,
  Item,
  List,
  Text,
  VStack,
} from "@astryxdesign/core";
import type { HistoryEntry } from "../api";
import { fmt } from "../format";
import { Masthead } from "../Masthead";
import { HistoryIcon, RefreshIcon, TrashIcon } from "../icons";

const HIST_FMT = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function when(ts: string): string {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? ts : HIST_FMT.format(d);
}

function isToday(ts: string): boolean {
  const d = new Date(ts);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Was gegessen wurde – aus den erkannten Bestandteilen, sonst Hinweis. */
function food(e: HistoryEntry): string {
  const names = e.items.map((i) => i.name).filter(Boolean);
  if (names.length) return names.join(", ");
  if (e.hint && e.hint.trim()) return e.hint.trim();
  return "Mahlzeit";
}

function meta(e: HistoryEntry): string {
  const bits = [when(e.ts), `${fmt(e.carbs_g)} g`];
  if (e.glucose_mgdl != null) bits.push(`${e.glucose_mgdl} mg/dL`);
  return bits.join(" · ");
}

export function HistoryScreen({
  entries,
  onClear,
  onDelete,
}: {
  entries: HistoryEntry[];
  onClear: () => void;
  onDelete: (id: string) => void;
}) {
  const today = entries.filter((e) => isToday(e.ts));
  const todayIU = today.reduce((s, e) => s + e.insulin_units, 0);
  const todayCarbs = today.reduce((s, e) => s + e.carbs_g, 0);

  return (
    <div className="screen">
      <Masthead />

      {entries.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon size={30} />}
          title="Noch kein Verlauf"
          description="Deine berechneten Mahlzeiten erscheinen hier – neueste zuerst."
        />
      ) : (
        <VStack gap={3}>
          {today.length > 0 && (
            <div className="accent-panel" style={{ padding: "22px 22px 20px" }}>
              <VStack gap={2}>
                <span className="accent-panel__label">
                  Heute · {today.length}{" "}
                  {today.length === 1 ? "Mahlzeit" : "Mahlzeiten"}
                </span>
                <div className="accent-panel__row">
                  <div>
                    <div className="accent-panel__cap">Insulin</div>
                    <div className="accent-panel__num">
                      {fmt(Math.round(todayIU * 10) / 10)} IE
                    </div>
                  </div>
                  <div>
                    <div className="accent-panel__cap">Kohlenhydrate</div>
                    <div className="accent-panel__num">{fmt(todayCarbs)} g</div>
                  </div>
                </div>
              </VStack>
            </div>
          )}

          <Card padding={4} className="elev">
            <VStack gap={1.5}>
              <HStack justify="between" vAlign="center">
                <Text type="label" color="secondary">
                  Alle Berechnungen
                </Text>
                <Button
                  label="Leeren"
                  variant="ghost"
                  size="sm"
                  icon={<RefreshIcon size={15} />}
                  onClick={onClear}
                />
              </HStack>
              <Divider variant="subtle" />
              <List>
                {entries.map((e) => (
                  <Item
                    key={e.id}
                    label={food(e)}
                    description={meta(e)}
                    endContent={
                      <HStack gap={1} vAlign="center">
                        <Text weight="semibold" className="metric">
                          {fmt(e.insulin_units)} IE
                        </Text>
                        <Button
                          label="Eintrag löschen"
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          icon={<TrashIcon size={16} />}
                          onClick={() => onDelete(e.id)}
                        />
                      </HStack>
                    }
                  />
                ))}
              </List>
            </VStack>
          </Card>
        </VStack>
      )}
    </div>
  );
}
