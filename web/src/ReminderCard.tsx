import { useState } from "react";
import { Button, Card, Text, VStack } from "@astryxdesign/core";
import { scheduleReminder, type AnalyzeResult } from "./api";
import { clockTime, fmt } from "./format";

export function ReminderCard({
  d,
  onScheduled,
}: {
  d: AnalyzeResult;
  onScheduled: () => void;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  // Erinnerung nur sinnvoll beim aufgeteilten Bolus (2. Teil nachspritzen).
  const split = d.split_recommended ? d.split : null;
  if (!split) return null;

  async function schedule() {
    if (!split) return;
    setBusy(true);
    setStatus("");
    try {
      const { due } = await scheduleReminder(
        split.delay_hours * 60,
        "2. Bolus-Teil fällig",
        `${fmt(split.later_units)} IE nachspritzen`,
      );
      setStatus(`Erinnerung um ${clockTime(due)} Uhr gesetzt.`);
      onScheduled();
    } catch {
      setStatus("Konnte Erinnerung nicht setzen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card padding={4} className="elev">
      <VStack gap={2}>
        <Text type="label" color="accent">
          Erinnerung
        </Text>
        <Text type="supporting" size="sm">
          Den verzögerten Teil ({fmt(split.later_units)} IE) in {split.delay_hours} h
          nachspritzen.
        </Text>
        <Button
          label={`In ${split.delay_hours} h erinnern`}
          variant="primary"
          isDisabled={busy}
          onClick={schedule}
          style={{ width: "100%" }}
        />
        {status && (
          <Text type="supporting" size="sm">
            {status}
          </Text>
        )}
      </VStack>
    </Card>
  );
}
