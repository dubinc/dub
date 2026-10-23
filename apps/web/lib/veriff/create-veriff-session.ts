import { Partner } from "@prisma/client";
import { veriffClient } from "./client";

export async function createVeriffSession({
  partner,
}: {
  partner: Pick<Partner, "id" | "email" | "name">;
}) {
  const nameParts = partner.name.split(" ");
  const firstName = nameParts[0] || partner.name;
  const lastName = nameParts.slice(1).join(" ") || partner.name;

  try {
    return await veriffClient.createSession({
      verification: {
        vendorData: partner.id,
        person: {
          firstName,
          lastName,
        },
      },
    });
  } catch (error) {
    throw new Error(
      "Failed to create Veriff session. Please try again later or contact support.",
    );
  }
}
