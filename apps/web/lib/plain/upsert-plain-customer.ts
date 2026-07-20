import { plain, PlainUser } from "./client";

export const upsertPlainCustomer = async (
  user: PlainUser & { email: string },
) => {
  const fullName = user.name || user.email;
  const shortName = user.name || user.email.split("@")[0];

  return await plain.upsertCustomer({
    identifier: {
      emailAddress: user.email,
    },
    onCreate: {
      fullName,
      shortName,
      email: {
        email: user.email,
        isVerified: true,
      },
      externalId: user.id,
    },
    onUpdate: {
      fullName: {
        value: fullName,
      },
      shortName: {
        value: shortName,
      },
      externalId: {
        value: user.id,
      },
    },
  });
};

// Sync Plain customer email by Dub user id (externalId).
export const syncPlainCustomerEmail = async (
  user: PlainUser & { email: string },
) => {
  const fullName = user.name || user.email;
  const shortName = user.name || user.email.split("@")[0];

  const result = await plain.upsertCustomer({
    identifier: {
      externalId: user.id,
    },
    onCreate: {
      fullName,
      shortName,
      email: {
        email: user.email,
        isVerified: true,
      },
      externalId: user.id,
    },
    onUpdate: {
      email: {
        email: user.email,
        isVerified: true,
      },
    },
  });

  if (result.error) {
    console.error("Failed to sync Plain customer email:", result.error);
  }

  return result;
};
