import z from "@/lib/zod";
import { DYNADOT_API_KEY, DYNADOT_BASE_URL } from "./constants";

const schema = z.object({
  SetDnsResponse: z.object({
    ResponseCode: z.number(),
    Status: z.string(),
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
    throw new Error(`Failed to configure domain DNS: ${response.statusText}`);
  }

  const data = schema.parse(await response.json());

  return data;
};
