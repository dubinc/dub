import { prisma } from "@dub/prisma";
import { isGenericEmail } from "../is-generic-email";
import { plain, PlainUser } from "./client";
import { upsertPlainCustomer } from "./upsert-plain-customer";

export const syncCustomerPlanToPlain = async ({
  customer,
}: {
  customer: PlainUser;
}) => {
  if (!customer.email) {
    console.log(
      `Customer email is null for user ${customer.id}, skipping sync...`,
    );
    return;
  }

  await upsertPlainCustomer({
    id: customer.id,
    name: customer.name,
    email: customer.email,
  });

  const plainCustomer = await plain.getCustomerByExternalId({
    externalId: customer.id,
  });

  let companyDomainName: string | undefined;
  if (!isGenericEmail(customer.email)) {
    companyDomainName = customer.email.split("@")[1];
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
              userId: customer.id,
            },
      },
    },
    orderBy: {
      usageLimit: "desc",
    },
    take: 1,
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
      `Synced customer ${customer.email}'s plan in Plain to ${topWorkspace.plan}`,
    );
  }

  return plainCustomer;
};
