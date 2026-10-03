import { useResource } from "@/hooks/use-resource";
import type { SafetySession } from "@/lib/types";
import {
  Screen,
  Card,
  Copy,
  ErrorMessage,
  Loading,
  Button,
} from "@/components/ui";
import { SessionCard } from "@/components/session-card";
export default function History() {
  const resource = useResource<{ sessions: SafetySession[] }>("/sessions"),
    sessions =
      resource.data?.sessions.filter((s) => s.status === "completed") || [];
  return (
    <Screen
      title="Past adventures"
      subtitle="Your completed safety sessions and the people who had your back."
    >
      <ErrorMessage message={resource.error} />
      {resource.loading ? (
        <Loading />
      ) : sessions.length ? (
        sessions.map((s) => <SessionCard key={s.id} session={s} />)
      ) : (
        <Card>
          <Copy>
            No completed sessions yet. Finish your first activity safely and it
            will appear here.
          </Copy>
        </Card>
      )}
      {resource.error && (
        <Button label="Retry" onPress={() => void resource.refresh()} />
      )}
    </Screen>
  );
}
