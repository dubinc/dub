import { sendEmail } from "@dub/email";
import { LinksImportErrors } from "@dub/email/templates/links-import-errors";
import { LinksImported } from "@dub/email/templates/links-imported";
import { prisma } from "@dub/prisma";

export async function sendCsvImportEmails({
  workspaceId,
  count,
  domains,
  errorLinks,
}: {
  workspaceId: string;
  count: number;
  domains: string[];
  errorLinks: {
    domain: string;
    key: string;
    error: string;
  }[];
}) {
  domains = Array.isArray(domains) && domains.length > 0 ? domains : [];
  errorLinks =
    Array.isArray(errorLinks) && errorLinks.length > 0 ? errorLinks : [];

  const workspace = await prisma.project.findUnique({
    where: {
      id: workspaceId,
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
          domain: {
            in: domains,
          },
        },
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  const ownerEmail = workspace?.users[0].user.email ?? "";

  if (count > 0) {
    sendEmail({
      subject: `Your CSV links have been imported!`,
      email: ownerEmail,
      react: LinksImported({
        email: ownerEmail,
        provider: "CSV",
        count,
        links: workspace?.links ?? [],
        domains,
        workspaceName: workspace?.name ?? "",
        workspaceSlug: workspace?.slug ?? "",
      }),
    });
  }

  if (errorLinks.length > 0) {
    sendEmail({
      subject: `Some CSV links failed to import`,
      email: ownerEmail,
      react: LinksImportErrors({
        email: ownerEmail,
        provider: "CSV",
        errorLinks,
        workspaceName: workspace?.name ?? "",
        workspaceSlug: workspace?.slug ?? "",
      }),
    });
  }
}
