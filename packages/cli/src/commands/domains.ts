import { getDomains } from "@/api/domains";
import { handleError } from "@/utils/handle-error";
import { logger } from "@/utils/logger";
import chalk from "chalk";
import { Command } from "commander";
import Configstore from "configstore";
import ora from "ora";
import prompts from "prompts";
import { z } from "zod";

const domainOptionsSchema = z.object({
  slug: z.string().min(3, {
    message: "Please provide a valid slug",
  }),
});

export const domains = new Command()
  .name("domains")
  .description("Configure your workspace domain")
  .action(async () => {
    const spinner = ora("Fetching domains").start();

    try {
      const showDomains = async () => {
        const slugs = await getDomains();
        if (slugs) spinner.stop();

        return [
          ...slugs.map((slug) => ({
            title: slug,
            value: slug,
          })),
        ];
      };

      const options = await prompts(
        [
          {
            type: "select",
            name: "domain",
            message: "Select a domain",
            choices: await showDomains(),
            validate: (value) => {
              const result = domainOptionsSchema.shape.slug.safeParse(value);
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

      const getconfig = new Configstore("dubcli");
      getconfig.set("domain", options.domain);

      spinner.succeed("Done");
      logger.info("");
      logger.info(`${chalk.green("Success!")} Configuration updated.`);
      logger.info("");
    } catch (error) {
      spinner.stop();
      handleError(error);
    }
  });
