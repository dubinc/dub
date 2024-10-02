import {
  createDomain,
  deleteDomain,
  getDomains,
  updateDomain,
} from "@/utils/get-domains";
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

export const domain = new Command()
  .name("domain")
  .description("Configure your workspace domain")
  .action(async () => {
    const spinner = ora("Fetching domains").start();

    try {
      const showDomains = async () => {
        const domains = await getDomains();
        if (domains) spinner.stop();

        return [
          ...domains.map((domain) => ({
            title: domain.slug,
            value: domain.slug,
          })),
          {
            title: "amzn.id",
            value: "amzn.id",
          },
          {
            title: "chatg.pt",
            value: "chatg.pt",
          },
          {
            title: "dub.sh",
            value: "dub.sh",
          },
          {
            title: "fig.page",
            value: "fig.page",
          },
          {
            title: "ggl.link",
            value: "ggl.link",
          },
          {
            title: "git.new",
            value: "git.new",
          },
          {
            title: "spti.fi",
            value: "spti.fi",
          },
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

domain
  .command("create")
  .description("Create a new domain")
  .argument("[slug]", "Name of the domain")
  .action(async (slug) => {
    try {
      let newDomain = { slug };

      if (!newDomain.slug) {
        newDomain = await prompts(
          [
            {
              type: "text",
              name: "slug",
              message: "Enter new name of the domain:",
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
      }

      const validatedData = domainOptionsSchema.parse(newDomain);
      const spinner = ora("Creating new domain").start();

      try {
        await createDomain(validatedData.slug);
        spinner.succeed("Domain created successfully");

        logger.info("");
        logger.info(
          `${chalk.green("Success!")} New Domain '${validatedData.slug}' has been created.`,
        );
        logger.info("");
      } catch (error) {
        spinner.fail("Failed to create new domain");
        spinner.stop();
        logger.info("");
        throw error;
      }
    } catch (error) {
      handleError(error);
    }
  });

domain
  .command("update")
  .description("Update an existing domain")
  .argument("[slug]", "Name of the domain")
  .action(async (slug) => {
    const fetchingSpinner = ora("Fetching domains").start();

    try {
      const domains = await getDomains();
      if (domains) fetchingSpinner.stop();

      const { domain: oldDomain } = await prompts(
        [
          {
            type: "select",
            name: "domain",
            message: "Select a domain to update:",
            choices: domains.map((d) => ({ title: d.slug, value: d.slug })),
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

      let newDomain = { slug };

      if (!newDomain.slug) {
        newDomain = await prompts(
          [
            {
              type: "text",
              name: "slug",
              message: "Enter new name of the domain:",
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

      const validatedData = domainOptionsSchema.parse(newDomain);
      const spinner = ora("Updating domain").start();

      try {
        await updateDomain({
          newSlug: validatedData.slug,
          oldSlug: oldDomain,
        });

        spinner.succeed("Domain updated successfully");

        logger.info("");
        logger.info(
          `${chalk.green(
            "Success!",
          )} Domain '${oldDomain}' has been updated to '${validatedData.slug}'.`,
        );
        logger.info("");
      } catch (error) {
        spinner.fail("Failed to update domain");
        spinner.stop();
        logger.info("");
        throw error;
      }
    } catch (error) {
      handleError(error);
    }
  });

domain
  .command("delete")
  .description("delete a domain")
  .argument("[slug]", "name of the domain")
  .action(async (slug) => {
    try {
      let selectDomain = { slug };

      if (!selectDomain.slug) {
        const fetchingSpinner = ora("Fetching domains").start();

        const domains = await getDomains();
        if (domains) fetchingSpinner.stop();

        selectDomain = await prompts(
          [
            {
              type: "select",
              name: "slug",
              message: "Select a domain to delete:",
              choices: domains.map((d) => ({ title: d.slug, value: d.slug })),
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
      }

      const { confirm } = await prompts(
        [
          {
            type: "confirm",
            name: "confirm",
            message: `Are you sure you want to delete the domain '${selectDomain.slug}'?`,
            initial: false,
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

      if (!confirm) {
        logger.info("Deletion cancelled.");
      }

      const validatedData = domainOptionsSchema.parse(selectDomain);
      const spinner = ora("Deleting domain").start();

      try {
        await deleteDomain(validatedData.slug);

        spinner.succeed("Domain deleted successfully");

        logger.info("");
        logger.info(
          `${chalk.green("Success!")} Domain '${validatedData.slug}' has been deleted.`,
        );
        logger.info("");
      } catch (error) {
        spinner.fail("Failed to update domain");
        spinner.stop();
        logger.info("");
        throw error;
      }
    } catch (error) {
      handleError(error);
    }
  });
