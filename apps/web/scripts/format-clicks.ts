import "dotenv-flow/config";
import * as Papa from "papaparse";
import * as fs from "fs";
import prisma from "@/lib/prisma";
import { nanoid } from "./utils";

// const projectId = "cl7wsy2836920mjrb352g5wfx";
const clicks: any[] = [];
const linkCriteria = {
  where: {
    domain: {
      in: ["chatg.pt", "amzn.id", "spti.fi", "cdt.pm"],
    },
  },
  select: {
    id: true,
    domain: true,
    key: true,
    url: true,
    projectId: true,
  },
};

async function main() {
  const [firstLinks, secondLinks] = await Promise.all([
    prisma.link.findMany({
      ...linkCriteria,
      take: 100000,
    }),
    prisma.link.findMany({
      ...linkCriteria,
      skip: 100000,
    }),
  ]);
  const links = [...firstLinks, ...secondLinks];
  const domains = await prisma.domain
    .findMany({
      where: {
        slug: {
          in: ["chatg.pt", "amzn.id", "spti.fi", "cdt.pm"],
        },
      },
      select: {
        id: true,
        slug: true,
        target: true,
        projectId: true,
      },
      take: 1000,
    })
    .then((domains) =>
      domains.map((domain) => ({
        ...domain,
        domain: domain.slug,
        key: "_root",
        url: domain.target,
      })),
    );

  Papa.parse(fs.createReadStream("sql.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: ({ data }) => {
      const link =
        data.key === "_root"
          ? domains.find(({ domain }) => domain === data.domain)
          : links.find(
              ({ domain, key }) =>
                domain === data.domain &&
                key.toLowerCase() === data.key.toLowerCase(),
            );

      if (!link) {
        console.log(
          `No link found for ${data.domain}/${data.key}. Probably deleted.`,
        );
        return;
      }

      const { domain, key, id, projectId, url, alias, ...rest } = data;

      clicks.push({
        ...rest,
        click_id: nanoid(),
        url: link.url || "",
        link_id: link.id,
        bot: data.bot === "1" ? 1 : 0,
      });
    },
    complete: async () => {
      console.log(clicks.length);

      // chunk the clicks into period of 8 months, up until today's date
      const today = new Date();
      let start = new Date("2022-09-01");
      while (start < today) {
        const end = new Date(start);
        end.setMonth(end.getMonth() + 8);
        const clicksForPeriod = clicks.filter(
          ({ timestamp }) =>
            new Date(timestamp) >= start && new Date(timestamp) < end,
        );
        const file = fs.createWriteStream(
          `clicks-${start.getFullYear()}-${start.getMonth()}.ndjson`,
        );

        // Iterate over the array and write each object as a string
        clicksForPeriod.forEach((obj) => {
          file.write(JSON.stringify(obj) + "\n");
        });

        // Close the stream
        file.end();

        start = end;
      }
    },
  });

  const file = fs.createWriteStream(`links-metadata.ndjson`);

  // Iterate over the array and write each object as a string
  [...links, ...domains].forEach((obj) => {
    file.write(
      JSON.stringify({
        ...obj,
        timestamp: new Date(Date.now()).toISOString(),
        id: undefined,
        projectId: undefined,
        link_id: obj.id,
        team_id: obj.projectId || "",
        url: obj.url || "",
      }) + "\n",
    );
  });

  // Close the stream
  file.end();
}

main();
