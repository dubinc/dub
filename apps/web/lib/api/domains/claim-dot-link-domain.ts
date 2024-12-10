import { DubApiError } from "@/lib/api/errors";
import { createLink } from "@/lib/api/links";
import { qstash } from "@/lib/cron";
import { registerDomain } from "@/lib/dynadot/register-domain";
import { WorkspaceWithUsers } from "@/lib/types";
import { prisma } from "@dub/prisma";
import {
  ACME_WORKSPACE_ID,
  APP_DOMAIN_WITH_NGROK,
  DEFAULT_LINK_PROPS,
} from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { sendEmail } from "emails";
import DomainClaimed from "emails/domain-claimed";
import { addDomainToVercel } from "./add-domain-vercel";
import { deleteDomainAndLinks } from "./delete-domain-links";

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

  if (workspace.id !== ACME_WORKSPACE_ID) {
    if (workspace.dotLinkClaimed) {
      throw new DubApiError({
        code: "forbidden",
        message: "Workspace is limited to one free .link domain.",
      });
    }
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
    Promise.all([
      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/domains/configure-dns`,
        // delete after 3 mins
        delay: 3 * 60,
        body: {
          domain,
        },
      }),
      // add domain to Vercel
      addDomainToVercel(domain),
      // send email to workspace owners
      sendDomainClaimedEmails({ workspace, domain }),
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
