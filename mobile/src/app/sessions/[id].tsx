import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Linking, Text } from "react-native";
import { useAuth } from "@/auth";
import { useAction, useResource } from "@/hooks/use-resource";
import { makePing } from "@/lib/location-queue";
import {
  initialLocation,
  startTracking,
  stopTracking,
  trackingStatus,
} from "@/lib/tracking";
import type { SafetySession } from "@/lib/types";
import { TrailMap } from "@/components/trail-map";
import {
  Screen,
  Card,
  Copy,
  Status,
  Button,
  ErrorMessage,
  Loading,
  confirm,
} from "@/components/ui";
export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { user, api, token } = useAuth(),
    resource = useResource<{ session: SafetySession }>("/sessions/" + id, true),
    action = useAction(),
    [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const session = resource.data?.session,
    owner = session?.owner.id === user?.id;
  const act = (name: string) =>
    action.run(async () => {
      await api("/sessions/" + id + "/" + name, {});
      if (name === "complete" && owner) await stopTracking();
      await resource.refresh();
    });
  if (!session)
    return (
      <Screen title="Safety session">
        {resource.loading ? (
          <Loading />
        ) : (
          <>
            <ErrorMessage message={resource.error} />
            <Button label="Retry" onPress={() => void resource.refresh()} />
          </>
        )}
      </Screen>
    );
  const seconds = Math.max(
      0,
      Math.ceil((+new Date(session.nextCheckInDue) - now) / 1000),
    ),
    alert = session.events.find((e) => e.id === session.currentAlert),
    fresh = session.lastLocation?.observedAt
      ? Math.max(
          0,
          Math.floor((now - +new Date(session.lastLocation.observedAt)) / 1000),
        )
      : null;
  return (
    <Screen
      title={session.title}
      subtitle={
        (owner ? "Your " : session.owner.name + "’s ") +
        session.activityType.toLowerCase() +
        " safety session"
      }
    >
      <Card>
        <Status value={session.status} />
        <Copy>
          {session.trackingMode === "demo"
            ? "DEMO — simulated locations and alerts"
            : "Live device location sharing"}
        </Copy>
        {session.status !== "completed" && (
          <>
            <Text style={{ fontSize: 44, fontWeight: "800", color: "#256B4D" }}>
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </Text>
            <Copy muted>Until the next safety check-in</Copy>
          </>
        )}
        <Copy>
          Expected finish: {new Date(session.expectedEndTime).toLocaleString()}
        </Copy>
        <Copy>Trusted contact: {session.contact.name}</Copy>
        {alert && (
          <>
            <Copy>
              {alert.type.replaceAll("_", " ")} ·{" "}
              {new Date(alert.createdAt).toLocaleString()}
            </Copy>
            <Copy>
              {alert.acknowledged
                ? "Acknowledged at " +
                  new Date(
                    alert.acknowledgedAt || alert.createdAt,
                  ).toLocaleString()
                : "Waiting for contact acknowledgement"}
            </Copy>
          </>
        )}
      </Card>
      <Card title="Last known location">
        <TrailMap location={session.lastLocation} route={session.locations} />
        <Copy>
          {session.lastLocation
            ? session.lastLocation.lat.toFixed(5) +
              ", " +
              session.lastLocation.lng.toFixed(5)
            : "No location available"}
        </Copy>
        <Copy muted>
          {fresh === null
            ? "Location freshness unavailable"
            : "Observed " +
              fresh +
              " seconds ago" +
              (fresh > 120 ? " — location may be stale" : "")}
          {session.lastLocation?.accuracy !== undefined
            ? " · accuracy ±" + Math.round(session.lastLocation.accuracy) + " m"
            : ""}
        </Copy>
        {owner &&
          session.trackingMode === "live" &&
          session.status !== "completed" && (
            <>
              <Copy muted>{trackingStatus()}</Copy>
              <Button
                label="Resume live tracking"
                variant="secondary"
                busy={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    await initialLocation();
                    if (token) await startTracking(id, token);
                  })
                }
              />
            </>
          )}
      </Card>
      <ErrorMessage message={action.error || resource.error} />
      {session.status !== "completed" &&
        (owner ? (
          <Card title="Safety actions">
            <Button
              label="I am safe — check in"
              busy={action.busy}
              onPress={() => void act("check-in")}
            />
            <Button
              label="SOS — alert my trusted contact"
              variant="danger"
              busy={action.busy}
              onPress={() =>
                void action.run(async () => {
                  if (
                    !(await confirm(
                      "Send SOS?",
                      "Your trusted contact will receive a safety alert through configured channels.",
                    ))
                  )
                    return;
                  await api("/sessions/" + id + "/sos", {});
                  await resource.refresh();
                })
              }
            />
            <Button
              label="Extend expected finish by one hour"
              variant="secondary"
              busy={action.busy}
              onPress={() =>
                void action.run(async () => {
                  await api(
                    "/sessions/" + id,
                    {
                      expectedEndTime: new Date(
                        Math.max(now, +new Date(session.expectedEndTime)) +
                          3600000,
                      ).toISOString(),
                    },
                    "PATCH",
                  );
                  await resource.refresh();
                })
              }
            />
            <Button
              label="Finish safely"
              variant="secondary"
              busy={action.busy}
              onPress={() =>
                void action.run(async () => {
                  if (
                    !(await confirm(
                      "Finish this activity?",
                      "This closes the safety session and stops location sharing.",
                    ))
                  )
                    return;
                  await api("/sessions/" + id + "/complete", {});
                  await stopTracking();
                  await resource.refresh();
                })
              }
            />
            {session.trackingMode === "demo" && (
              <>
                <Button
                  label="Demo: move to next location"
                  variant="secondary"
                  busy={action.busy}
                  onPress={() =>
                    void action.run(async () => {
                      const p = session.lastLocation!;
                      await api("/sessions/" + id + "/location", {
                        location: makePing(
                          p.lat + 0.001,
                          p.lng + 0.001,
                          "simulated",
                        ),
                      });
                      await resource.refresh();
                    })
                  }
                />
                <Button
                  label="Demo: miss check-in"
                  variant="secondary"
                  busy={action.busy}
                  onPress={() => void act("simulate-miss")}
                />
              </>
            )}
          </Card>
        ) : (
          <Card title="Trusted-contact response">
            <Copy>
              Try to reach {session.owner.name}. Use the last known location and
              its timestamp when coordinating help. TrailGuard does not contact
              emergency services.
            </Copy>
            <Button
              label="Contact athlete by email"
              variant="secondary"
              onPress={() =>
                void Linking.openURL("mailto:" + session.owner.email)
              }
            />
            {alert && (
              <Button
                label={
                  alert.acknowledged
                    ? "Alert acknowledged"
                    : "Acknowledge — I am responding"
                }
                busy={action.busy}
                disabled={alert.acknowledged}
                onPress={() => void act("acknowledge")}
              />
            )}
          </Card>
        ))}
      {session.deliveries.length > 0 && (
        <Card title="Alert delivery status">
          {session.deliveries.map((d) => (
            <Copy key={d.id}>
              {d.channel}:{" "}
              {d.status === "accepted"
                ? "Provider accepted (recipient delivery not confirmed)"
                : d.status === "receipt_ok"
                  ? "Push service receipt OK"
                  : d.status === "preview"
                    ? "Local preview only — not sent"
                    : d.status}
              {d.error ? " · " + d.error : ""}
            </Copy>
          ))}
        </Card>
      )}
      <Card title="Session timeline">
        {[...session.events].reverse().map((e) => (
          <Copy key={e.id}>
            {e.type.replaceAll("_", " ")} ·{" "}
            {new Date(e.createdAt).toLocaleString()}
            {e.acknowledged ? " · acknowledged" : ""}
          </Copy>
        ))}
      </Card>
    </Screen>
  );
}
