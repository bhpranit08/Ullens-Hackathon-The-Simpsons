import { useState } from "react";
import { router } from "expo-router";
import { Linking, Platform } from "react-native";
import { useAuth } from "@/auth";
import { useAction, useResource } from "@/hooks/use-resource";
import { enableBackground } from "@/lib/tracking";
import { pushToken } from "@/lib/push";
import type { MailMessage, NotificationSettings } from "@/lib/types";
import {
  Screen,
  Card,
  Copy,
  Field,
  Button,
  ErrorMessage,
  Status,
} from "@/components/ui";
export default function Profile() {
  const { user, api, logout, refreshUser } = useAuth(),
    action = useAction(),
    settings = useResource<NotificationSettings>("/notifications/settings");
  const [name, setName] = useState(user?.name || ""),
    [message, setMessage] = useState(""),
    [mails, setMails] = useState<MailMessage[]>([]);
  return (
    <Screen title="Your safety settings">
      <Card title="Profile">
        <Field label="Name" value={name} onChangeText={setName} />
        <Copy>{user?.email}</Copy>
        <Status value={user?.verified ? "verified" : "unverified"} />
        {!user?.verified && (
          <Button label="Verify email" onPress={() => router.push("/verify")} />
        )}
        <Button
          label="Save name"
          variant="secondary"
          busy={action.busy}
          onPress={() =>
            void action.run(async () => {
              await api("/auth/profile", { name }, "PATCH");
              await refreshUser();
              setMessage("Profile updated.");
            })
          }
        />
      </Card>
      <Card title="Tracking">
        <Copy>
          {Platform.OS === "web"
            ? "Your browser tracks while this page is open. Use a mobile development build for tracking with the screen locked."
            : "Allow background location to keep sharing while your screen is locked. Force-closing the app can stop tracking."}
        </Copy>
        <Button
          label="Enable background tracking"
          variant="secondary"
          busy={action.busy}
          onPress={() =>
            void action.run(async () => {
              setMessage(await enableBackground());
            })
          }
        />
        {Platform.OS !== "web" && (
          <Button
            label="Open device settings"
            variant="secondary"
            onPress={() => void Linking.openSettings()}
          />
        )}
      </Card>
      <Card title="Alert delivery">
        <Copy>
          Email:{" "}
          {settings.data?.mode === "preview"
            ? "Local preview only — messages are not sent"
            : settings.data?.emailConfigured
              ? "Configured for provider delivery"
              : "Not configured"}
        </Copy>
        <Copy>
          Mobile push:{" "}
          {settings.data?.pushConfigured
            ? "Backend enabled"
            : "Backend not configured"}
        </Copy>
        <Button
          label="Enable push on this device"
          variant="secondary"
          busy={action.busy}
          onPress={() =>
            void action.run(async () => {
              const token = await pushToken();
              await api("/notifications/devices", {
                token,
                platform: Platform.OS,
              });
              setMessage("This device is registered for push alerts.");
            })
          }
        />
      </Card>
      {settings.data?.mode === "preview" && (
        <Card title="Local development mailbox">
          <Copy muted>Preview only. No email has been sent.</Copy>
          <Button
            label="Refresh email previews"
            variant="secondary"
            onPress={() =>
              void action.run(async () => {
                const data = await api<{ messages: MailMessage[] }>(
                  "/notifications/mail-preview",
                );
                setMails(data.messages);
              })
            }
          />
          {mails.map((m) => (
            <Card key={m.id} title={m.subject}>
              <Copy>{m.text}</Copy>
              <Button
                label="Open message link"
                variant="secondary"
                onPress={() => {
                  const token = m.text.split("token=")[1]?.trim();
                  if (m.subject.includes("Verify"))
                    router.push({ pathname: "/verify", params: { token } });
                  else if (m.subject.includes("Reset"))
                    router.push({
                      pathname: "/reset-password",
                      params: { token },
                    });
                  else router.push("/contacts");
                }}
              />
            </Card>
          ))}
        </Card>
      )}
      {message && <Copy>{message}</Copy>}
      <ErrorMessage message={action.error || settings.error} />
      <Button
        label="Sign out on all devices"
        variant="secondary"
        busy={action.busy}
        onPress={() =>
          void action.run(async () => {
            await logout();
            router.replace("/login");
          })
        }
      />
    </Screen>
  );
}
