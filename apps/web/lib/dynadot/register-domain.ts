import z from "@/lib/zod";
import { DubApiError } from "../api/errors";
import { RegisterDomainSchema } from "../zod/schemas/domains";
import { DYNADOT_API_KEY, DYNADOT_BASE_URL, DYNADOT_COUPON } from "./constants";

/*
Possible statuses:
  success
  error
  not_available
  insufficient_funds
  over_quota – When Dynadot's system detects an unusually high number of registration calls within a specific timeframe. This is a rare occurrence and typically not triggered under normal conditions.
  order_pending_process –  means the order was created for the command, however there is something need additional investigation, and our team will step in later on to process the order accordingtly.
  system_busy – normally means the system/connection is currently busy, you may retry command after a period of time
*/

const schema = z.object({
  RegisterResponse: z.object({
    Status: z.string(),
    DomainName: z.string(),
    Error: z.string().optional(),
    Expiration: z.number().optional(),
  }),
});

const ERROR_CODES = {
  not_available: "Domain not available.",
  system_busy: "System is busy. Please try again.",
};

export const registerDomain = async ({ domain }: { domain: string }) => {
  const searchParams = new URLSearchParams({
    domain,
    command: "register",
    duration: "1",
    currency: "USD",
    coupon: DYNADOT_COUPON,
    key: DYNADOT_API_KEY,
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
    throw new DubApiError({
      code: "bad_request",
      message: `Failed to register domain: ${response.statusText}`,
    });
  }

  const data = schema.parse(await response.json());

  const { Status, Error } = data.RegisterResponse;

  if (Status !== "success") {
    throw new DubApiError({
      code: "bad_request",
      message:
        Error ||
        ERROR_CODES[Status] ||
        "Failed to register domain. Please try again.",
    });
  }

  return RegisterDomainSchema.parse({
    domain,
    status: Status,
    expiration: data.RegisterResponse.Expiration,
  });
};
