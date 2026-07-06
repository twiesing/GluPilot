import { Button, Card, HStack, Text, VStack } from "@astryxdesign/core";
import type { Reminder } from "./api";
import { clockTime } from "./format";

export function ActiveReminders({
  reminders,
  onCancel,
}: {
  reminders: Reminder[];
  onCancel: (id: string) => void;
}) {
  if (reminders.length === 0) return null;

  return (
    <Card padding={3} className="elev">
      <VStack gap={2}>
        <Text type="label" color="accent">
          Laufende Erinnerungen
        </Text>
        {reminders.map((r) => (
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
              onClick={() => onCancel(r.id)}
            />
          </HStack>
        ))}
      </VStack>
    </Card>
  );
}
