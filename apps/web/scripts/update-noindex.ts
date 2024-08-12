// @ts-nocheck – old migration script

import { prisma } from "@dub/prisma";
import { redis } from "@/lib/upstash";
import { isIframeable } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const domains = await prisma.domain.findMany({
    where: {
      AND: [
        {
          target: {
            not: null,
          },
        },
        {
          target: {
            not: "",
          },
        },
      ],
      noindex: false,
    },
    take: 100,
  });

  //   const res = await Promise.all(
  //     domains.map(async (d) => {
  //       return await redis.hget(d.slug.toLowerCase(), "_root");
  //     }),
  //   );

  //   console.log({ res });

  const res = await Promise.all(
    domains.map(async (d) => {
      const { slug: domain, id, target: url, type, projectId } = d;
      const rewrite = type === "rewrite";

      return await redis
        .hset(domain.toLowerCase(), {
          _root: {
            id,
            url,
            ...(url &&
              rewrite && {
                rewrite: true,
                iframeable: await isIframeable({
                  url,
                  requestDomain: domain.toLowerCase(),
                }),
              }),
            noindex: true,
            projectId,
          },
        })
        .then(async () => {
          return await prisma.domain.update({
            where: {
              id,
            },
            data: {
              noindex: true,
            },
          });
        });
    }),
  );

  console.log(res);
}

main();
