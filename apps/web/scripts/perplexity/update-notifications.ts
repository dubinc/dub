import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// bulk update notification preferences for a project
async function main() {
  const notificationPreferences = await prisma.notificationPreference.findMany({
    where: {
      AND: [
        {
          projectUser: {
            projectId: "xxx",
          },
        },
        {
          projectUser: {
            user: {
              email: {
                notIn: ["hello@example.com"],
              },
            },
          },
        },
      ],
    },
  });

  console.log(
    `Found ${notificationPreferences.length} notification preferences to update`,
  );

  const res = await prisma.notificationPreference.updateMany({
    where: {
      id: {
        in: notificationPreferences.map(
          (notificationPreference) => notificationPreference.id,
        ),
      },
    },
    data: {
      newPartnerApplication: false,
      newPartnerSale: false,
      newMessageFromPartner: false,
    },
  });

  console.log(`Updated ${res.count} notification preferences`);
}

main();
