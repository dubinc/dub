import { prismaEdge } from "@/lib/prisma/edge";
import z from "@/lib/zod";
import { getSearchParams } from "@dub/utils";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

const schema = z.object({
  state: z.string(),
  stripe_user_id: z.string(),
});

export const runtime = "edge";

export const GET = async (req: NextRequest) => {
  const { state: workspaceId, stripe_user_id: stripeConnectId } = schema.parse(
    getSearchParams(req.url),
  );

  // TODO:
  // Create a unique state before redirecting to Stripe (and store it in the Redis)
  // And validate it here

  const workspace = await prismaEdge.project.update({
    where: {
      id: workspaceId.replace("ws_", ""),
    },
    data: {
      stripeConnectId,
    },
  });

  redirect(`/${workspace.slug}`);
};
