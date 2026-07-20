import { log } from "@dub/utils";
import * as z from "zod/v4";
import { DYNADOT_API_KEY, DYNADOT_BASE_URL } from "./constants";

const responseSchema = z.union([
  z.object({
    SetRenewOptionResponse: z.object({
      ResponseCode: z.union([z.number(), z.string()]),
      Status: z.string(),
    }),
  }),

  z.object({
    Response: z.object({
      ResponseCode: z.union([z.number(), z.string()]),
      Error: z.string(),
    }),
  }),
]);

export const setRenewOption = async ({
  domain,
  autoRenew,
}: {
  domain: string;
  autoRenew: boolean;
}): Promise<boolean> => {
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
      throw new Error(`Failed to set renew option: ${response.statusText}`);
    }

    const responseBody = await response.json();

    console.info(`[setRenewOption] ${domain}`, responseBody);

    const parsedResponse = responseSchema.parse(responseBody);

    if ("Response" in parsedResponse) {
      throw new Error(
        `Failed to set renew option: ${parsedResponse.Response.Error}`,
      );
    }

    if ("SetRenewOptionResponse" in parsedResponse) {
      const { Status } = parsedResponse.SetRenewOptionResponse;

      if (Status !== "success") {
        throw new Error(`Failed to set renew option: ${Status}`);
      }
    }

    console.log(
      `Auto-renew for ${domain} is ${autoRenew ? "enabled" : "disabled"}.`,
    );

    return true;
  } catch (error) {
    await log({
      message: `Failed to set renew option for ${domain}: ${error instanceof Error ? error.message : String(error)}`,
      type: "errors",
      mention: true,
    });

    console.error(error);

    return false;
  }
};
