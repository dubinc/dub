import sendMail from "emails";
import InvalidDomain from "emails/InvalidDomain";
import DomainDeleted from "emails/DomainDeleted";
import { log } from "#/lib/utils";
import { deleteDomainAndLinks } from "#/lib/api/domains";
import prisma from "#/lib/prisma";

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
    await log(
      `Domain *${domain}* changed status to *${verified}*`,
      "cron",
      verified,
    );
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
      slug: true,
      sentEmails: true,
      usage: true,
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
      _count: {
        select: {
          domains: true,
        },
      },
    },
  });
  if (!project) {
    await log(
      `Domain *${domain}* is invalid but not associated with any project, skipping.`,
      "cron",
      true,
    );
    return;
  }
  const projectSlug = project.slug;
  const sentEmails = project.sentEmails.map((email) => email.type);
  const ownerEmail = project.users[0].user.email as string;

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
        return await log(
          `Domain *${domain}* has been invalid for > 30 days and has links with clicks, skipping.`,
          "cron",
          true,
        );
      }
    }
    // else, delete the domain, but first,
    // check if the project needs to be deleted as well
    const deleteProjectAsWell = project._count.domains === 1;

    return await Promise.allSettled([
      deleteDomainAndLinks(domain).then(() => {
        deleteProjectAsWell &&
          prisma.project.delete({
            where: {
              slug: projectSlug,
            },
          });
      }),
      log(
        `Domain *${domain}* has been invalid for > 30 days and ${
          linksCount > 0 ? "has links but no link clicks" : "has no links"
        }, deleting. ${
          deleteProjectAsWell
            ? "Since this is the only domain for the project, the project will be deleted as well."
            : ""
        }`,
        "cron",
      ),
      sendMail({
        subject: `Your domain ${domain} has been deleted`,
        to: ownerEmail,
        component: <DomainDeleted domain={domain} projectSlug={projectSlug} />,
      }),
    ]);
  }

  if (invalidDays >= 28) {
    const sentSecondDomainInvalidEmail = sentEmails.includes(
      "secondDomainInvalidEmail",
    );
    if (!sentSecondDomainInvalidEmail) {
      sendDomainInvalidEmail({
        projectSlug,
        domain,
        invalidDays,
        ownerEmail,
        type: "second",
      });
    }
    return;
  }

  if (invalidDays >= 14) {
    const sentFirstDomainInvalidEmail = sentEmails.includes(
      "firstDomainInvalidEmail",
    );
    if (!sentFirstDomainInvalidEmail) {
      sendDomainInvalidEmail({
        projectSlug,
        domain,
        invalidDays,
        ownerEmail,
        type: "first",
      });
    }
    return;
  }
  return;
};

const sendDomainInvalidEmail = async ({
  projectSlug,
  domain,
  invalidDays,
  ownerEmail,
  type,
}: {
  projectSlug: string;
  domain: string;
  invalidDays: number;
  ownerEmail: string;
  type: "first" | "second";
}) => {
  return await Promise.allSettled([
    log(
      `Domain *${domain}* is invalid for ${invalidDays} days, email sent.`,
      "cron",
    ),
    sendMail({
      subject: `Your domain ${domain} needs to be configured`,
      to: ownerEmail,
      component: (
        <InvalidDomain
          domain={domain}
          projectSlug={projectSlug}
          invalidDays={invalidDays}
        />
      ),
    }),
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
