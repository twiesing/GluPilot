import { useEffect, useState } from "react";
import {
  Badge,
  Banner,
  Button,
  Card,
  Divider,
  HStack,
  Text,
  TextInput,
  VStack,
} from "@astryxdesign/core";
import { getConfig, getToken, setToken, type DosingConfig } from "../api";
import { demoConfig } from "../demo";
import { fmt } from "../format";
import { Masthead } from "../Masthead";

export function SettingsScreen({
  notice,
  onDismissNotice,
}: {
  notice: string;
  onDismissNotice: () => void;
}) {
  const [token, setTokenValue] = useState(getToken());
  const [saved, setSaved] = useState("");
  const [config, setConfig] = useState<DosingConfig | null>(null);

  useEffect(() => {
    let active = true;
    getConfig()
      .then((c) => active && setConfig(c))
      .catch(() => {
        if (active && import.meta.env.DEV) setConfig(demoConfig());
      });
    return () => {
      active = false;
    };
  }, []);

  function save() {
    const v = token.trim();
    setToken(v);
    setSaved(v ? "Token gespeichert." : "Token entfernt.");
  }

  return (
    <div className="screen">
      <Masthead />

      {notice && (
        <Banner
          status="warning"
          title={notice}
          isDismissable
          onDismiss={onDismissNotice}
        />
      )}

      <Card padding={4} className="elev">
        <VStack gap={2}>
          <Text type="label" color="accent">
            API-Token
          </Text>
          <Text type="supporting" size="sm">
            Schützt die Analyse- und Verlaufs-API. Leer lassen, wenn der Server
            ohne Token läuft.
          </Text>
          <TextInput
            label="Token"
            isLabelHidden
            type="password"
            value={token}
            onChange={setTokenValue}
            placeholder="Token einfügen"
          />
          <Button
            label="Sichern"
            variant="primary"
            onClick={save}
            style={{ width: "100%" }}
          />
          {saved && <Badge variant="success" label={saved} />}
        </VStack>
      </Card>

      <Card padding={4} className="elev">
        <VStack gap={1.5}>
          <Text type="label" color="accent">
            Deine Faktoren
          </Text>
          <HStack justify="between">
            <Text color="secondary">1 Broteinheit</Text>
            <Text className="metric">
              {config ? `${fmt(config.grams_per_be)} g KH` : "–"}
            </Text>
          </HStack>
          <HStack justify="between">
            <Text color="secondary">Insulin je BE</Text>
            <Text className="metric">
              {config ? `${fmt(config.factor_iu_per_be)} IE` : "–"}
            </Text>
          </HStack>
          <HStack justify="between">
            <Text color="secondary">Blutzucker-Ziel</Text>
            <Text className="metric">
              {config ? `${fmt(config.target_mgdl)} mg/dL` : "–"}
            </Text>
          </HStack>
          <HStack justify="between">
            <Text color="secondary">Korrekturfaktor</Text>
            <Text className="metric">
              {config ? `1 IE / ${fmt(config.isf_mgdl)} mg/dL` : "–"}
            </Text>
          </HStack>
          <HStack justify="between">
            <Text color="secondary">Korrektur ab</Text>
            <Text className="metric">
              {config ? `${fmt(config.correction_threshold_mgdl)} mg/dL` : "–"}
            </Text>
          </HStack>
          <Divider variant="subtle" />
          <Text type="supporting" size="xsm">
            Read-only – serverseitig per Umgebungsvariablen gesetzt.
          </Text>
        </VStack>
      </Card>

      <Card padding={4} variant="muted" className="elev">
        <Text type="supporting" size="sm">
          Automatische Schätzung – keine medizinische Beratung. Kohlenhydrate und
          Insulinvorschlag vor jeder Injektion selbst prüfen.
        </Text>
      </Card>
    </div>
  );
}
