import { z } from "zod";
import { DubApiError } from "../api/errors";
import { DYNADOT_API_KEY, DYNADOT_BASE_URL } from "./constants";

const schema = z.object({
  SetDnsResponse: z.object({
    Status: z.string(),
    Error: z.string().optional(),
  }),
});

export const configureDNS = async ({ domain }: { domain: string }) => {
  const searchParams = new URLSearchParams({
    key: DYNADOT_API_KEY,
    domain: domain,
    command: "set_dns2",
    main_record_type0: "a",
    main_record0: "76.76.21.21",
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
      message: `Failed to configure DNS for domain "${domain}": ${response.statusText}`,
    });
  }

  const data = schema.parse(await response.json());

  const { Status, Error } = data.SetDnsResponse;

  if (Status !== "success") {
    throw new DubApiError({
      code: "bad_request",
      message: `Failed to configure DNS for domain "${domain}": ${Error}`,
    });
  }

  return data;
};
