import { isGenericEmail } from "@/lib/is-generic-email";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const workspaces = await prisma.project.findMany({
    where: {
      ssoEmailDomain: null,
      plan: "enterprise",
    },
    select: {
      id: true,
      name: true,
      ssoEmailDomain: true,
      users: {
        where: {
          role: "owner",
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 1,
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

  const workspacesToUpdate: any[] = [];

  for (const workspace of workspaces) {
    const email = workspace.users[0]?.user?.email;
    const emailDomain = email ? email.split("@")[1]?.toLowerCase() : undefined;

    if (!emailDomain || (email && isGenericEmail(email))) {
      console.log(
        `Workspace ${workspace.name}'s email domain (${emailDomain}) is invalid or generic, skipping...`,
      );
      continue;
    }

    workspacesToUpdate.push({
      id: workspace.id,
      name: workspace.name,
      ssoEmailDomain: emailDomain,
    });
  }

  console.table(workspacesToUpdate);

  await Promise.allSettled(
    workspacesToUpdate.map((workspace) =>
      prisma.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          ssoEmailDomain: workspace.ssoEmailDomain,
        },
      }),
    ),
  );
}

main();
