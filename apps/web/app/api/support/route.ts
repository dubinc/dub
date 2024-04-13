import { withSession } from "@/lib/auth";
import { plain, upsertPlainCustomer } from "@/lib/plain";
import { NextResponse } from "next/server";

export const GET = withSession(async ({ session }) => {
  const res = await upsertPlainCustomer(session);
  return NextResponse.json({
    data: res.data?.customer,
  });
});

// POST /api/support – file a support request
export const POST = withSession(async ({ req, session }) => {
  const { message, attachmentIds } = await req.json();

  const res = await plain.createThread({
    customerIdentifier: {
      externalId: session.user.id,
    },
    title: "New Support Request",
    components: [
      {
        componentText: {
          text: message,
        },
      },
    ],
    attachmentIds,
  });

  console.log("Support request filed:", res);

  return NextResponse.json(res);
});
