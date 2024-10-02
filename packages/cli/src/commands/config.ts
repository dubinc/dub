import { getConfig } from "@/utils/get-config";
import { handleError } from "@/utils/handle-error";
import { logger } from "@/utils/logger";
import { Command } from "commander";
import colorizeJson from "json-colorizer";
import ora from "ora";

export const config = new Command()
  .name("config")
  .description("see your configured workspace credentails")
  .action(async () => {
    const spinner = ora("Getting config file").start();

    try {
      const configInfo = await getConfig();

      spinner.succeed("Configuration file successfully retrieved");

      logger.info("");
      console.log(
        colorizeJson(JSON.stringify(configInfo, null, 2), {
          colors: {
            STRING_KEY: "white",
            STRING_LITERAL: "#65B741",
            NUMBER_LITERAL: "#7E30E1",
          },
        }),
      );
      logger.info("");
    } catch (error) {
      spinner.stop();
      handleError(error);
    }
  });
