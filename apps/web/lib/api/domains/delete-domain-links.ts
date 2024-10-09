import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { storage } from "../../storage";
import { recordLink } from "../../tinybird";
import { removeDomainFromVercel } from "./remove-domain-vercel";

/* Delete a domain and all links & images associated with it */
export async function deleteDomainAndLinks(domain: string) {
  const [domainData, allLinks] = await Promise.all([
    prisma.domain.findUnique({
      where: {
        slug: domain,
      },
      select: {
        id: true,
        projectId: true,
        createdAt: true,
      },
    }),
    prisma.link.findMany({
      where: {
        domain,
      },
      select: {
        id: true,
        domain: true,
        key: true,
        url: true,
        image: true,
        projectId: true,
        tags: true,
        createdAt: true,
      },
    }),
  ]);

  if (!domainData) {
    return null;
  }

  const response = await prisma.domain.delete({
    where: {
      slug: domain,
    },
  });

  waitUntil(
    (async () => {
      await Promise.allSettled([
        // delete all links from redis
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/domains/delete`,
          body: {
            domain,
          },
        }),

        // record deletes in tinybird for domain & links
        recordLink([
          ...allLinks.map((link) => ({
            link_id: link.id,
            domain: link.domain,
            key: link.key,
            url: link.url,
            tag_ids: link.tags.map((tag) => tag.tagId),
            workspace_id: link.projectId,
            created_at: link.createdAt,
            deleted: true,
          })),
        ]),
        ...allLinks.map((link) => {
          if (
            link.image &&
            link.image.startsWith(`${R2_URL}/images/${link.id}`)
          ) {
            storage.delete(link.image.replace(`${R2_URL}/`, ""));
          }
        }),
        // remove the domain from Vercel
        removeDomainFromVercel(domain),
      ]);
    })(),
  );

  return response;
}
