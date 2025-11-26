import { z } from "zod";

const FINGERPRINT_SECRET_KEY = process.env.FINGERPRINT_SECRET_KEY;

const eventResponseSchema = z.object({
  identification: z.object({
    visitor_id: z.string(),
    visitor_found: z.boolean(),
  }),
});

export async function getVerifiedVisitorId(requestId: string | null) {
  if (!FINGERPRINT_SECRET_KEY) {
    throw new Error("[Fingerprint] Secret API key not configured");
  }

  if (!requestId) {
    return {
      visitorId: null,
      isValid: false,
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

    console.log("eventData", eventData)

    if (!response.ok) {
      console.error("[Fingerprint]", {
        status: response.status,
        statusText: response.statusText,
        requestId,
        error: eventData,
      });

      return {
        visitorId: null,
        isValid: false,
      };
    }

    const { identification } = eventResponseSchema.parse(eventData);

    return {
      visitorId: identification.visitor_id,
      isValid: identification.visitor_found,
    };
  } catch (error) {
    console.error("[Fingerprint] Error fetching visitor ID.", error);

    return {
      visitorId: null,
      isValid: false,
    };
  }
}
