import { z } from "zod";

const FINGERPRINT_SECRET_KEY = process.env.FINGERPRINT_SECRET_KEY;

const eventResponseSchema = z.object({
  identification: z.object({
    visitor_id: z.string(),
    visitor_found: z.boolean(),
  }),
});

type FingerprintVisitorResponse =
  | { visitorId: string; status: "valid" }
  | { visitorId: null; status: "not_found" }
  | { visitorId: null; status: "error" };

// Fetches visitor fingerprint data from the Fingerprint API.
// If the Fingerprint API is unavailable, we return an error status but do not block the onboarding process.
export async function fetchVisitorFingerprint(
  requestId: string | null,
): Promise<FingerprintVisitorResponse> {
  if (!FINGERPRINT_SECRET_KEY) {
    throw new Error("[Fingerprint] Secret API key not configured");
  }

  if (!requestId) {
    return {
      visitorId: null,
      status: "not_found",
    };
  }

  try {
    const response = await fetch(`https://api.fpjs.io/v4/events/${requestId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FINGERPRINT_SECRET_KEY}`,
      },
    });

    const eventData = await response.json();

    if (!response.ok) {
      console.error("[Fingerprint]", {
        status: response.status,
        statusText: response.statusText,
        requestId,
        error: eventData,
      });

      if (response.status >= 500) {
        throw new Error(response.statusText);
      }

      // Could be invalid request ID
      return {
        visitorId: null,
        status: "not_found",
      };
    }

    const { identification } = eventResponseSchema.parse(eventData);

    return {
      visitorId: identification.visitor_id,
      status: "valid",
    };
  } catch (error) {
    console.error("[Fingerprint] Error fetching visitor ID.", error);

    return {
      visitorId: null,
      status: "error",
    };
  }
}
