import { STRIPE_PAYMENT_METHOD_NORMALIZATION } from "@/lib/constants/payouts";
import { prisma } from "@dub/prisma";
import { Invoice } from "@dub/prisma/client";
import "dotenv-flow/config";

// migrations/backfill-invoice-payment-method
async function main() {
  const invoices = await prisma.invoice.findMany({
    where: {
      paymentMethod: null,
      stripeChargeMetadata: {
        not: {},
      },
    },
    take: 100,
  });

  console.log(`Found ${invoices.length} invoices to backfill`);

  const invoicesToUpdate: Pick<Invoice, "id" | "paymentMethod">[] = [];

  for (const invoice of invoices) {
    const chargeMetadata = invoice.stripeChargeMetadata as any;
    const paymentMethodType = chargeMetadata?.payment_method_details?.type;

    if (!paymentMethodType) {
      console.log(`No payment method type found for invoice ${invoice.id}`);
      continue;
    }

    const normalizedPaymentMethod =
      STRIPE_PAYMENT_METHOD_NORMALIZATION[
        paymentMethodType as keyof typeof STRIPE_PAYMENT_METHOD_NORMALIZATION
      ];

    if (!normalizedPaymentMethod) {
      console.log(
        `Unknown payment method type ${paymentMethodType} for invoice ${invoice.id}`,
      );
      continue;
    }

    invoicesToUpdate.push({
      id: invoice.id,
      paymentMethod: normalizedPaymentMethod,
    });
  }

  console.table(invoicesToUpdate);

  await Promise.allSettled(
    invoicesToUpdate.map((invoice) =>
      prisma.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          paymentMethod: invoice.paymentMethod,
        },
      }),
    ),
  );

  console.log("Backfill completed");
}

main();
