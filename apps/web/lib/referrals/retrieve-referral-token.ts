import { prismaEdge } from "@/lib/prisma/edge";

export async function retrieveLinkToken(token: string) {
  return await prismaEdge.embedPublicToken.findUnique({
    where: {
      publicToken: token,
    },
  });
}
