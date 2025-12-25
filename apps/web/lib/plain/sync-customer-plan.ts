import { prisma } from "@dub/prisma";
import { isGenericEmail } from "../is-generic-email";
import { plain } from "./client";

export const syncCustomerPlanToPlain = async ({
  customer,
}: {
  customer: {
    id: string;
    name: string | null;
    email: string | null;
  };
}) => {
  if (!customer.email) {
    console.log(
      `Customer email is null for user ${customer.id}, skipping sync...`,
    );
    return;
  }
  const customerName = customer.name || customer.email.split("@")[0];

  await plain.upsertCustomer({
    identifier: {
      emailAddress: customer.email,
    },
    onCreate: {
      fullName: customerName,
      shortName: customerName.split(" ")[0],
      email: {
        email: customer.email,
        isVerified: true,
      },
      externalId: customer.id,
    },
    onUpdate: {
      externalId: {
        value: customer.id,
      },
    },
  });

  const plainCustomer = await plain.getCustomerByEmail({
    email: customer.email,
  });

  console.log(
    `Synced customer ${customer.email} to Plain (ID: ${plainCustomer.data?.id})`,
  );

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
            customerGroupKey: topWorkspace.plan.split(" ")[0].toLowerCase(),
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
