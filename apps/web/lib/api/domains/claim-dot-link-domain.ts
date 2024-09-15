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
import { addDomainToVercel } from "./add-domain-vercel";
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

  if (registeredDotLinkDomain) {
    throw new DubApiError({
      code: "forbidden",
      message: "Workspace is limited to one free .link domain.",
    });
  }

  const [response, totalDomains, matchingUnverifiedDomain] = await Promise.all([
    // register the domain
    registerDomain({ domain }),
    prisma.domain.count({
      where: {
        projectId: workspace.id,
      },
    }),
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

  // if for some reason the domain is already registered, we should fail
  if (response.RegisterResponse.Error) {
    throw new DubApiError({
      code: "forbidden",
      message: response.RegisterResponse.Error,
    });
  }

  // if the domain was added to a different workspace but is not verified
  // we should remove it to free up the domain for the current workspace
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
      await Promise.all([
        // configure the DNS with Dynadot
        configureDNS({ domain }),
        // add domain to Vercel
        addDomainToVercel(domain),
      ]);

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
