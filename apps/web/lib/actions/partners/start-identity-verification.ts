"use server";

import { shouldApplyRateLimit } from "@/lib/api/environment";
import { ratelimit } from "@/lib/upstash/ratelimit";
import {
  veriffCreateSessionInputSchema,
  veriffCreateSessionOutputSchema,
} from "@/lib/veriff/schema";
import {
  mergeVeriffMetadata,
  parseVeriffMetadata,
} from "@/lib/veriff/veriff-metadata";
import { MAX_PARTNER_IDENTITY_VERIFICATION_ATTEMPTS } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Partner } from "@dub/prisma/client";
import { addDays } from "date-fns/addDays";
import { authPartnerActionClient } from "../safe-action";

export const startIdentityVerificationAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    const { partner } = ctx;

    if (partner.identityVerificationStatus) {
      switch (partner.identityVerificationStatus) {
        case "approved":
          throw new Error(
            "Your identity has already been verified. No further action is required.",
          );
        case "submitted":
        case "review":
          throw new Error(
            "A verification attempt is already in progress. Please wait for it to complete or resubmit.",
          );
      }
    }

    const veriffMetadata = parseVeriffMetadata(partner.veriffMetadata);

    if (
      veriffMetadata.attemptCount >= MAX_PARTNER_IDENTITY_VERIFICATION_ATTEMPTS
    ) {
      throw new Error(
        "You've reached the maximum number of identity verification attempts. Please contact support if you need help.",
      );
    }

    // If the session is already created and not expired, return the existing session
    // this is to avoid creating duplicate sessions
    if (
      partner.veriffSessionId &&
      veriffMetadata.sessionUrl &&
      veriffMetadata.sessionExpiresAt &&
      veriffMetadata.sessionExpiresAt > new Date()
    ) {
      return {
        sessionUrl: veriffMetadata.sessionUrl,
      };
    }

    // Rate limit check
    if (shouldApplyRateLimit) {
      const { success } = await ratelimit(1, "1 h").limit(
        `identityVerification:${partner.id}`,
      );

      if (!success) {
        throw new Error(
          "Too many verification attempts. Please try again later.",
        );
      }
    }

    // Create a new session
    const { verification } = await createVeriffSession({
      partner,
    });

    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        veriffSessionId: verification.id,
        veriffMetadata: mergeVeriffMetadata(partner.veriffMetadata, {
          sessionUrl: verification.url,
          sessionExpiresAt: addDays(new Date(), 7),
        }),
      },
    });

    return {
      sessionUrl: verification.url,
    };
  },
);

async function createVeriffSession({
  partner,
}: {
  partner: Pick<Partner, "id" | "email" | "name">;
}) {
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
