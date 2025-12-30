import { prisma } from "@dub/prisma";
import { isGenericEmail } from "../is-generic-email";
import { plain, PlainUser } from "./client";
import { upsertPlainCustomer } from "./upsert-plain-customer";

export const syncUserPlanToPlain = async (user: PlainUser) => {
  if (!user.email) {
    console.log(`User ${user.id} has no email, skipping sync...`);
    return;
  }

  const { data } = await upsertPlainCustomer({
    id: user.id,
    name: user.name,
    email: user.email,
  });

  if (!data) {
    console.log(
      `Failed to upsert plain customer for user ${user.id}, skipping sync...`,
    );
    return;
  }
  const plainCustomer = data.customer;

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
    console.log(`No workspace found for user ${user.email}, skipping sync...`);
    return;
  }

  await Promise.allSettled([
    plain.addCustomerToCustomerGroups({
      customerId: plainCustomer.id,
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

  await plain.addCustomerToCustomerGroups({
    customerId: plainCustomer.id,
    customerGroupIdentifiers: [
      {
        customerGroupKey: "app.dub.co",
      },
    ],
  });

  console.log(`Synced user ${user.id}'s plan in Plain to ${topWorkspace.plan}`);

  return plainCustomer;
};
