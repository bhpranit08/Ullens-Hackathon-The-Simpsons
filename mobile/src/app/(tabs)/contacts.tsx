import { useState } from "react";
import { useAuth } from "@/auth";
import { useAction, useResource } from "@/hooks/use-resource";
import type { Contact } from "@/lib/types";
import {
  Screen,
  Card,
  Copy,
  Status,
  Field,
  Button,
  ErrorMessage,
  Loading,
  confirm,
} from "@/components/ui";
export default function Contacts() {
  const { api, user } = useAuth(),
    resource = useResource<{ contacts: Contact[]; invitations: Contact[] }>(
      "/contacts",
      true,
    ),
    action = useAction();
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [message, setMessage] = useState("");
  const respond = (id: string, response: string) =>
    action.run(async () => {
      await api("/contacts/" + id + "/" + response, {});
      await resource.refresh();
    });
  return (
    <Screen
      title="Your safety team"
      subtitle="Invite people you trust. They choose whether to accept."
    >
      <Card title="Invite a trusted contact">
        <Field label="Name (optional)" value={name} onChangeText={setName} />
        <Field
          label="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Button
          label="Send invitation"
          disabled={!user?.verified}
          busy={action.busy}
          onPress={() =>
            void action.run(async () => {
              await api("/contacts", { name, email });
              setEmail("");
              setName("");
              setMessage(
                "Invitation created. Ask your contact to register, verify their email, and accept in Contacts.",
              );
              await resource.refresh();
            })
          }
        />
        {!user?.verified && (
          <Copy muted>Verify your email before inviting a contact.</Copy>
        )}
        {message && <Copy>{message}</Copy>}
      </Card>
      <ErrorMessage message={action.error || resource.error} />
      {resource.loading && <Loading />}
      {resource.data?.invitations.map((c) => (
        <Card key={c.id} title={"Invitation from " + c.owner?.name}>
          <Copy>
            {c.owner?.email} wants you to receive their safety updates.
          </Copy>
          <Button
            label="Accept invitation"
            disabled={!user?.verified}
            busy={action.busy}
            onPress={() => void respond(c.id, "accept")}
          />
          <Button
            label="Decline"
            variant="secondary"
            busy={action.busy}
            onPress={() => void respond(c.id, "decline")}
          />
        </Card>
      ))}
      {!resource.loading && !resource.data?.contacts.length && (
        <Card>
          <Copy>
            No trusted contacts yet. Add someone above to get started.
          </Copy>
        </Card>
      )}
      {resource.data?.contacts.map((c) => (
        <Card key={c.id} title={c.name}>
          <Copy>{c.email}</Copy>
          <Status value={c.status} />
          {c.status === "pending" && (
            <Copy muted>
              Waiting for this person to accept. Registration alone does not
              activate sharing.
            </Copy>
          )}
          <Button
            label="Remove contact"
            variant="secondary"
            busy={action.busy}
            onPress={() =>
              void action.run(async () => {
                if (
                  !(await confirm(
                    "Remove contact?",
                    "This person will lose access to your shared sessions.",
                  ))
                )
                  return;
                await api("/contacts/" + c.id, undefined, "DELETE");
                await resource.refresh();
              })
            }
          />
        </Card>
      ))}
    </Screen>
  );
}
