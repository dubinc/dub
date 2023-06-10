import { Inngest } from "inngest";
import prisma from "#/lib/prisma";
import { randomBadgeColor } from "@/components/app/links/tag-badge";

export const inngest = new Inngest({ name: "Dub" });

export const importLinks = inngest.createFunction(
  { name: "Import Links" },
  { event: "import-links" },
  async ({ event, step }) => {
    const { source, projectId, preserveTags, bitlyGroup, bitlyApiKey } =
      event.data;

    await step.run(
      `Importing links from ${source} for project ${projectId}`,
      async () => {
        if (source === "bitly") {
          // while loop, check if pagination.searchAfter is not an empty string, else break
          // rate limit for /groups/{group_guid}/bitlinks is 1500 per hour or 150 per minute
          while (true) {
            // get links from source
            const data = await fetch(
              `https://api-ssl.bitly.com/v4/groups/${bitlyGroup}/bitlinks?size=100`,
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${bitlyApiKey}`,
                },
              },
            ).then((res) => res.json());
            const { links, pagination } = data;
            const { searchAfter } = pagination;
            // convert links to format that can be imported into database
            const linksToImport = links.map((link) => {
              const { id, long_url: url, title, archived, tags } = link;
              const [domain, key] = id.split("/");
              const tag = tags[0];
              return {
                domain,
                key,
                url,
                title,
                archived,
                ...(preserveTags && {
                  tag: {
                    connectOrCreate: {
                      where: {
                        name_projectId: {
                          name: tag,
                          projectId,
                        },
                      },
                      create: {
                        name: tag,
                        color: randomBadgeColor(),
                        projectId,
                      },
                    },
                  },
                }),
              };
            });
            // import links into database
            await prisma.link.createMany({
              data: linksToImport,
              skipDuplicates: true,
            });
            await step.sleep(5000);
            if (searchAfter === "") {
              break;
            }
          }
        }
      },
    );
    return {
      event,
      body: {
        message: `Done importing links from ${source} for project ${projectId}`,
      },
    };
  },
);
