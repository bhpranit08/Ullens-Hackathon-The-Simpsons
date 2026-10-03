import { useState } from "react";
import { router } from "expo-router";
import { request } from "@/lib/api";
import { useAction } from "@/hooks/use-resource";
import {
  Screen,
  Card,
  Copy,
  Field,
  Button,
  ErrorMessage,
} from "@/components/ui";
export default function ForgotPassword() {
  const [email, setEmail] = useState(""),
    [message, setMessage] = useState(""),
    action = useAction();
  return (
    <Screen title="Recover your account">
      <Card>
        <Field
          label="Account email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <ErrorMessage message={action.error} />
        {message && <Copy>{message}</Copy>}
        <Button
          label="Send reset link"
          busy={action.busy}
          onPress={() =>
            void action.run(async () => {
              const result = await request<{ message: string }>(
                "/auth/forgot-password",
                { body: { email } },
              );
              setMessage(result.message);
            })
          }
        />
        <Button
          label="Back to sign in"
          variant="secondary"
          onPress={() => router.replace("/login")}
        />
      </Card>
    </Screen>
  );
}
