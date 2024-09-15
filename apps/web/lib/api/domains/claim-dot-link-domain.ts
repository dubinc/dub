import { DubApiError } from "@/lib/api/errors";
import { createLink } from "@/lib/api/links";
import { configureDNS } from "@/lib/dynadot/configure-dns";
import { registerDomain } from "@/lib/dynadot/register-domain";
import { prisma } from "@/lib/prisma";
import { WorkspaceWithUsers } from "@/lib/types";
import { DEFAULT_LINK_PROPS } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
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

  const response = await registerDomain({ domain });
  const slug = response.RegisterResponse.DomainName;

  const totalDomains = await prisma.domain.count({
    where: {
      projectId: workspace.id,
    },
  });

  // Delete any matching unverified domain
  await prisma.domain.deleteMany({
    where: {
      slug,
      verified: false,
      registeredDomain: {
        is: null,
      },
    },
  });

  await Promise.all([
    // Create the workspace domain
    prisma.domain.create({
      data: {
        projectId: workspace.id,
        slug,
        verified: true,
        lastChecked: new Date(),
        primary: totalDomains === 0,
        registeredDomain: {
          create: {
            slug,
            expiresAt: new Date(response.RegisterResponse.Expiration || ""),
            projectId: workspace.id,
          },
        },
      },
    }),
    // Create the root link
    createLink({
      ...DEFAULT_LINK_PROPS,
      domain: slug,
      key: "_root",
      url: "",
      tags: undefined,
      userId: userId,
      projectId: workspace.id,
    }),
  ]);

  // Configure the DNS in the background
  waitUntil(configureDNS({ domain: slug }));

  return response;
}
