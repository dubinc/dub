import { prisma } from "@dub/prisma";

export async function paymentPayoutsBatchSuccess(body: any) {
  const invoiceId = body.resource.sender_batch_id;

  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
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
      paidAt: new Date(),
      status: "completed",
    },
  });
}
