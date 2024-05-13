import prisma from "@/lib/prisma";
import z from "@/lib/zod";
import { getSearchParams } from "@dub/utils";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

const schema = z.object({
  state: z.string(),
  stripe_user_id: z.string(),
});

export const GET = async (req: NextRequest) => {
  const { state, stripe_user_id: stripeConnectId } = schema.parse(
    getSearchParams(req.url),
  );

  // TODO:
  // Create a unique state before redirecting to Stripe (and store it in the Redis)
  // And validate it here
  const workspaceId = state.replace("ws_", "");

  const workspace = await prisma.project.update({
    where: {
      id: workspaceId,
    },
    data: {
      stripeConnectId,
    },
  });

  redirect(`/${workspace.slug}`);
};
