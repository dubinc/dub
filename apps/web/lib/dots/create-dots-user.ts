import z from "../zod";
import { getDotsEnv } from "./env";
import { getEncodedCredentials } from "./utils";

const dotsUserSchema = z.object({
  id: z.string(),
});

export const createDotsUser = async ({
  firstName,
  lastName,
  email,
  countryCode,
  phoneNumber,
  metadata,
}: {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phoneNumber: string;
  metadata: Record<string, string>;
}) => {
  const { DOTS_API_URL } = getDotsEnv();
  const authToken = getEncodedCredentials();

  const response = await fetch(`${DOTS_API_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authToken}`,
    },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      country_code: countryCode,
      phone_number: phoneNumber,
      email,
      metadata,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to create Dots user: ${data}`);
  }

  console.log("createDotsUser", data);

  return dotsUserSchema.parse(data);
};
