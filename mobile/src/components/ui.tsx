import type { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
export const colors = {
  ink: "#18352B",
  muted: "#63756A",
  green: "#256B4D",
  cream: "#F5F5ED",
  white: "#FFFFFF",
  line: "#DFE5DA",
  red: "#B33432",
  amber: "#93620C",
};
export function Screen({
  children,
  title,
  subtitle,
}: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.page}
        >
          <Text style={styles.brand}>TRAILGUARD / MOVE FREELY</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Card({
  children,
  title,
}: PropsWithChildren<{ title?: string }>) {
  return (
    <View style={styles.card}>
      {title && <Text style={styles.heading}>{title}</Text>}
      {children}
    </View>
  );
}
export function Copy({
  children,
  muted = false,
}: PropsWithChildren<{ muted?: boolean }>) {
  return (
    <Text style={[styles.copy, muted && { color: colors.muted }]}>
      {children}
    </Text>
  );
}
export function Button({
  label,
  onPress,
  busy = false,
  disabled = false,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.secondary,
        variant === "danger" && { backgroundColor: colors.red },
        (pressed || disabled || busy) && { opacity: 0.55 },
      ]}
    >
      {busy ? (
        <ActivityIndicator
          color={variant === "secondary" ? colors.green : "#fff"}
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === "secondary" && { color: colors.green },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#89948C"
        {...props}
        style={[
          styles.input,
          props.multiline && { height: 110, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
}
export function Choices({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.wrap}>
        {options.map((option) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: option === value }}
            key={option}
            onPress={() => onChange(option)}
            style={[
              styles.chip,
              option === value && {
                backgroundColor: colors.green,
                borderColor: colors.green,
              },
            ]}
          >
            <Text
              style={{
                color: option === value ? "#fff" : colors.ink,
                fontWeight: "600",
              }}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function Status({ value }: { value: string }) {
  const danger = ["sos", "alerting"].includes(value);
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: danger ? "#FDEBE7" : "#E8F0E5" },
      ]}
    >
      <Text
        style={{ color: danger ? colors.red : colors.green, fontWeight: "800" }}
      >
        {value.replaceAll("_", " ").toUpperCase()}
      </Text>
    </View>
  );
}
export function ErrorMessage({ message }: { message?: string }) {
  return message ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  ) : null;
}
export function Loading() {
  return <ActivityIndicator style={{ padding: 30 }} color={colors.green} />;
}
export async function confirm(title: string, message: string) {
  if (Platform.OS === "web") return window.confirm(title + "\n\n" + message);
  return new Promise<boolean>((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Confirm", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  page: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    padding: 22,
    paddingBottom: 40,
    gap: 18,
  },
  brand: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    color: colors.green,
    marginTop: 5,
  },
  title: { fontSize: 32, fontWeight: "800", color: colors.ink },
  subtitle: { fontSize: 15, lineHeight: 23, color: colors.muted },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  heading: { fontSize: 19, color: colors.ink, fontWeight: "800" },
  copy: { color: colors.ink, fontSize: 15, lineHeight: 23 },
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 13,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.green,
    borderRadius: 12,
  },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  secondary: {
    backgroundColor: "#EDF2E8",
    borderWidth: 1,
    borderColor: colors.line,
  },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#FAFBF7",
    color: colors.ink,
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    padding: 11,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  error: { color: colors.red, lineHeight: 22 },
});
