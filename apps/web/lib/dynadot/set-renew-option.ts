import { log } from "@dub/utils";
import { dynadotClient } from "./client";

export const setRenewOption = async ({
  domain,
  autoRenew,
  logFailure = true,
}: {
  domain: string;
  autoRenew: boolean;
  // Set to false when the caller retries later and alerts on its own
  logFailure?: boolean;
}): Promise<boolean> => {
  try {
    const parsedResponse = await dynadotClient.setRenewOption({
      command: "set_renew_option",
      domain,
      renew_option: autoRenew ? "auto" : "donot",
    });

    console.info(`[setRenewOption] ${domain}`, parsedResponse);

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
    if (logFailure) {
      await log({
        message: `Failed to set renew option for ${domain}: ${error instanceof Error ? error.message : String(error)}`,
        type: "errors",
        mention: true,
      });
    }

    console.error(error);

    return false;
  }
};
