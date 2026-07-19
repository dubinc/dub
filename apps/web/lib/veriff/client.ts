import { assertEnv } from "@/lib/assert-env";
import { HttpBaseClient } from "@/lib/http/base-client";
import crypto from "crypto";
import * as z from "zod/v4";
import {
  veriffCreateSessionInputSchema,
  veriffCreateSessionOutputSchema,
  veriffDecisionEventSchema,
} from "./schema";

class VeriffClient extends HttpBaseClient {
  protected readonly vendor = "Veriff";
  protected readonly baseUrl = "https://stationapi.veriff.com/v1";

  protected buildAuthHeaders() {
    return {
      "X-AUTH-CLIENT": assertEnv("VERIFF_API_KEY"),
    };
  }

  // POST /v1/sessions
  async createSession(input: z.input<typeof veriffCreateSessionInputSchema>) {
    return await veriffClient.post("/sessions", {
      input,
      inputSchema: veriffCreateSessionInputSchema,
      outputSchema: veriffCreateSessionOutputSchema,
    });
  }

  // GET /v1/sessions/{sessionId}/decision
  async fetchSessionDecision(sessionId: string) {
    const hmacSignature = crypto
      .createHmac("sha256", assertEnv("VERIFF_SHARED_SECRET"))
      .update(sessionId)
      .digest("hex");

    return await veriffClient.get(`/sessions/${sessionId}/decision`, {
      headers: {
        "X-HMAC-SIGNATURE": hmacSignature,
      },
      outputSchema: veriffDecisionEventSchema,
    });
  }
}

export const veriffClient = new VeriffClient({
  debug: true,
});
