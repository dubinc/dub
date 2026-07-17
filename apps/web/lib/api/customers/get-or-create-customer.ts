import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Race-safe customer get-or-create.
 *
 * Prisma's `customer.upsert()` can still throw P2002 under MySQL concurrency
 * (two requests miss the row, both attempt insert). This helper finds first,
 * creates if missing, and on unique-constraint conflict falls back to find
 * using `where`, so concurrent track-lead / track-sale / etc. share one path
 * instead of failing the request.
 */
export async function getOrCreateCustomer({
  where,
  create,
  findMode = "unique",
}: {
  where: Prisma.CustomerWhereUniqueInput | Prisma.CustomerWhereInput;
  create: Prisma.CustomerUncheckedCreateInput;
  findMode?: "first" | "unique";
}) {
  const customer =
    findMode === "first"
      ? await prisma.customer.findFirst({
          where: where as Prisma.CustomerWhereInput,
        })
      : await prisma.customer.findUnique({
          where: where as Prisma.CustomerWhereUniqueInput,
        });

  if (customer) {
    return {
      customer,
      created: false,
    };
  }

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
      const customer =
        findMode === "first"
          ? await prisma.customer.findFirstOrThrow({
              where: where as Prisma.CustomerWhereInput,
            })
          : await prisma.customer.findUniqueOrThrow({
              where: where as Prisma.CustomerWhereUniqueInput,
            });

      return {
        customer,
        created: false,
      };
    }

    throw error;
  }
}
