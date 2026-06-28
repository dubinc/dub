import { createLink } from "@/lib/api/links";
import { registerDomain } from "@/lib/dynadot/register-domain";
import { searchDomainsAvailability } from "@/lib/dynadot/search-domains";
import { prisma } from "@/lib/prisma";
import { sendBatchEmail } from "@dub/email";
import DomainRegistered from "@dub/email/templates/domain-registered";
import { DEFAULT_LINK_PROPS } from "@dub/utils";
import { addDomainToVercel } from "./add-domain-vercel";
import { configureVercelNameservers } from "./configure-vercel-nameservers";
import { markDomainAsDeleted } from "./mark-domain-deleted";

export async function finalizePremiumDomainRegistration({
  domain,
  workspaceId,
}: {
  domain: string;
  workspaceId: string;
}) {
  const workspace = await prisma.project.findUniqueOrThrow({
    where: { id: workspaceId },
    select: {
      id: true,
      slug: true,
      users: {
        where: { role: "owner" },
        select: { userId: true },
        take: 1,
      },
    },
  });

  const userId = workspace.users[0]?.userId;
  if (!userId) {
    return `No workspace owner found to finalize registration for ${domain}.`;
  }

  const existingDomain = await prisma.domain.findUnique({
    where: {
      slug: domain,
      verified: true,
    },
  });

  if (existingDomain) {
    return `Domain ${domain} is already registered, skipping...`;
  }

  const searchResults = await searchDomainsAvailability({
    domains: { domain0: domain },
  });
  const domainStatus = searchResults[0];

  const [response, totalDomains, matchingUnverifiedDomain] = await Promise.all([
    registerDomain({ domain, premium: true }),
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

  if (matchingUnverifiedDomain) {
    await markDomainAsDeleted({
      domain: matchingUnverifiedDomain.slug,
    });
  }

  await Promise.allSettled([
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
            renewalFee: domainStatus.prices?.renewal ?? 1200,
          },
        },
      },
    }),
    createLink({
      ...DEFAULT_LINK_PROPS,
      domain,
      key: "_root",
      url: "",
      tags: undefined,
      userId,
      projectId: workspace.id,
    }),
    addDomainToVercel(domain).then(() => configureVercelNameservers(domain)),
    sendDomainRegisteredEmails({ workspace, domain }),
  ]);

  return `Premium domain ${domain} registered successfully.`;
}

export const sendDomainRegisteredEmails = async ({
  workspace,
  domain,
}: {
  workspace: { id: string; slug: string };
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

  return await sendBatchEmail(
    workspaceWithOwner.users.map(({ user }) => ({
      variant: "notifications",
      to: user.email!,
      subject: "Your premium .link domain has been registered!",
      react: DomainRegistered({
        email: user.email!,
        domain,
        workspaceSlug: workspace.slug,
      }),
    })),
  );
};
