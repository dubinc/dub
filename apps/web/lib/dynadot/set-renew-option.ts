import z from "@/lib/zod";
import { log } from "@dub/utils";
import { DYNADOT_API_KEY, DYNADOT_BASE_URL } from "./constants";

const responseSchema = z.object({
  SetDefaultRenewOptionResponse: z.object({
    ResponseCode: z.number(),
    Status: z.string(),
  }),
});

export const setRenewOption = async ({
  domain,
  autoRenew,
}: {
  domain: string;
  autoRenew: boolean;
}) => {
  const searchParams = new URLSearchParams({
    key: DYNADOT_API_KEY,
    command: "set_renew_option",
    domain,
    renew_option: autoRenew ? "auto" : "donot",
  });

  try {
    const response = await fetch(
      `${DYNADOT_BASE_URL}?${searchParams.toString()}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    if (!response.ok) {
      console.error(response);
      throw new Error(`Failed to set renew option: ${response.statusText}`);
    }

    const {
      SetDefaultRenewOptionResponse: { Status },
    } = responseSchema.parse(await response.json());

    if (Status !== "success") {
      throw new Error(`Failed to set renew option: ${Status}`);
    }

    console.log(
      `Auto-renew for ${domain} is ${autoRenew ? "enabled" : "disabled"}.`,
    );
  } catch (error) {
    await log({
      message: `Failed to set renew option for ${domain}: ${error.message}`,
      type: "errors",
      mention: true,
    });

    console.error(error);
  }
};
