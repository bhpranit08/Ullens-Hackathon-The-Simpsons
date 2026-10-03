export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export const apiUrl = (
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
export async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl + path, {
      method: options.method || (options.body !== undefined ? "POST" : "GET"),
      signal: options.signal || AbortSignal.timeout(15000),
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.token ? { Authorization: "Bearer " + options.token } : {}),
      },
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
    });
  } catch {
    throw new ApiError(
      "Cannot reach TrailGuard. Check your connection and API address.",
      0,
    );
  }
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      data?.message || "Unable to complete that request.",
      response.status,
    );
  if (!data)
    throw new ApiError("The server returned an invalid response.", 502);
  return data as T;
}
