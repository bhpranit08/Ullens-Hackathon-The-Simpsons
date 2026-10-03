import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
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
export default function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string }>(),
    [password, setPassword] = useState(""),
    [done, setDone] = useState(false),
    action = useAction();
  return (
    <Screen title="Choose a new password">
      <Card>
        {done ? (
          <>
            <Copy>Your password has been updated.</Copy>
            <Button label="Sign in" onPress={() => router.replace("/login")} />
          </>
        ) : (
          <>
            <Field
              label="New password (at least 8 characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <ErrorMessage message={action.error} />
            <Button
              label="Update password"
              busy={action.busy}
              onPress={() =>
                void action.run(async () => {
                  await request("/auth/reset-password", {
                    body: { token: params.token, password },
                  });
                  setDone(true);
                })
              }
            />
          </>
        )}
      </Card>
    </Screen>
  );
}
