import { prisma } from "@dub/prisma";
import { isGenericEmail } from "../is-generic-email";
import { plain, PlainUser } from "./client";
import { upsertPlainCustomer } from "./upsert-plain-customer";

export const syncUserPlanToPlain = async (user: PlainUser) => {
  if (!user.email) {
    console.log(`User ${user.id} has no email, skipping sync...`);
    return;
  }

  await upsertPlainCustomer({
    id: user.id,
    name: user.name,
    email: user.email,
  });

  const plainCustomer = await plain.getCustomerByExternalId({
    externalId: user.id,
  });

  let companyDomainName: string | undefined;
  if (!isGenericEmail(user.email)) {
    companyDomainName = user.email.split("@")[1];
  }

  const topWorkspace = await prisma.project.findFirst({
    where: {
      users: {
        some: companyDomainName
          ? {
              user: {
                email: {
                  endsWith: `@${companyDomainName}`,
                },
              },
            }
          : {
              userId: user.id,
            },
      },
    },
    orderBy: {
      usageLimit: "desc",
    },
  });

  if (!topWorkspace) {
    console.log(
      `No workspace found for company domain ${companyDomainName}, skipping sync...`,
    );
    return;
  }

  if (plainCustomer.data) {
    await Promise.allSettled([
      plain.addCustomerToCustomerGroups({
        customerId: plainCustomer.data.id,
        customerGroupIdentifiers: [
          {
            customerGroupKey: "app.dub.co",
          },
        ],
      }),
      ...(companyDomainName
        ? [
            plain.updateCompanyTier({
              companyIdentifier: {
                companyDomainName,
              },
              tierIdentifier: {
                externalId: topWorkspace.plan.split(" ")[0].toLowerCase(),
              },
            }),
          ]
        : []),
    ]);

    console.log(
      `Synced user ${user.id}'s plan in Plain to ${topWorkspace.plan}`,
    );
  }

  return plainCustomer;
};
