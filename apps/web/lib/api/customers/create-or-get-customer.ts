import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Race-safe customer create-or-get.
 *
 * Prisma's `customer.upsert()` can still throw P2002 under MySQL concurrency
 * (two requests miss the row, both attempt insert). This helper create-firsts
 * and on unique-constraint conflict falls back to find using `where`,
 * so concurrent track-lead / track-sale / etc. share one path instead of
 * failing the request.
 */
export async function createOrGetCustomer({
  where,
  create,
}: {
  where: Prisma.CustomerWhereUniqueInput;
  create: Prisma.CustomerUncheckedCreateInput;
}) {
  try {
    const customer = await prisma.customer.create({
      data: create,
    });

    return {
      customer,
      created: true,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const customer = await prisma.customer.findUniqueOrThrow({
        where,
      });

      return {
        customer,
        created: false,
      };
    }

    throw error;
  }
}
