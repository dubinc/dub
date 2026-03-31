import { Partner } from "@dub/prisma/client";
import {
  veriffCreateSessionInputSchema,
  veriffCreateSessionOutputSchema,
} from "./schema";

export async function createVeriffSession({
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
