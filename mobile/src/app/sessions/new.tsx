import { useState } from "react";
import { router } from "expo-router";
import { useAuth } from "@/auth";
import { useAction, useResource } from "@/hooks/use-resource";
import { initialLocation, startTracking } from "@/lib/tracking";
import type { Contact, SafetySession } from "@/lib/types";
import {
  Screen,
  Card,
  Copy,
  Choices,
  Field,
  Button,
  ErrorMessage,
  Loading,
} from "@/components/ui";
export default function NewSession() {
  const { api, token } = useAuth(),
    contacts = useResource<{ contacts: Contact[] }>("/contacts"),
    action = useAction();
  const [activity, setActivity] = useState("Cycling"),
    [title, setTitle] = useState(""),
    [duration, setDuration] = useState("120"),
    [interval, setIntervalValue] = useState("15"),
    [contactId, setContactId] = useState(""),
    [mode, setMode] = useState("Live"),
    [consent, setConsent] = useState(false),
    [startedAt] = useState(() => Date.now());
  const accepted =
    contacts.data?.contacts.filter((c) => c.status === "accepted") || [];
  return (
    <Screen
      title="Make a safety plan"
      subtitle="Choose who’s looking out for you and when they should expect a check-in."
    >
      <Card>
        <Choices
          label="Activity"
          options={["Cycling", "Running", "Trekking"]}
          value={activity}
          onChange={setActivity}
        />
        <Field
          label="Activity title / route area"
          placeholder="e.g. Shivapuri morning ride"
          value={title}
          onChangeText={setTitle}
        />
        <Field
          label="Expected finish — minutes from now"
          keyboardType="number-pad"
          value={duration}
          onChangeText={setDuration}
        />
        <Field
          label="Check-in interval — minutes"
          keyboardType="number-pad"
          value={interval}
          onChangeText={setIntervalValue}
        />
        <Copy>
          Expected home:{" "}
          {Number(duration) > 0
            ? new Date(startedAt + Number(duration) * 60000).toLocaleString()
            : "Choose a duration"}
        </Copy>
        {contacts.loading && <Loading />}
        {accepted.length ? (
          <Choices
            label="Trusted contact"
            options={accepted.map((c) => c.name + " · " + c.email)}
            value={
              accepted.find((c) => c.id === contactId)?.name +
              " · " +
              accepted.find((c) => c.id === contactId)?.email
            }
            onChange={(value) =>
              setContactId(
                accepted.find((c) => c.name + " · " + c.email === value)!.id,
              )
            }
          />
        ) : (
          <>
            <Copy>No accepted contacts yet.</Copy>
            <Button
              label="Add a trusted contact"
              variant="secondary"
              onPress={() => router.push("/contacts")}
            />
          </>
        )}
        <Choices
          label="Tracking mode"
          options={["Live", "Demo (simulated)"]}
          value={mode}
          onChange={setMode}
        />
        <Copy muted>
          {mode === "Live"
            ? "Device location will be shared only with your selected contact. Background tracking depends on your permissions and mobile build."
            : "Demo mode uses simulated Kathmandu coordinates and simulated alerts."}
        </Copy>
        <Button
          label={
            consent
              ? "✓ I agree to share this session location"
              : "Agree to share location with my selected contact"
          }
          variant="secondary"
          onPress={() => setConsent(!consent)}
        />
        <ErrorMessage message={action.error || contacts.error} />
        <Button
          label="Start my activity"
          busy={action.busy}
          disabled={!consent || !contactId}
          onPress={() =>
            void action.run(async () => {
              if (!Number.isFinite(Number(duration)) || Number(duration) <= 0)
                throw new Error("Choose a future expected finish.");
              const location =
                mode === "Live" ? await initialLocation() : undefined;
              const { session } = await api<{ session: SafetySession }>(
                "/sessions",
                {
                  title,
                  activityType: activity,
                  expectedEndTime: new Date(
                    Date.now() + Number(duration) * 60000,
                  ).toISOString(),
                  checkInMinutes: Number(interval),
                  contactId,
                  trackingMode: mode === "Live" ? "live" : "demo",
                  sharingConsent: consent,
                  location,
                },
              );
              if (mode === "Live" && token)
                await startTracking(session.id, token).catch(() => {});
              router.replace({
                pathname: "/sessions/[id]",
                params: { id: session.id },
              });
            })
          }
        />
      </Card>
    </Screen>
  );
}
