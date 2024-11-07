import z from "../zod";
import { DOTS_API_URL } from "./env";
import { dotsHeaders } from "./utils";

const responseSchema = z.object({
  id: z.string(),
  status: z.enum(["verified", "unverified", "disabled", "in_review"]),
});

export const createDotsUser = async ({
  firstName,
  lastName,
  email,
  countryCode,
  phoneNumber,
}: {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phoneNumber: string;
}) => {
  const response = await fetch(`${DOTS_API_URL}/users`, {
    method: "POST",
    headers: dotsHeaders({ dotsAppId: "0f01ec2b-e29e-4627-ae28-5ecc24d25935" }),
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      email,
      country_code: countryCode,
      phone_number: phoneNumber,
    }),
  });

  if (!response.ok) {
    console.error(await response.text());

    throw new Error(`Failed to create Dots user.`);
  }

  return responseSchema.parse(await response.json());
};
