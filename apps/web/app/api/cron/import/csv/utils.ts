import { prisma } from "@/lib/prisma";
import { sendEmail } from "emails";
import { LinksImportErrors } from "emails/links-import-errors";
import LinksImported from "emails/links-imported";

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
      from: "tmp@walkthrough.dev", // TODO: REMOVE THIS!!!!
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
      from: "tmp@walkthrough.dev", // TODO: REMOVE THIS!!!!
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
