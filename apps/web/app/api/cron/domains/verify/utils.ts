import { deleteDomainAndLinks } from "@/lib/api/domains";
import { limiter } from "@/lib/cron/limiter";
import { prisma } from "@/lib/prisma";
import { log } from "@dub/utils";
import { sendEmail } from "emails";
import DomainDeleted from "emails/domain-deleted";
import InvalidDomain from "emails/invalid-domain";

export const handleDomainUpdates = async ({
  domain,
  createdAt,
  verified,
  primary,
  changed,
}: {
  domain: string;
  createdAt: Date;
  verified: boolean;
  primary: boolean;
  changed: boolean;
}) => {
  if (changed) {
    await log({
      message: `Domain *${domain}* changed status to *${verified}*`,
      type: "cron",
      mention: verified,
    });
  }

  if (verified) return;

  const invalidDays = Math.floor(
    (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 3600 * 24),
  );

  // do nothing if domain is invalid for less than 14 days
  if (invalidDays < 14) return;

  const workspace = await prisma.project.findFirst({
    where: {
      domains: {
        some: {
          slug: domain,
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      sentEmails: true,
      usage: true,
      users: {
        select: {
          user: {
            select: {
              email: true,
            },
          },
        },
        where: {
          user: {
            isMachine: false,
          },
          notificationPreference: {
            domainConfigurationWarnings: true,
          },
        },
      },
    },
  });
  if (!workspace) {
    await log({
      message: `Domain *${domain}* is invalid but not associated with any workspace, skipping.`,
      type: "cron",
      mention: true,
    });
    return;
  }
  const workspaceSlug = workspace.slug;
  const sentEmails = workspace.sentEmails.map((email) => email.type);
  const emails = workspace.users.map((user) => user.user.email) as string[];

  // if domain is invalid for more than 30 days, check if we can delete it
  if (invalidDays >= 30) {
    // Don't delete the domain (manual inspection required)
    // if the links for the domain have clicks recorded
    const linksClicks = await prisma.link.aggregate({
      _sum: {
        clicks: true,
      },
      where: {
        domain,
      },
    });
    if (linksClicks._sum.clicks && linksClicks._sum.clicks > 0) {
      return await log({
        message: `Domain *${domain}* has been invalid for > 30 days but has links with clicks, skipping.`,
        type: "cron",
      });
    }
    // else, delete the domain
    return await Promise.allSettled([
      deleteDomainAndLinks(domain).then(async () => {
        // if the deleted domain was primary, make another domain primary
        if (primary) {
          const anotherDomain = await prisma.domain.findFirst({
            where: {
              projectId: workspace.id,
            },
          });
          if (!anotherDomain) return;
          return prisma.domain.update({
            where: {
              slug: anotherDomain.slug,
            },
            data: {
              primary: true,
            },
          });
        }
      }),
      log({
        message: `Domain *${domain}* has been invalid for > 30 days andhas links but no link clicks, deleting.`,
        type: "cron",
      }),
      emails.map((email) =>
        limiter.schedule(() =>
          sendEmail({
            subject: `Your domain ${domain} has been deleted`,
            email,
            react: DomainDeleted({
              email,
              domain,
              workspaceSlug,
            }),
          }),
        ),
      ),
    ]);
  }

  if (invalidDays >= 28) {
    const sentSecondDomainInvalidEmail = sentEmails.includes(
      `secondDomainInvalidEmail:${domain}`,
    );
    if (!sentSecondDomainInvalidEmail) {
      return sendDomainInvalidEmail({
        workspaceSlug,
        domain,
        invalidDays,
        emails,
        type: "second",
      });
    }
  }

  if (invalidDays >= 14) {
    const sentFirstDomainInvalidEmail = sentEmails.includes(
      `firstDomainInvalidEmail:${domain}`,
    );
    if (!sentFirstDomainInvalidEmail) {
      return sendDomainInvalidEmail({
        workspaceSlug,
        domain,
        invalidDays,
        emails,
        type: "first",
      });
    }
  }
  return;
};

const sendDomainInvalidEmail = async ({
  workspaceSlug,
  domain,
  invalidDays,
  emails,
  type,
}: {
  workspaceSlug: string;
  domain: string;
  invalidDays: number;
  emails: string[];
  type: "first" | "second";
}) => {
  return await Promise.allSettled([
    log({
      message: `Domain *${domain}* is invalid for ${invalidDays} days, email sent.`,
      type: "cron",
    }),
    emails.map((email) =>
      limiter.schedule(() =>
        sendEmail({
          subject: `Your domain ${domain} needs to be configured`,
          email,
          react: InvalidDomain({
            email,
            domain,
            workspaceSlug,
            invalidDays,
          }),
        }),
      ),
    ),
    prisma.sentEmail.create({
      data: {
        project: {
          connect: {
            slug: workspaceSlug,
          },
        },
        type: `${type}DomainInvalidEmail:${domain}`,
      },
    }),
  ]);
};
