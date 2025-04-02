import { createLink } from "@/api/links";
import { getConfig } from "@/utils/config";
import { getNanoid } from "@/utils/get-nanoid";
import { handleError } from "@/utils/handle-error";
import { logger } from "@/utils/logger";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import prompts from "prompts";

export const shorten = new Command()
  .name("shorten")
  .description("Create a short link")
  .argument("[url]", "Destination URL")
  .argument("[key]", "Short key", getNanoid())
  .action(async (url, key) => {
    try {
      await getConfig();

      let linkData = { url, key };

      if (!url) {
        linkData = await prompts(
          [
            {
              type: "text",
              name: "url",
              message: "Enter your Destination URL:",
            },
            {
              type: "text",
              name: "key",
              message: "Enter your Short link:",
              initial: getNanoid(),
            },
          ],
          {
            onCancel: () => {
              logger.info("");
              logger.warn("You canceled the prompt.");
              logger.info("");
              process.exit(0);
            },
          },
        );
      }

      const spinner = ora("Creating new short link").start();

      try {
        const generatedShortLink = await createLink(linkData);

        spinner.succeed("New short link created!");

        logger.info("");
        logger.info(chalk.green(generatedShortLink.shortLink));
        logger.info("");
      } catch (error) {
        spinner.fail("Failed to create link");
        spinner.stop();
        logger.info("");
        throw error;
      }
    } catch (error) {
      handleError(error);
    }
  });
