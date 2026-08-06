import { prisma } from "@/lib/prisma";
import { generateRandomString } from "better-auth/crypto";
import {
  VERIFICATION_TOKEN_CONFIG,
  type VerificationTokenKind,
} from "./constants";

// Create a verification row for a registered token type.
export async function createVerificationToken({
  kind,
  value,
  expiresIn = 0,
}: {
  kind: VerificationTokenKind;
  value: string | Record<string, unknown>;
  expiresIn?: number;
}) {
  const tokenConfig = VERIFICATION_TOKEN_CONFIG[kind];

  if (!tokenConfig) {
    throw new Error(`Verification token config for kind "${kind}" not found.`);
  }

  if (!tokenConfig.expiresIn) {
    throw new Error(
      `Verification token config for kind "${kind}" has no expiresIn configured.`,
    );
  }

  if (expiresIn === 0) {
    expiresIn = tokenConfig.expiresIn;
  }

  const token = generateRandomString(32, "a-z", "A-Z");

  await prisma.verification.create({
    data: {
      identifier: `${tokenConfig.prefix}${token}`,
      value: typeof value === "string" ? value : JSON.stringify(value),
      expiresAt: new Date(Date.now() + expiresIn),
    },
  });

  return {
    token,
  };
}

export async function deleteVerificationTokens({
  kind,
  identifier,
}: {
  kind: VerificationTokenKind;
  identifier: string;
}) {
  const tokenConfig = VERIFICATION_TOKEN_CONFIG[kind];

  if (!tokenConfig) {
    throw new Error(`Verification token config for kind "${kind}" not found.`);
  }

  return prisma.verification.deleteMany({
    where: {
      identifier: `${tokenConfig.prefix}${identifier}`,
    },
  });
}

export async function findVerificationToken({
  kind,
  identifier,
}: {
  kind: VerificationTokenKind;
  identifier: string;
}) {
  const tokenConfig = VERIFICATION_TOKEN_CONFIG[kind];

  if (!tokenConfig) {
    throw new Error(`Verification token config for kind "${kind}" not found.`);
  }

  const verification = await prisma.verification.findFirst({
    where: {
      identifier: `${tokenConfig.prefix}${identifier}`,
    },
    orderBy: {
      expiresAt: "desc",
    },
    take: 1,
  });

  if (!verification) {
    return null;
  }

  return {
    ...verification,
    isValid: verification.expiresAt > new Date(),
  };
}
