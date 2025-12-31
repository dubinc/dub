import { isStored, storage } from "@/lib/storage";
import { prisma } from "@dub/prisma";
import { R2_URL } from "@dub/utils";
import {
  DeleteWorkspacePayload,
  enqueueNextWorkspaceDeleteStep,
} from "./utils";

const MAX_CUSTOMERS_PER_BATCH = 100;

export async function deleteWorkspaceCustomers(
  payload: DeleteWorkspacePayload,
) {
  const { workspaceId, startingAfter } = payload;

  const customers = await prisma.customer.findMany({
    where: {
      projectId: workspaceId,
    },
    orderBy: {
      id: "asc",
    },
    ...(startingAfter && {
      skip: 1,
      cursor: {
        id: startingAfter,
      },
    }),
    take: MAX_CUSTOMERS_PER_BATCH,
  });

  if (customers.length > 0) {
    // Delete customer avatars from storage
    await Promise.allSettled(
      customers.map(async (customer) => {
        if (customer.avatar && isStored(customer.avatar)) {
          await storage.delete({
            key: customer.avatar.replace(`${R2_URL}/`, ""),
          });
        }
      }),
    );

    const deletedCustomers = await prisma.customer.deleteMany({
      where: {
        id: {
          in: customers.map(({ id }) => id),
        },
      },
    });

    console.log(
      `Deleted ${deletedCustomers.count} customers for workspace ${workspaceId}.`,
    );
  }

  return await enqueueNextWorkspaceDeleteStep({
    payload,
    currentStep: "delete-customers",
    nextStep: "delete-workspace",
    items: customers,
    maxBatchSize: MAX_CUSTOMERS_PER_BATCH,
  });
}
