import { deleteDomainAndLinks } from "@/lib/api/domains";
import { limiter } from "@/lib/cron";
import prisma from "@/lib/prisma";
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
  clicks,
  linksCount,
}: {
  domain: string;
  createdAt: Date;
  verified: boolean;
  primary: boolean;
  changed: boolean;
  clicks: number;
  linksCount: number;
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

  const project = await prisma.project.findFirst({
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
      },
    },
  });
  if (!project) {
    await log({
      message: `Domain *${domain}* is invalid but not associated with any project, skipping.`,
      type: "cron",
      mention: true,
    });
    return;
  }
  const projectSlug = project.slug;
  const sentEmails = project.sentEmails.map((email) => email.type);
  const emails = project.users.map((user) => user.user.email) as string[];

  // if domain is invalid for more than 30 days, check if we can delete it
  if (invalidDays >= 30) {
    // Don't delete the domain (manual inspection required) if:
    // - the domain has clicks
    // - there are still links associated with the domain and those links have clicks
    if (clicks > 0) {
      return await log({
        message: `Domain *${domain}* has been invalid for > 30 days but has clicks, skipping.`,
        type: "cron",
      });
    } else if (linksCount > 0) {
      const linksClicks = await prisma.link.aggregate({
        _sum: {
          clicks: true,
        },
        where: {
          domain,
        },
      });
      if (linksClicks._sum?.clicks) {
        return await log({
          message: `Domain *${domain}* has been invalid for > 30 days but has links with clicks, skipping.`,
          type: "cron",
        });
      }
    }
    // else, delete the domain
    return await Promise.allSettled([
      deleteDomainAndLinks(domain).then(async () => {
        // check if there are any domains left for the project
        const remainingDomains = await prisma.domain.count({
          where: {
            projectId: project.id,
          },
        });
        // if the deleted domain was the only domain, delete the project as well
        if (remainingDomains === 0) {
          return prisma.project.delete({
            where: {
              slug: projectSlug,
            },
          });
          // if the deleted domain was primary, make another domain primary
        } else if (primary) {
          const anotherDomain = await prisma.domain.findFirst({
            where: {
              projectId: project.id,
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
        message: `Domain *${domain}* has been invalid for > 30 days and ${
          linksCount > 0 ? "has links but no link clicks" : "has no links"
        }, deleting.`,
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
              projectSlug,
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
        projectSlug,
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
        projectSlug,
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
  projectSlug,
  domain,
  invalidDays,
  emails,
  type,
}: {
  projectSlug: string;
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
            projectSlug,
            invalidDays,
          }),
        }),
      ),
    ),
    prisma.sentEmail.create({
      data: {
        project: {
          connect: {
            slug: projectSlug,
          },
        },
        type: `${type}DomainInvalidEmail:${domain}`,
      },
    }),
  ]);
};
