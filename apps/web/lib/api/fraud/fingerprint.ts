import { z } from "zod";

const FINGERPRINT_SECRET_KEY = process.env.FINGERPRINT_SECRET_KEY;

const eventResponseSchema = z.object({
  identification: z.object({
    visitor_id: z.string(),
    visitor_found: z.boolean(),
  }),
  ip_info: z.object({
    v4: z.object({
      geolocation: z.object({
        country_code: z.string().nullable(),
      }),
    }),
  }),
});

type FingerprintVisitorResponse =
  | { visitorId: string; visitorCountry: string | null; status: "valid" }
  | { visitorId: null; visitorCountry?: never; status: "not_found" }
  | { visitorId: null; visitorCountry?: never; status: "error" };

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

    const { identification, ip_info: ipInfo } =
      eventResponseSchema.parse(eventData);

    return {
      visitorId: identification.visitor_id,
      visitorCountry: ipInfo.v4.geolocation.country_code,
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
