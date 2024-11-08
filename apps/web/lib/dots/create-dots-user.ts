import { DEFAULT_DOTS_APP_ID } from "@dub/utils";
import z from "../zod";
import { DOTS_API_URL } from "./env";
import { dotsHeaders } from "./utils";

const responseSchema = z.object({
  id: z.string(),
  status: z.enum(["verified", "unverified", "disabled", "in_review"]),
});

export const createDotsUser = async ({
  userInfo,
  dotsAppId = DEFAULT_DOTS_APP_ID,
}: {
  userInfo: {
    firstName: string;
    lastName: string;
    email: string;
    countryCode: string;
    phoneNumber: string;
  };
  dotsAppId?: string;
}) => {
  const { firstName, lastName, email, countryCode, phoneNumber } = userInfo;

  const response = await fetch(`${DOTS_API_URL}/users`, {
    method: "POST",
    headers: dotsHeaders({ dotsAppId }),
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
