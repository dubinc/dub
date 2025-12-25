import { CreateThreadInput } from "@team-plain/typescript-sdk";
import { plain, PlainUser } from "./client";
import { upsertPlainCustomer } from "./upsert-plain-customer";

export const createPlainThread = async ({
  user,
  ...rest
}: {
  user: PlainUser;
} & Omit<CreateThreadInput, "customerIdentifier">) => {
  if (!user.email) {
    throw new Error("User email is required");
  }

  const { data: upsertResult } = await upsertPlainCustomer({
    id: user.id,
    name: user.name,
    email: user.email,
  });

  if (!upsertResult) {
    throw new Error("Failed to upsert plain customer");
  }

  const { data, error } = await plain.createThread({
    customerIdentifier: {
      customerId: upsertResult.customer.id,
    },
    ...rest,
  });

  if (error) {
    throw new Error(`Failed to create thread: ${error.message}`);
  }

  return data;
};
