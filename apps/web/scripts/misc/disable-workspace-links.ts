import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";
import { linkCache } from "../../lib/api/links/cache";
import { queueBatchEmail } from "../../lib/email/queue-batch-email";

// script to disable all links for a workspace
async function main() {
  const project = await prisma.project.findUniqueOrThrow({
    where: {
      slug: "xxx",
    },
    include: {
      users: {
        where: {
          role: "owner",
          user: {
            email: {
              not: null,
            },
          },
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

  while (true) {
    const linksToDisable = await prisma.link.findMany({
      where: {
        projectId: project.id,
        disabledAt: null,
      },
      take: 100,
    });
    if (linksToDisable.length === 0) {
      console.log("No more links to disable. Exiting...");
      break;
    }

    if (linksToDisable.length > 0) {
      const disabledLinks = await prisma.link.updateMany({
        where: {
          id: {
            in: linksToDisable.map((link) => link.id),
          },
        },
        data: {
          disabledAt: new Date(),
        },
      });

      console.log(`Disabled ${disabledLinks.count} links`);

      const res = await linkCache.expireMany(linksToDisable);
      console.log(res);
    }
  }

  const owners = project.users.map(({ user }) => user.email);

  if (owners.length > 0) {
    await queueBatchEmail(
      owners.map((email) => ({
        to: email!,
        variant: "notifications",
        subject: "Your Dub workspace has been disabled",
        templateName: "WorkspaceDisabled",
        templateProps: {
          email: email!,
          workspace: {
            name: project.name,
            slug: project.slug,
            usage: project.usage,
            usageLimit: project.usageLimit,
            plan: project.plan,
          },
        },
      })),
    );
  }

  const updatedOwners = await prisma.projectUsers.updateMany({
    where: {
      projectId: project.id,
      role: "owner",
    },
    data: {
      role: "billing",
    },
  });

  console.log(`Updated ${updatedOwners.count} owners to billing role`);

  const updatedMembers = await prisma.projectUsers.updateMany({
    where: {
      projectId: project.id,
      role: "member",
    },
    data: {
      role: "viewer",
    },
  });

  console.log(`Updated ${updatedMembers.count} members to viewer role`);
}

main();
