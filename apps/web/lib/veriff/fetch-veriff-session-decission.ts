import { veriffDecisionEventSchema } from "./schema";

// GET /v1/sessions/{sessionId}/decision
export async function fetchVeriffSessionDecision(sessionId: string) {
  const apiKey = process.env.VERIFF_API_KEY;

  if (!apiKey) {
    throw new Error("VERIFF_API_KEY is not configured.");
  }

  const rawResponse = await fetch(
    `https://stationapi.veriff.com/v1/sessions/${sessionId}/decision`,
    {
      method: "GET",
      headers: {
        "X-AUTH-CLIENT": apiKey,
        "Content-Type": "application/json",
      },
    },
  );

  if (!rawResponse.ok) {
    throw new Error(
      `[Veriff] Failed to fetch decision for session ${sessionId}: ${rawResponse.status}`,
    );
  }

  const response = await rawResponse.json();

  const parsed = veriffDecisionEventSchema.safeParse(response);

  if (!parsed.success) {
    throw new Error(
      `[Veriff] Invalid decision response for session ${sessionId}`,
    );
  }

  return parsed.data;
}
