const MAILHOG_API = "http://localhost:8025/api";

interface MailHogMessage {
  Content: {
    Body: string;
    Headers: Record<string, string[]>;
  };
}

interface MailHogSearchResponse {
  total: number;
  count: number;
  start: number;
  items: MailHogMessage[];
}

// Poll MailHog until an email arrives for the given recipient.
export async function waitForEmail(
  to: string,
  { timeout = 30_000, interval = 1_000 } = {},
): Promise<MailHogMessage> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const res = await fetch(
      `${MAILHOG_API}/v2/search?kind=to&query=${encodeURIComponent(to)}`,
    );

    if (res.ok) {
      const data: MailHogSearchResponse = await res.json();

      if (data.total > 0) {
        return data.items[0];
      }
    }

    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error(`No email received for ${to} within ${timeout}ms`);
}

// Extract the 6-digit OTP code from a MailHog message body.
export function extractOtp(message: MailHogMessage): string {
  const body = message.Content.Body;
  const match = body.match(/\b(\d{6})\b/);

  if (!match) {
    throw new Error("Could not extract OTP from email body");
  }

  return match[1];
}
