import { CreateThreadInput, PlainClient } from "@team-plain/typescript-sdk";
import { Session } from "./auth";

export const plain = new PlainClient({
  apiKey: process.env.PLAIN_API_KEY as string,
});

type PlainUser = Pick<Session["user"], "id" | "name" | "email">;

export const upsertPlainCustomer = async (user: PlainUser) => {
  return await plain.upsertCustomer({
    identifier: {
      externalId: user.id,
    },
    onCreate: {
      fullName: user.name,
      shortName: user.name,
      email: {
        email: user.email,
        isVerified: true,
      },
      externalId: user.id,
    },
    onUpdate: {},
  });
};

export const createPlainThread = async ({
  user,
  ...rest
}: {
  user: PlainUser;
} & Omit<CreateThreadInput, "customerIdentifier">) => {
  let plainCustomerId: string | undefined;
  const plainCustomer = await plain.getCustomerByEmail({
    email: user.email ?? "",
  });

  if (plainCustomer.data) {
    plainCustomerId = plainCustomer.data.id;
  } else {
    const { data } = await upsertPlainCustomer({
      id: user.id,
      name: user.name ?? "",
      email: user.email ?? "",
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
