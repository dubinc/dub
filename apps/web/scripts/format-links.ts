// @ts-nocheck – old migration script

import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";

const linkCriteria = {
  select: {
    id: true,
    domain: true,
    key: true,
    url: true,
    projectId: true,
  },
};

async function main() {
  const links = await Promise.all(
    [0, 1, 2, 3].map((idx) =>
      prisma.link.findMany({
        ...linkCriteria,
        skip: idx * 100000,
        take: 100000,
      }),
    ),
  ).then((results) => results.flat());

  const domains = await prisma.domain
    .findMany({
      select: {
        id: true,
        slug: true,
        target: true,
        projectId: true,
      },
    })
    .then((domains) =>
      domains.map((domain) => ({
        ...domain,
        domain: domain.slug,
        key: "_root",
        url: domain.target,
      })),
    );

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
        url: obj.url || "",
        project_id: obj.projectId || "",
        deleted: 0,
      }) + "\n",
    );
  });

  // Close the stream
  file.end();
}

main();
