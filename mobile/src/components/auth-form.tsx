import { useState } from "react";
import { router } from "expo-router";
import { useAuth } from "@/auth";
import { useAction } from "@/hooks/use-resource";
import {
  Screen,
  Card,
  Copy,
  Field,
  Button,
  ErrorMessage,
} from "@/components/ui";
export function AuthForm({ register = false }: { register?: boolean }) {
  const auth = useAuth(),
    action = useAction();
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  return (
    <Screen
      title={register ? "Your next adventure, safer." : "Welcome back."}
      subtitle="A safety plan for you. Peace of mind for the people waiting at home."
    >
      <Card title={register ? "Create your account" : "Sign in"}>
        {register && (
          <Field
            label="Your name"
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />
        )}
        <Field
          label="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={register ? "new-password" : "current-password"}
        />
        <ErrorMessage message={action.error} />
        <Button
          label={register ? "Create account" : "Sign in"}
          busy={action.busy}
          onPress={() =>
            void action.run(async () => {
              if (register) await auth.register(name, email.trim(), password);
              else await auth.login(email.trim(), password);
              router.replace(register ? "/verify" : "/");
            })
          }
        />
        <Button
          label={
            register
              ? "Already registered? Sign in"
              : "New here? Create an account"
          }
          variant="secondary"
          onPress={() => router.replace(register ? "/login" : "/register")}
        />
        {!register && (
          <Button
            label="Forgot password?"
            variant="secondary"
            onPress={() => router.push("/forgot-password")}
          />
        )}
      </Card>
      <Copy muted>
        Location sharing starts only when you choose a contact and begin a
        safety session.
      </Copy>
    </Screen>
  );
}
