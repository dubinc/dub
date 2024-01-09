import "dotenv-flow/config";
import * as Papa from "papaparse";
import * as fs from "fs";
import prisma from "@/lib/prisma";

const projectId = "cl7wsy2836920mjrb352g5wfx";
const clicks: any[] = [];

async function main() {
  const links = await prisma.link.findMany({
    where: {
      projectId,
    },
    select: {
      id: true,
      domain: true,
      key: true,
      url: true,
    },
  });
  const domains = await prisma.domain.findMany({
    where: {
      projectId,
    },
    select: {
      id: true,
      slug: true,
      target: true,
    },
  });

  Papa.parse(fs.createReadStream("sql.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: ({ data }) => {
      const { id, projectId: pId, url, ...rest } = data;
      const link =
        data.key === "_root"
          ? domains.find(({ slug }) => slug === data.domain)
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

      clicks.push({
        ...rest,
        link_id: link.id,
        project_id: projectId,
        // @ts-ignore
        url: link.url || link.target || "",
        alias: "",
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
}

main();
