export async function pushToken(): Promise<string> {
  throw new Error(
    "Browser alerts use email and the in-app inbox. Mobile push requires the native app.",
  );
}
export function listenForPush(_open: (sessionId: string) => void) {
  return () => {};
}
