import { isStored, storage } from "@/lib/storage";
import { prisma } from "@dub/prisma";
import { R2_URL } from "@dub/utils";
import { logAndRespond } from "../../utils";
import {
  DeleteWorkspacePayload,
  enqueueNextWorkspaceDeleteStep,
} from "./utils";

const MAX_CUSTOMERS_PER_BATCH = 100;

export async function deleteWorkspaceCustomersBatch(
  payload: DeleteWorkspacePayload,
) {
  const { workspaceId, startingAfter } = payload;

  console.log(`Deleting customers for workspace ${workspaceId}...`);

  const workspace = await prisma.project.findUnique({
    where: {
      id: workspaceId,
    },
    select: {
      id: true,
    },
  });

  if (!workspace) {
    return logAndRespond(`Workspace ${workspaceId} not found. Skipping...`);
  }

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

  if (customers.length === 0) {
    return logAndRespond(
      `No more customers to delete for workspace ${workspaceId}. Skipping...`,
    );
  }

  // Delete customer avatars from storage
  await Promise.all(
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

  await enqueueNextWorkspaceDeleteStep({
    payload,
    currentStep: "delete-customers",
    nextStep: "delete-workspace",
    items: customers,
    maxBatchSize: MAX_CUSTOMERS_PER_BATCH,
  });
}
