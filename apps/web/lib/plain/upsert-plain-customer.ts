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
