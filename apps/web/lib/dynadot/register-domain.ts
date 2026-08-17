import { DubApiError } from "../api/errors";
import { RegisterDomainSchema } from "../zod/schemas/domains";
import { dynadotClient } from "./client";
import { DYNADOT_COUPON } from "./constants";

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

const ERROR_CODES = {
  not_available: "Domain not available.",
  system_busy: "System is busy. Please try again.",
  insufficient_funds:
    "Insufficient funds. Please add more funds to your account.",
};

export const registerDomain = async ({
  domain,
  premium,
}: {
  domain: string;
  premium?: boolean;
}) => {
  // for premium domain registrations, we return early with a mock response since we'll need to manually register the domain via Dynadot
  if (premium) {
    return RegisterDomainSchema.parse({
      domain,
      status: "success",
      expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).getTime(),
    });
  }

  const data = await dynadotClient.register({
    domain,
    command: "register",
    duration: "1",
    currency: "USD",
    coupon: DYNADOT_COUPON,
  });

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
