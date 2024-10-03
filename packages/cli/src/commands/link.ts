import { getConfig } from "@/utils/get-config";
import { createLink, getLinks } from "@/utils/get-links";
import { getNanoid } from "@/utils/get-nanoid";
import { handleError } from "@/utils/handle-error";
import { logger } from "@/utils/logger";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import prompts from "prompts";
import { z } from "zod";

const addOptionsSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  key: z.string().min(4, "Key must be at least 4 characters long"),
});

export const link = new Command()
  .name("link")
  .description("Configure domain for your workspace")
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
              validate: (value) => {
                const result = addOptionsSchema.shape.url.safeParse(value);
                return result.success || result.error.errors[0].message;
              },
            },
            {
              type: "text",
              name: "key",
              message: "Enter your Short link:",
              initial: getNanoid(),
              validate: (value) => {
                const result = addOptionsSchema.shape.key.safeParse(value);
                return result.success || result.error.errors[0].message;
              },
            },
          ],
          {
            onCancel: () => {
              logger.info("");
              logger.warn("You cancelled the prompt.");
              logger.info("");
              process.exit(0);
            },
          },
        );
      }

      const validatedData = addOptionsSchema.parse(linkData);
      const spinner = ora("Creating new short link").start();

      try {
        const generatedShortLink = await createLink(validatedData);

        spinner.succeed("New short link created!");

        logger.info("");
        logger.info(
          chalk.green(
            `https://${generatedShortLink.domain}/${generatedShortLink.key}`,
          ),
        );
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

link
  .command("list")
  .description("View the list of the last 100 links")
  .action(async () => {
    try {
      await getConfig();

      const spinner = ora("Fetching links").start();
      const links = await getLinks();
      spinner.stop();

      console.table(links, ["url", "clicks"]);
    } catch (error) {
      handleError(error);
    }
  });
