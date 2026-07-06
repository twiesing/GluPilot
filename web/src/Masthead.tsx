import { HStack, Text } from "@astryxdesign/core";
import { LogoMark } from "./icons";

/** Konsistenter Brand-Header. Der aktive Screen wird vom Bottom-Nav benannt. */
export function Masthead() {
  return (
    <HStack gap={1.5} vAlign="center">
      <LogoMark size={30} />
      <Text size="lg" weight="semibold" className="wordmark">
        GluPilot
      </Text>
    </HStack>
  );
}
