import { router } from "expo-router";
import { useAuth } from "@/auth";
import { useResource } from "@/hooks/use-resource";
import type { Contact, SafetySession } from "@/lib/types";
import {
  Screen,
  Card,
  Copy,
  Button,
  ErrorMessage,
  Loading,
} from "@/components/ui";
import { SessionCard } from "@/components/session-card";
export default function Home() {
  const { user } = useAuth();
  const resource = useResource<{ sessions: SafetySession[] }>(
      "/sessions",
      true,
    ),
    contacts = useResource<{ contacts: Contact[]; invitations: Contact[] }>(
      "/contacts",
      true,
    );
  const own =
    resource.data?.sessions.filter(
      (s) => s.owner.id === user?.id && s.status !== "completed",
    ) || [];
  const watching =
    resource.data?.sessions.filter(
      (s) => s.owner.id !== user?.id && s.status !== "completed",
    ) || [];
  const accepted = contacts.data?.contacts.some((c) => c.status === "accepted");
  return (
    <Screen
      title={"Hi, " + user?.name.split(" ")[0] + "."}
      subtitle="Move freely. Get home safely."
    >
      {!user?.verified && (
        <Card title="First, confirm your email">
          <Copy>
            Verify your address to invite a trusted contact and start an
            activity.
          </Copy>
          <Button label="Verify email" onPress={() => router.push("/verify")} />
        </Card>
      )}
      {user?.verified && !accepted && (
        <Card title="Who has your back?">
          <Copy>
            Add a trusted contact. They’ll accept your invitation before
            receiving your live safety updates.
          </Copy>
          <Button
            label="Set up trusted contact"
            onPress={() => router.push("/contacts")}
          />
        </Card>
      )}
      {!!contacts.data?.invitations.length && (
        <Card title="Someone wants you on their safety team">
          <Copy>
            You have {contacts.data.invitations.length} invitation(s) to review.
          </Copy>
          <Button
            label="Review invitations"
            onPress={() => router.push("/contacts")}
          />
        </Card>
      )}
      {own.length ? (
        own.map((s) => <SessionCard key={s.id} session={s} />)
      ) : (
        <Card title="Ready for your next adventure?">
          <Copy>
            Create a safety plan, choose a trusted contact, and set your next
            check-in.
          </Copy>
          <Button
            label="Start a safety session"
            disabled={!user?.verified || !accepted}
            onPress={() => router.push("/sessions/new")}
          />
        </Card>
      )}
      <ErrorMessage message={resource.error || contacts.error} />
      {resource.loading && <Loading />}
      {!!resource.error && (
        <Button
          label="Retry"
          variant="secondary"
          onPress={() => void resource.refresh()}
        />
      )}
      {watching.length > 0 && <Copy>People you’re looking out for</Copy>}
      {watching.map((s) => (
        <SessionCard key={s.id} session={s} contactView />
      ))}
      <Card title="Before you head out">
        <Copy>
          Check route conditions, charge your phone, and choose a realistic
          finish time. Your contact can see only the sessions you share with
          them.
        </Copy>
        <Button
          label="Explore community hazards"
          variant="secondary"
          onPress={() => router.push("/map")}
        />
      </Card>
    </Screen>
  );
}
