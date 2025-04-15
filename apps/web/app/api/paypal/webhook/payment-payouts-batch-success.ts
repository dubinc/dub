import { prisma } from "@dub/prisma";
import { z } from "zod";

const schema = z.object({
  resource: z.object({
    batch_header: z.object({
      payout_batch_id: z.string(),
      sender_batch_header: z.object({
        sender_batch_id: z.string(),
      }),
    }),
  }),
});

export const paymentPayoutsBatchSuccess = async (event: any) => {
  const body = schema.parse(event);

  console.log(body);

  const invoiceId =
    body.resource.batch_header.sender_batch_header.sender_batch_id;

  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    select: {
      status: true,
    },
  });

  if (!invoice) {
    console.log(`Invoice not found for invoice id ${invoiceId}`);
    return;
  }

  if (invoice.status === "completed") {
    console.log(`Invoice already completed for invoice id ${invoiceId}`);
    return;
  }

  await prisma.invoice.update({
    where: {
      id: invoiceId,
    },
    data: {
      status: "completed",
    },
  });
};
