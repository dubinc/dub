import { withSession } from "@/lib/auth";
import { plain, upsertPlainCustomer } from "@/lib/plain";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const supportRequestQuerySchema = z.object({
  message: z.string().min(1),
  attachmentIds: z.array(z.string()),
});

// POST /api/support – file a support request
export const POST = withSession(async ({ req, session }) => {
  const { message, attachmentIds } = supportRequestQuerySchema.parse(
    await req.json(),
  );

  let plainCustomerId: string | null = null;

  const plainCustomer = await plain.getCustomerByEmail({
    email: session.user.email,
  });

  if (plainCustomer.data) {
    plainCustomerId = plainCustomer.data.id;
  } else {
    const { data } = await upsertPlainCustomer(session.user);
    if (data) {
      plainCustomerId = data.customer.id;
    }
  }

  if (!plainCustomerId) {
    return NextResponse.json({
      error: "Plain customer not found",
    });
  }

  const res = await plain.createThread({
    customerIdentifier: {
      customerId: plainCustomerId,
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
