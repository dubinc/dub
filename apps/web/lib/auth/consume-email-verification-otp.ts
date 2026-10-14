import { prisma } from "@/lib/prisma";
import { EmailVerificationToken } from "@prisma/client";

export async function consumeEmailVerificationOtp({
  identifier,
  token,
}: Pick<EmailVerificationToken, "identifier" | "token">) {
  // Atomic consume: only an unexpired row can be deleted. Concurrent requests
  // cannot both succeed.
  const { count } = await prisma.emailVerificationToken.deleteMany({
    where: {
      identifier,
      token,
      expires: {
        gte: new Date(),
      },
    },
  });

  return count > 0;
}
