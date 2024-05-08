import z from "@/lib/zod";
import { getSearchParams } from "@dub/utils";

const schema = z.object({
  code: z.string(),
  user_id: z.string(),
  account_id: z.string(),
  stripe_user_id: z.string(),
});

export const GET = async (req: Request) => {
  const {
    user_id: userId,
    account_id: accountId,
    stripe_user_id: stripeUserId,
  } = schema.parse(getSearchParams(req.url));

  // Store this against the user in the database
  console.log({ userId, accountId, stripeUserId });

  return new Response("OK", {
    status: 200,
  });
};
