import { DOTS_DEFAULT_APP_ID } from "@/lib/dots/env";
import z from "../zod";
import { dotsFetch } from "./fetch";

const responseSchema = z.object({
  id: z.string(),
  status: z.enum(["verified", "unverified", "disabled", "in_review"]),
});

export const createDotsUser = async ({
  userInfo,
  dotsAppId = DOTS_DEFAULT_APP_ID,
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

  const response = await dotsFetch("/users", {
    method: "POST",
    dotsAppId,
    body: {
      first_name: firstName,
      last_name: lastName,
      email,
      country_code: countryCode,
      phone_number: phoneNumber,
    },
  });

  return responseSchema.parse(response);
};
