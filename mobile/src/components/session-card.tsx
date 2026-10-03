import { router } from "expo-router";
import { Card, Copy, Status, Button } from "@/components/ui";
import type { SafetySession } from "@/lib/types";
export function SessionCard({
  session,
  contactView = false,
}: {
  session: SafetySession;
  contactView?: boolean;
}) {
  return (
    <Card title={session.title}>
      <Status value={session.status} />
      <Copy>
        {contactView ? session.owner.name + " · " : ""}
        {session.activityType} ·{" "}
        {session.trackingMode === "demo"
          ? "Simulated location"
          : "Live location"}
      </Copy>
      <Copy muted>
        Expected home: {new Date(session.expectedEndTime).toLocaleString()}
      </Copy>
      <Button
        label={contactView ? "View safety response" : "Open session"}
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: "/sessions/[id]",
            params: { id: session.id },
          })
        }
      />
    </Card>
  );
}
