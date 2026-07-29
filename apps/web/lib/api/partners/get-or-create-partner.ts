import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generatePartnerUsername } from "./generate-partner-username";

// This helper finds first, creates if missing,
// and on unique-constraint conflict falls back to find by email.
export async function getOrCreatePartner({
  email,
  create,
}: {
  email: string;
  create: Omit<Prisma.PartnerUncheckedCreateInput, "username">;
}) {
  const partner = await prisma.partner.findUnique({
    where: {
      email,
    },
  });

  if (partner) {
    return {
      partner,
      created: false,
    };
  }

  try {
    const username = await generatePartnerUsername({
      email,
      name: typeof create.name === "string" ? create.name : null,
    });

    const partner = await prisma.partner.create({
      data: {
        ...create,
        username,
      },
    });

    return {
      partner,
      created: true,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      console.info(
        "[getOrCreatePartner] Unique constraint conflict (P2002), falling back to find",
        { target: error.meta?.target },
      );

      const partner = await prisma.partner.findUniqueOrThrow({
        where: {
          email,
        },
      });

      return {
        partner,
        created: false,
      };
    }

    throw error;
  }
}
