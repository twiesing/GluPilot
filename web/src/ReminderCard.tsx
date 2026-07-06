import { useState } from "react";
import { Button, Card, HStack, Text, VStack } from "@astryxdesign/core";
import { scheduleReminder, type AnalyzeResult } from "./api";
import { fmt } from "./format";

export function ReminderCard({ d }: { d: AnalyzeResult }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function schedule(
    minutes: number,
    title: string,
    body: string,
    note: string,
  ) {
    setBusy(true);
    setStatus("");
    try {
      await scheduleReminder(minutes, title, body);
      setStatus(note);
    } catch {
      setStatus("Konnte Erinnerung nicht setzen.");
    } finally {
      setBusy(false);
    }
  }

  const split = d.split_recommended ? d.split : null;

  return (
    <Card padding={4} className="elev">
      <VStack gap={2}>
        <Text type="label" color="accent">
          Erinnerung
        </Text>

        {split && (
          <Button
            label={`In ${split.delay_hours} h an 2. Bolus-Teil erinnern`}
            variant="primary"
            isDisabled={busy}
            onClick={() =>
              schedule(
                split.delay_hours * 60,
                "2. Bolus-Teil fällig",
                `${fmt(split.later_units)} IE nachspritzen`,
                `Erinnerung in ${split.delay_hours} h gesetzt.`,
              )
            }
            style={{ width: "100%" }}
          />
        )}

        <HStack gap={2}>
          {[
            [30, "30 min"],
            [60, "60 min"],
            [120, "2 h"],
          ].map(([m, label]) => (
            <Button
              key={m}
              label={String(label)}
              variant="secondary"
              size="sm"
              isDisabled={busy}
              onClick={() =>
                schedule(
                  Number(m),
                  "Blutzucker prüfen",
                  "Erinnerung von GluPilot",
                  `Erinnerung in ${label} gesetzt.`,
                )
              }
              style={{ flex: 1 }}
            />
          ))}
        </HStack>

        {status && (
          <Text type="supporting" size="sm">
            {status}
          </Text>
        )}
      </VStack>
    </Card>
  );
}
