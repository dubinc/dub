"use server";

import {
  veriffCreateSessionInputSchema,
  veriffCreateSessionOutputSchema,
} from "@/lib/veriff/schema";
import { prisma } from "@dub/prisma";
import { authPartnerActionClient } from "../safe-action";

export const startIdentityVerificationAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    const { partner } = ctx;

    if (partner.identityVerificationStatus === "approved") {
      throw new Error(
        "Your identity has already been verified. No further action is required.",
      );
    }

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

    const rawResponse = await fetch(
      "https://stationapi.veriff.com/v1/sessions",
      {
        method: "POST",
        headers: {
          "X-AUTH-CLIENT": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      },
    );

    const response = await rawResponse.json();

    if (!rawResponse.ok) {
      console.error("[Veriff] Error", {
        status: rawResponse.status,
        json: response,
      });
      throw new Error("Failed to create Veriff verification session.");
    }

    const parsedResponse = veriffCreateSessionOutputSchema.safeParse(response);

    if (!parsedResponse.success) {
      console.error("[Veriff] Invalid response", parsedResponse.error);
      throw new Error("Failed to create Veriff verification session.");
    }

    const data = parsedResponse.data;

    await prisma.partner.update({
      where: {
        id: partner.id,
        identityVerifiedAt: null,
      },
      data: {
        veriffSessionId: data.verification.id,
        identityVerificationStatus: "pending",
      },
    });

    return {
      sessionUrl: data.verification.url,
    };
  },
);
