import { sendEmail } from "emails";
import { log } from "#/lib/utils";
import { deleteDomainAndLinks } from "#/lib/api/domains";
import prisma from "#/lib/prisma";
import InvalidDomain from "emails/invalid-domain";
import DomainDeleted from "emails/domain-deleted";
import { limiter } from "#/lib/cron";

export const handleDomainUpdates = async ({
  domain,
  createdAt,
  verified,
  changed,
  linksCount,
}: {
  domain: string;
  createdAt: Date;
  verified: boolean;
  changed: boolean;
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
      _count: {
        select: {
          domains: true,
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
  const projectName = project.name;
  const projectSlug = project.slug;
  const sentEmails = project.sentEmails.map((email) => email.type);
  const emails = project.users.map((user) => user.user.email) as string[];

  // if domain is invalid for more than 30 days, check if we can delete it
  if (invalidDays >= 30) {
    // if there are still links associated with the domain,
    // and those links have clicks associated with them,
    // don't delete the domain (manual inspection required)
    if (linksCount > 0) {
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
          message: `Domain *${domain}* has been invalid for > 30 days and has links with clicks, skipping.`,
          type: "cron",
        });
      }
    }
    // else, delete the domain, but first,
    // check if the project needs to be deleted as well
    const deleteProjectAsWell = project._count.domains === 1;

    return await Promise.allSettled([
      deleteDomainAndLinks(domain).then(() => {
        if (deleteProjectAsWell) {
          return prisma.project.delete({
            where: {
              slug: projectSlug,
            },
          });
        }
      }),
      log({
        message: `Domain *${domain}* has been invalid for > 30 days and ${
          linksCount > 0 ? "has links but no link clicks" : "has no links"
        }, deleting. ${
          deleteProjectAsWell
            ? "Since this is the only domain for the project, the project will be deleted as well."
            : ""
        }`,
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
      "secondDomainInvalidEmail",
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
      "firstDomainInvalidEmail",
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
        type: `${type}DomainInvalidEmail`,
      },
    }),
  ]);
};
