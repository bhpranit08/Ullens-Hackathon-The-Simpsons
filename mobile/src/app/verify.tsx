import { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/auth";
import { request } from "@/lib/api";
import { useAction } from "@/hooks/use-resource";
import type { MailMessage } from "@/lib/types";
import {
  Screen,
  Card,
  Copy,
  Field,
  Button,
  ErrorMessage,
} from "@/components/ui";
export default function Verify() {
  const params = useLocalSearchParams<{ token?: string }>(),
    { user, api, refreshUser } = useAuth(),
    action = useAction();
  const [token, setToken] = useState(params.token || ""),
    [done, setDone] = useState(false),
    [message, setMessage] = useState(""),
    [mails, setMails] = useState<MailMessage[]>([]),
    started = useRef(false);
  const verify = useCallback(
    async (value: string) => {
      await request("/auth/verify", { body: { token: value } });
      if (user) await refreshUser();
      setDone(true);
    },
    [user, refreshUser],
  );
  useEffect(() => {
    if (params.token && !started.current) {
      started.current = true;
      void action.run(() => verify(params.token!));
    }
  }, [params.token, action, verify]);
  return (
    <Screen
      title="Verify your email"
      subtitle="Confirm your address before sharing your activity with trusted contacts."
    >
      <Card>
        {done || user?.verified ? (
          <>
            <Copy>Email verified. You’re ready to make a safety plan.</Copy>
            <Button
              label={user ? "Continue to TrailGuard" : "Sign in"}
              onPress={() => router.replace(user ? "/" : "/login")}
            />
          </>
        ) : (
          <>
            <Copy>
              Open the verification link sent to{" "}
              {user?.email || "your email address"}. Delivery requires
              configured email service.
            </Copy>
            <Field
              label="Verification token"
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
            />
            <Button
              label="Verify email"
              disabled={!token}
              busy={action.busy}
              onPress={() => void action.run(() => verify(token))}
            />
            {user && (
              <>
                <Button
                  label="Resend verification email"
                  variant="secondary"
                  busy={action.busy}
                  onPress={() =>
                    void action.run(async () => {
                      await api("/auth/resend-verification", {});
                      setMessage(
                        "Verification email queued. Check your inbox or local preview.",
                      );
                    })
                  }
                />
                <Button
                  label="Open local email preview"
                  variant="secondary"
                  onPress={() =>
                    void action.run(async () => {
                      const data = await api<{ messages: MailMessage[] }>(
                        "/notifications/mail-preview",
                      );
                      setMails(data.messages);
                      setMessage(
                        "Local development preview: these messages have not been sent.",
                      );
                    })
                  }
                />
                {mails
                  .filter((m) => m.subject.includes("Verify"))
                  .map((m) => (
                    <Button
                      key={m.id}
                      label="Use local verification link"
                      variant="secondary"
                      onPress={() =>
                        void action.run(() =>
                          verify(m.text.split("token=")[1]?.trim() || ""),
                        )
                      }
                    />
                  ))}
                <Button
                  label="Back to dashboard"
                  variant="secondary"
                  onPress={() => router.replace("/")}
                />
              </>
            )}
          </>
        )}
        {message && <Copy muted>{message}</Copy>}
        <ErrorMessage message={action.error} />
      </Card>
    </Screen>
  );
}
