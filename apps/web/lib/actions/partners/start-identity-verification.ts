"use server";

import { shouldApplyRateLimit } from "@/lib/api/environment";
import { ratelimit } from "@/lib/upstash/ratelimit";
import {
  veriffCreateSessionInputSchema,
  veriffCreateSessionOutputSchema,
} from "@/lib/veriff/schema";
import { prisma } from "@dub/prisma";
import { Partner } from "@dub/prisma/client";
import { addDays } from "date-fns/addDays";
import { authPartnerActionClient } from "../safe-action";

export const startIdentityVerificationAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    const { partner } = ctx;

    if (partner.identityVerificationStatus === "approved") {
      throw new Error(
        "Your identity has already been verified. No further action is required.",
      );
    }

    // Rate limit check
    if (shouldApplyRateLimit) {
      const { success } = await ratelimit(3, "24 h").limit(
        `identityVerification:${partner.id}`,
      );

      if (!success) {
        throw new Error(
          "Too many verification attempts. Please try again later.",
        );
      }
    }

    // If the session is already created and not expired, return the existing session
    // this is to avoid creating duplicate sessions
    if (
      partner.veriffSessionId &&
      partner.veriffSessionUrl &&
      partner.veriffSessionExpiresAt &&
      partner.veriffSessionExpiresAt > new Date()
    ) {
      return {
        sessionUrl: partner.veriffSessionUrl,
      };
    }

    // Create a new session
    const { verification } = await createVeriffSession(partner);

    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        veriffSessionId: verification.id,
        veriffSessionUrl: verification.url,
        veriffSessionExpiresAt: addDays(new Date(), 7),
      },
    });

    return {
      sessionUrl: verification.url,
    };
  },
);

async function createVeriffSession(
  partner: Pick<Partner, "id" | "name" | "email">,
) {
  const apiKey = process.env.VERIFF_API_KEY;

  if (!apiKey) {
    throw new Error("VERIFF_API_KEY is not configured.");
  }

  const nameParts = partner.name.split(" ");
  const firstName = nameParts[0] || partner.name;
  const lastName = nameParts.slice(1).join(" ") || partner.name;

  const input = veriffCreateSessionInputSchema.parse({
    verification: {
      vendorData: partner.id,
      person: {
        firstName,
        lastName,
        email: partner.email,
      },
    },
  });

  const rawResponse = await fetch("https://stationapi.veriff.com/v1/sessions", {
    method: "POST",
    headers: {
      "X-AUTH-CLIENT": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const response = await rawResponse.json();

  if (!rawResponse.ok) {
    console.error("[Veriff] Error", rawResponse);
    throw new Error("Failed to create verification session.");
  }

  const parsedResponse = veriffCreateSessionOutputSchema.safeParse(response);

  if (!parsedResponse.success) {
    console.error("[Veriff] Invalid response", parsedResponse.error);
    throw new Error("Failed to create verification session.");
  }

  return parsedResponse.data;
}
