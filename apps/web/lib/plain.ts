import { CreateThreadInput, PlainClient } from "@team-plain/typescript-sdk";
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

export const createPlainThread = async ({
  userId,
  title,
  components,
  labelTypeIds,
}: {
  userId: string;
  title: string;
  components: CreateThreadInput["components"];
  labelTypeIds?: string[];
}) => {
  if (!process.env.PLAIN_API_KEY) {
    console.warn("No PLAIN_API_KEY found. Skipping thread creation.");
    console.log("createPlainThread", {
      userId,
      title,
      components,
      labelTypeIds,
    });
    return;
  }

  const { data, error } = await plain.createThread({
    title,
    components,
    labelTypeIds,
    customerIdentifier: {
      externalId: userId,
    },
  });

  if (error) {
    throw new Error(`Failed to create thread: ${error.message}`);
  }

  return data;
};
