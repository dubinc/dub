// Edge-compatible HTTP client
export async function edgeHttpClient<T>(
  url: string,
  method: string,
  headers: Record<string, string | undefined>,
  body?: any,
  enableLogging: boolean = false,
): Promise<T> {
  try {
    const sanitizedHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined) {
        sanitizedHeaders[key] = value;
      }
    }

    if (enableLogging) {
      console.log("🔍 [EdgeHttpClient] Making request:", {
        url,
        method,
        headers: sanitizedHeaders,
      });
    }

    const response = await fetch(url, {
      method,
      headers: sanitizedHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (enableLogging) {
      console.log("🔍 [EdgeHttpClient] Response:", data);
    }

    return data;
  } catch (error: any) {
    if (enableLogging) {
      console.log("🔍 [EdgeHttpClient] Error:", error.message);
    }
    throw error;
  }
}
