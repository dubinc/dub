import { getConfig } from "@/utils/config";
import { handleError } from "@/utils/handle-error";
import { Command } from "commander";
import { Dub } from "dub";
import ora from "ora";

export const links = new Command()
  .command("links")
  .description("Search for links in your Dub workspace")
  .option("-s, --search [search]", "Search term to filter links by")
  .option("-l, --limit [limit]", "Number of links to fetch")
  .action(async ({ search, limit }) => {
    try {
      const config = await getConfig();

      const spinner = ora("Fetching links").start();

      const dub = new Dub({
        token: config.access_token,
      });

      const links = await dub.links.list({
        search,
        pageSize: limit ? parseInt(limit) : 10,
      });

      spinner.stop();

      const formattedLinks = links.result.map((link) => ({
        "Short Link": link.shortLink,
        "Destination URL": link.url,
        Clicks: link.clicks,
        "Created At": new Date(link.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        }),
      }));

      console.table(formattedLinks);
    } catch (error) {
      handleError(error);
    }
  });
