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

  const plainCustomer = await plain.getCustomerByEmail({
    email: user.email,
  });

  let plainCustomerId: string | undefined;
  if (plainCustomer.data) {
    plainCustomerId = plainCustomer.data.id;
  } else {
    const { data } = await upsertPlainCustomer({
      id: user.id,
      name: user.name,
      email: user.email,
    });
    if (data) {
      plainCustomerId = data.customer.id;
    }
  }

  const { data, error } = await plain.createThread({
    customerIdentifier: {
      customerId: plainCustomerId,
    },
    ...rest,
  });

  if (error) {
    throw new Error(`Failed to create thread: ${error.message}`);
  }

  return data;
};
