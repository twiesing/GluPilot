import { useState } from "react";
import { Button, Card, HStack, Text, VStack } from "@astryxdesign/core";
import type { Reminder } from "./api";
import { clockTime } from "./format";

export function ActiveReminders({
  reminders,
  onCancel,
}: {
  reminders: Reminder[];
  onCancel: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  // Abgelaufene (schon verschickte) nicht mehr anzeigen.
  const active = reminders.filter((r) => r.due > Date.now() - 5000);
  if (active.length === 0) return null;

  async function cancel(id: string) {
    setBusy(id);
    try {
      await onCancel(id);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card padding={3} className="elev">
      <VStack gap={2}>
        <Text type="label" color="accent">
          Laufende Erinnerungen
        </Text>
        {active.map((r) => (
          <HStack key={r.id} justify="between" vAlign="center" gap={2}>
            <VStack gap={0}>
              <Text size="sm" weight="medium">
                {r.body}
              </Text>
              <Text type="supporting" size="xsm">
                {r.title} · um {clockTime(r.due)} Uhr
              </Text>
            </VStack>
            <Button
              label="Abbrechen"
              variant="ghost"
              size="sm"
              isDisabled={busy === r.id}
              onClick={() => cancel(r.id)}
            />
          </HStack>
        ))}
      </VStack>
    </Card>
  );
}
