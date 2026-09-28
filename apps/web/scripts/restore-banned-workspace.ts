import { generateRandomString } from "@/lib/api/utils/generate-random-string";
import { prisma } from "@/lib/prisma";
import { LEGAL_USER_ID, nanoid } from "@dub/utils";
import "dotenv-flow/config";
import { linkCache } from "../lib/api/links/cache";

const WORKSPACE_ID = "ws_xxx";
const WORKSPACE_NAME = "xxx";
const WORKSPACE_SLUG = "xxx";
const USER_ID = "user_xxx";

const LINK_IDS = [];

async function main() {
  let workspace = await prisma.project.findUnique({
    where: {
      id: WORKSPACE_ID,
    },
  });

  if (!workspace) {
    workspace = await prisma.project.create({
      data: {
        id: WORKSPACE_ID,
        name: WORKSPACE_NAME,
        slug: WORKSPACE_SLUG,
        billingCycleStart: new Date().getDate(),
        invoicePrefix: generateRandomString(8),
        inviteCode: nanoid(24),
        defaultDomains: {
          create: {},
        },
        users: {
          create: {
            userId: LEGAL_USER_ID,
            role: "owner",
            notificationPreference: {
              create: {},
            },
          },
        },
      },
    });

    console.log(`Created workspace ${workspace.slug} (${workspace.id})`);
  } else {
    console.log(
      `Workspace already exists: ${workspace.slug} (${workspace.id})`,
    );

    await prisma.projectUsers.upsert({
      where: {
        userId_projectId: {
          userId: LEGAL_USER_ID,
          projectId: WORKSPACE_ID,
        },
      },
      create: {
        userId: LEGAL_USER_ID,
        projectId: WORKSPACE_ID,
        role: "owner",
        notificationPreference: {
          create: {},
        },
      },
      update: {
        role: "owner",
      },
    });

    console.log(`Added legal user ${LEGAL_USER_ID} as workspace owner`);
  }

  const links = await prisma.link.findMany({
    where: {
      id: {
        in: LINK_IDS,
      },
    },
    select: {
      id: true,
      domain: true,
      key: true,
      projectId: true,
      userId: true,
    },
  });

  const missingLinkIds = LINK_IDS.filter(
    (id) => !links.some((link) => link.id === id),
  );

  if (missingLinkIds.length > 0) {
    console.log(`Missing ${missingLinkIds.length} links:`, missingLinkIds);
  }

  console.table(links);

  if (links.length === 0) {
    console.log("No links found to restore.");
    return;
  }

  const [redisRes, prismaRes] = await Promise.allSettled([
    linkCache.expireMany(links),
    prisma.link.updateMany({
      where: {
        id: {
          in: links.map((link) => link.id),
        },
      },
      data: {
        projectId: WORKSPACE_ID,
        userId: USER_ID,
      },
    }),
  ]);

  await prisma.project.update({
    where: {
      id: WORKSPACE_ID,
    },
    data: {
      totalLinks: links.length,
    },
  });

  console.log(
    `Restored ${links.length} links to ${workspace.slug}`,
    redisRes,
    prismaRes,
  );
}

main();
