import { prisma } from "@/lib/prisma";
import { Customer, Prisma } from "@prisma/client";

// Update the existing customer for a checkout session with a dub_id.
// The customer lookup can match more than one row, and another row can
// own the Stripe customer ID or the externalId. A blind update then fails
// with P2002 (unique constraint), and every Stripe retry fails the same way.
export async function updateDubIdCustomer({
  customer,
  workspaceId,
  stripeCustomerId,
  data,
}: {
  customer: Customer;
  workspaceId: string;
  stripeCustomerId?: string | null;
  data: Prisma.CustomerUncheckedUpdateInput;
}) {
  // Prefer the customer that already owns the Stripe customer ID
  const stripeCustomer =
    stripeCustomerId && customer.stripeCustomerId !== stripeCustomerId
      ? await prisma.customer.findUnique({
          where: {
            stripeCustomerId,
            projectId: workspaceId,
          },
        })
      : null;

  const target = stripeCustomer ?? customer;

  try {
    return await prisma.customer.update({
      where: {
        id: target.id,
      },
      data,
    });
  } catch (error) {
    // Another customer in the workspace has the externalId, so keep the
    // externalId of the target customer and update the other fields.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      console.log(
        "[updateDubIdCustomer] Unique constraint conflict (P2002), retrying without externalId",
        { customerId: target.id },
      );

      const { externalId, ...rest } = data;

      return await prisma.customer.update({
        where: {
          id: target.id,
        },
        data: rest,
      });
    }

    throw error;
  }
}
