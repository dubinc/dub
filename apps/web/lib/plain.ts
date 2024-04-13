import { PlainClient } from "@team-plain/typescript-sdk";
import { Session } from "./auth";

export const plain = new PlainClient({
  apiKey: process.env.PLAIN_API_KEY as string,
});

export const upsertPlainCustomer = async (session: Session) => {
  return await plain.upsertCustomer({
    identifier: {
      externalId: session.user.id,
    },
    onCreate: {
      fullName: session.user.name,
      shortName: session.user.name,
      email: {
        email: session.user.email,
        isVerified: true,
      },
      externalId: session.user.id,
    },
    onUpdate: {},
  });
};
