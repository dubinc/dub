import { withSession } from "@/lib/auth";
import { plain, upsertPlainCustomer } from "@/lib/plain";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

export const GET = withSession(async ({ session }) => {
  const res = await upsertPlainCustomer(session);
  return NextResponse.json({
    data: res.data?.customer,
  });
});

const supportRequestQuerySchema = z.object({
  message: z.string().min(1),
  attachmentIds: z.array(z.string()),
});

// POST /api/support – file a support request
export const POST = withSession(async ({ req, session }) => {
  const { message, attachmentIds } = supportRequestQuerySchema.parse(
    await req.json(),
  );

  const res = await plain.createThread({
    customerIdentifier: {
      externalId: session.user.id,
    },
    components: [
      {
        componentText: {
          text: message,
        },
      },
    ],
    attachmentIds,
  });

  return NextResponse.json(res);
});
