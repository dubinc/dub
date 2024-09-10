import z from "@/lib/zod";
import { DYNADOT_API_KEY, DYNADOT_BASE_URL, DYNADOT_COUPON } from "./constants";

const schema = z.object({
  RegisterResponse: z.object({
    Status: z.string(),
    DomainName: z.string(),
    Expiration: z.number(),
  }),
});

export const registerDomain = async ({ domain }: { domain: string }) => {
  const searchParams = new URLSearchParams({
    key: DYNADOT_API_KEY,
    domain: domain,
    command: "register",
    duration: "1", // TODO: Is this month or year?
    currency: "USD",
    coupon: DYNADOT_COUPON,
  });

  const response = await fetch(
    `${DYNADOT_BASE_URL}?${searchParams.toString()}`,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to register domain: ${response.statusText}`);
  }

  const data = schema.parse(await response.json());

  if (data.RegisterResponse.Status !== "success")
    throw new Error(
      `Failed to register domain: ${data.RegisterResponse.Status}`,
    );

  return data;
};
