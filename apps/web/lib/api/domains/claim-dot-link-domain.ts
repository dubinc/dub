import { DubApiError } from "@/lib/api/errors";
import { createLink } from "@/lib/api/links";
import { registerDomain } from "@/lib/dynadot/register-domain";
import { WorkspaceWithUsers } from "@/lib/types";
import { sendEmail } from "@dub/email";
import DomainClaimed from "@dub/email/templates/domain-claimed";
import { prisma } from "@dub/prisma";
import { DEFAULT_LINK_PROPS } from "@dub/utils";
import { get } from "@vercel/edge-config";
import { waitUntil } from "@vercel/functions";
import { addDomainToVercel } from "./add-domain-vercel";
import { configureVercelNameservers } from "./configure-vercel-nameservers";
import { markDomainAsDeleted } from "./mark-domain-deleted";

export async function claimDotLinkDomain({
  domain,
  workspace,
  userId,
  skipWorkspaceChecks = false,
}: {
  domain: string;
  workspace: WorkspaceWithUsers;
  userId: string;
  skipWorkspaceChecks?: boolean; // when used in /api/domains/register
}) {
  if (!skipWorkspaceChecks) {
    if (workspace.plan === "free")
      throw new DubApiError({
        code: "forbidden",
        message: "Free workspaces cannot register .link domains.",
      });

    if (!workspace.stripeId) {
      throw new DubApiError({
        code: "forbidden",
        message: "You cannot register a .link domain on a free trial.",
      });
    }

    if (workspace.dotLinkClaimed) {
      throw new DubApiError({
        code: "forbidden",
        message: "You are limited to one free .link domain per workspace.",
      });
    }
  }

  const customDomainTerms = await get("customDomainTerms");

  if (customDomainTerms && Array.isArray(customDomainTerms)) {
    const customDomainTermsRegex = new RegExp(
      customDomainTerms
        .map((term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) // replace special characters with escape sequences
        .join("|"),
    );

    if (customDomainTermsRegex.test(domain)) {
      throw new DubApiError({
        code: "forbidden",
        message: "Domain is not allowed.",
      });
    }
  }

  const [response, totalDomains, matchingUnverifiedDomain] = await Promise.all([
    // register the domain
    registerDomain({ domain }),

    // count the number of domains in the workspace
    prisma.domain.count({
      where: {
        projectId: workspace.id,
      },
    }),

    // find the unverified domain that matches the domain
    prisma.domain.findFirst({
      where: {
        slug: domain,
        verified: false,
      },
      include: {
        registeredDomain: true,
      },
    }),
  ]);

  // if the domain was added to a different workspace but is not verified
  // we should remove it to free up the domain for the current workspace
  if (matchingUnverifiedDomain) {
    const { slug } = matchingUnverifiedDomain;

    await markDomainAsDeleted({
      domain: slug,
    });
  }

  await Promise.all([
    // Create the workspace domain
    prisma.domain.create({
      data: {
        projectId: workspace.id,
        slug: domain,
        verified: true,
        lastChecked: new Date(),
        primary: totalDomains === 0,
        registeredDomain: {
          create: {
            slug: domain,
            expiresAt: new Date(response.expiration || ""),
            projectId: workspace.id,
          },
        },
      },
    }),

    // Create the root link
    createLink({
      ...DEFAULT_LINK_PROPS,
      domain,
      key: "_root",
      url: "",
      tags: undefined,
      userId: userId,
      projectId: workspace.id,
    }),
  ]);

  waitUntil(
    Promise.all([
      // add domain to Vercel + configure it to use Vercel nameservers
      addDomainToVercel(domain).then(() => configureVercelNameservers(domain)),

      // send email to workspace owners
      !skipWorkspaceChecks
        ? sendDomainClaimedEmails({ workspace, domain })
        : Promise.resolve(),

      // update workspace to set dotLinkClaimed to true
      prisma.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          dotLinkClaimed: true,
        },
      }),
    ]),
  );

  return response;
}

const sendDomainClaimedEmails = async ({
  workspace,
  domain,
}: {
  workspace: Pick<WorkspaceWithUsers, "id" | "slug">;
  domain: string;
}) => {
  const workspaceWithOwner = await prisma.project.findUniqueOrThrow({
    where: {
      id: workspace.id,
    },
    include: {
      users: {
        where: {
          role: "owner",
        },
        select: {
          user: true,
        },
      },
    },
  });

  workspaceWithOwner.users.map(({ user }) => {
    if (user.email) {
      sendEmail({
        email: user.email,
        subject: "Successfully claimed your .link domain!",
        react: DomainClaimed({
          email: user.email,
          domain,
          workspaceSlug: workspace.slug,
        }),
      });
    }
  });
};
