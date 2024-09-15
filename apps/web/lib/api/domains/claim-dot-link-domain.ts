import { DubApiError } from "@/lib/api/errors";
import { createLink } from "@/lib/api/links";
import { configureDNS } from "@/lib/dynadot/configure-dns";
import { registerDomain } from "@/lib/dynadot/register-domain";
import { prisma } from "@/lib/prisma";
import { WorkspaceWithUsers } from "@/lib/types";
import { DEFAULT_LINK_PROPS } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { sendEmail } from "emails";
import DomainClaimed from "emails/domain-claimed";
import { deleteDomainAndLinks } from "./delete-domain-links";
import { getRegisteredDotlinkDomain } from "./get-registered-dotlink-domain";

export async function claimDotLinkDomain({
  domain,
  workspace,
  userId,
}: {
  domain: string;
  workspace: WorkspaceWithUsers;
  userId: string;
}) {
  if (workspace.plan === "free")
    throw new DubApiError({
      code: "forbidden",
      message: "Free workspaces cannot register .link domains.",
    });

  const registeredDotLinkDomain = await getRegisteredDotlinkDomain(
    workspace.id,
  );

  if (registeredDotLinkDomain)
    throw new DubApiError({
      code: "forbidden",
      message: "Workspace is limited to one free .link domain.",
    });

  const [response, totalDomains, matchingUnverifiedDomain] = await Promise.all([
    registerDomain({ domain }),
    prisma.domain.count({
      where: {
        projectId: workspace.id,
      },
    }),
    prisma.domain.findUnique({
      where: {
        slug: domain,
      },
      include: {
        registeredDomain: true,
      },
    }),
  ]);

  if (matchingUnverifiedDomain) {
    await deleteDomainAndLinks(matchingUnverifiedDomain.slug);
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
            expiresAt: new Date(response.RegisterResponse.Expiration || ""),
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
    (async () => {
      // configure the DNS in the background
      await configureDNS({ domain });

      // once domain is provisioned, send email
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
    })(),
  );

  return response;
}
