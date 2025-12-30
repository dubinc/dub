import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

export const getEmailDomainOrThrow = async ({
  programId,
  domain,
}: {
  programId: string;
  domain: string;
}) => {
  const emailDomain = await prisma.emailDomain.findUnique({
    where: {
      slug: domain,
    },
  });

  if (!emailDomain) {
    throw new DubApiError({
      code: "not_found",
      message: `Email domain (${domain}) not found.`,
    });
  }

  if (emailDomain.programId !== programId) {
    throw new DubApiError({
      code: "forbidden",
      message: `Email domain (${domain}) is not associated with the program.`,
    });
  }

  return emailDomain;
};
