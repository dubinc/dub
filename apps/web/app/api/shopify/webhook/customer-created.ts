import { generateRandomName } from "@/lib/names";
import { prisma } from "@dub/prisma";

// TODO: We probably don't need this event

export async function customerCreated(event: any) {
  console.log("customerCreated", event);

  await prisma.customer.create({
    data: {
      projectId: "cl7pj5kq4006835rbjlt2ofka",
      externalId: event.id.toString(),
      name: generateRandomName(),
    },
  });
}
