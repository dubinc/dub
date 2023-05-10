import sendMail from "emails";
import InvalidDomain from "emails/InvalidDomain";
import DomainDeleted from "emails/DomainDeleted";
import { log } from "@/lib/utils";
import { removeDomainFromVercel } from "@/lib/api/domains";
import prisma from "@/lib/prisma";
import { redis } from "../upstash";

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
    // only delete if there are no links associated with the domain
    if (linksCount === 0) {
      return await Promise.all([
        removeDomainFromVercel(domain), // remove domain from Vercel project
        redis.del(`root:${domain}`), // there are no links anyway, so you can just delete the root domain from redis if exists
        prisma.domain.delete({
          where: {
            slug: domain,
          },
        }),
        log(
          `Domain *${domain}* has been invalid for > 30 days and has no links, deleting.`,
          "cron",
        ),
        sendMail({
          subject: `Your domain ${domain} has been deleted`,
          to: ownerEmail,
          component: (
            <DomainDeleted domain={domain} projectSlug={projectSlug} />
          ),
        }),
      ]);
    } else {
      console.log(
        `Domain *${domain}* has been invalid for > 30 days but has links, not deleting.`,
        "cron",
        true,
      );
    }
    return;
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
  return await Promise.all([
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
