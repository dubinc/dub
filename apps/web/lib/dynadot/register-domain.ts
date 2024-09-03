import z from "@/lib/zod";
import { DYNADOT_API_KEY, DYNADOT_BASE_URL } from "./constants";

const schema = z.object({
  RegisterResponse: z.object({
    // ResponseCode: z.enum(["0", "-1", ""]),
    Status: z.enum(["success", "insufficient_funds"]),
    DomainName: z.string(),
    // Expiration: z.number(),
  }),
});

export const registerDomain = async ({ domain }: { domain: string }) => {
  const searchParams = new URLSearchParams({
    key: DYNADOT_API_KEY,
    domain: domain,
    command: "register",
    duration: "1", // TODO: Is this month or year?
    currency: "USD",
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

  const json = await response.json();

  console.log("registerDomain", json);

  return json;

  // const data = schema.parse(json);


  // return data;
};
