import prisma from "#/lib/prisma";
import { redis } from "#/lib/upstash";
import { sendEmail } from "emails";
import LinksImported from "emails/links-imported";

// recursive function to check if nextPageToken is not null, else break
export const importLinksFromShort = async ({
  projectId,
  domainId,
  domain,
  shortApiKey,
  pageToken = null,
  count = 0,
}: {
  projectId: string;
  domainId: number;
  domain: string;
  shortApiKey: string;
  pageToken?: string | null;
  count?: number;
}) => {
  const data = await fetch(
    `https://api.short.io/api/links?domain_id=${domainId}&limit=150${
      pageToken ? `&pageToken=${pageToken}` : ""
    }`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: shortApiKey,
      },
    },
  ).then((res) => res.json());
  const { links, nextPageToken } = data;

  const pipeline = redis.pipeline();

  // convert links to format that can be imported into database
  const importedLinks = links
    .map((link) => {
      const {
        originalURL,
        path,
        title,
        expiresAt,
        iphoneURL,
        androidURL,
        archived,
        createdAt,
      } = link;
      // skip the root domain
      if (path.length === 0) {
        return null;
      }
      const exat = expiresAt ? new Date(expiresAt).getTime() / 1000 : null;
      pipeline.set(
        `${domain}:${path}`,
        {
          url: encodeURIComponent(originalURL),
          ...(iphoneURL && { ios: encodeURIComponent(iphoneURL) }),
          ...(androidURL && { android: encodeURIComponent(androidURL) }),
        },
        {
          nx: true,
          // if the key has an expiry, set exat (type any cause there's a type error in the @types)
          ...(exat && { exat: exat as any }),
        },
      );
      return {
        projectId,
        domain,
        key: path,
        url: originalURL,
        title,
        // convert unix timestamp in milliseconds to DateTime toISOString
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        ios: iphoneURL,
        android: androidURL,
        archived,
        createdAt,
      };
    })
    .filter(Boolean);

  // import links into database
  await Promise.all([
    prisma.link.createMany({
      data: importedLinks,
      skipDuplicates: true,
    }),
    pipeline.exec(),
  ]);

  count += importedLinks.length;

  console.log({
    importedLinksLength: importedLinks.length,
    count,
    nextPageToken,
  });

  // wait 500 ms before making another request
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (!nextPageToken) {
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        name: true,
        slug: true,
        users: {
          where: {
            role: "owner",
          },
          select: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        links: {
          select: {
            domain: true,
            key: true,
            createdAt: true,
          },
          where: {
            domain,
          },
          take: 5,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
    const ownerEmail = project?.users[0].user.email ?? "";
    const links = project?.links ?? [];

    await Promise.all([
      // delete key from redis
      redis.del(`import:short:${projectId}`),

      // send email to user
      sendEmail({
        subject: `Your Short.io links have been imported!`,
        email: ownerEmail,
        react: LinksImported({
          email: ownerEmail,
          provider: "Short.io",
          count,
          links,
          domains: [domain],
          projectName: project?.name ?? "",
          projectSlug: project?.slug ?? "",
        }),
      }),
    ]);
    return count;
  } else {
    return await importLinksFromShort({
      projectId,
      domainId,
      domain,
      shortApiKey,
      pageToken: nextPageToken,
      count,
    });
  }
};
