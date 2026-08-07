import { prisma } from "@/lib/prisma";
import { generateRandomString } from "better-auth/crypto";
import {
  VERIFICATION_TOKEN_CONFIG,
  type VerificationTokenKind,
} from "./constants";
import { parseVerificationTokenValue } from "./utils";

type DeleteVerificationTokensArgs =
  | {
      kind: VerificationTokenKind;
      identifier: string;
    }
  | {
      kind?: never;
      identifier?: never;
      lookupKey: string;
    };

function assertPurposeConstraints({
  kind,
  parsedValue,
}: {
  kind: VerificationTokenKind;
  parsedValue: Record<string, unknown>;
}) {
  const { purpose, prefix } = VERIFICATION_TOKEN_CONFIG[kind];

  if (purpose === "action") {
    if (!prefix) {
      throw new Error(
        `Verification token kind "${kind}" has purpose "action" but an empty prefix.`,
      );
    }

    if ("email" in parsedValue) {
      throw new Error(
        `Verification token kind "${kind}" is an action token and must not include an "email" field (use a non-login field name).`,
      );
    }

    return;
  }

  if (prefix) {
    throw new Error(
      `Verification token kind "${kind}" has purpose "magicLinkLogin" but a non-empty prefix.`,
    );
  }

  if (typeof parsedValue.email !== "string" || !parsedValue.email) {
    throw new Error(
      `Verification token kind "${kind}" is a magic-link login token and must include an "email" field.`,
    );
  }
}

// Create a verification row for a registered token type.
// Pass `identifier` for email-keyed OTPs; omit it for URL tokens (random suffix).
export async function createVerificationToken({
  kind,
  value,
  lookupKey,
  identifier,
  expiresIn = 0,
  removePreviousTokens = false,
}: {
  kind: VerificationTokenKind;
  value: string | Record<string, unknown>;
  lookupKey?: string;
  identifier?: string;
  expiresIn?: number;
  removePreviousTokens?: boolean;
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

  let rawObject: Record<string, unknown>;
  try {
    rawObject = typeof value === "string" ? JSON.parse(value) : { ...value };
  } catch {
    throw new Error(
      `Verification token value for kind "${kind}" is not valid JSON.`,
    );
  }

  if (
    typeof rawObject !== "object" ||
    rawObject === null ||
    Array.isArray(rawObject)
  ) {
    throw new Error(
      `Verification token value for kind "${kind}" must be a JSON object.`,
    );
  }

  const rawValue = JSON.stringify(rawObject);
  const parsedValue = parseVerificationTokenValue({
    kind,
    value: rawValue,
  });

  if (!parsedValue) {
    throw new Error(
      `Verification token value for kind "${kind}" failed schema validation.`,
    );
  }

  assertPurposeConstraints({
    kind,
    parsedValue: rawObject,
  });

  const token = identifier ?? generateRandomString(32, "a-z", "A-Z");

  if (removePreviousTokens && lookupKey) {
    await deleteVerificationTokens({
      lookupKey,
    });
  }

  await prisma.verification.create({
    data: {
      identifier: `${tokenConfig.prefix}${token}`,
      value: rawValue,
      expiresAt: new Date(Date.now() + expiresIn),
      lookupKey,
    },
  });

  return {
    token,
  };
}

export async function consumeVerificationToken({
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

  const result = await prisma.verification.deleteMany({
    where: {
      identifier: `${tokenConfig.prefix}${identifier}`,
      expiresAt: {
        gte: new Date(),
      },
    },
  });

  return result.count === 1;
}

export async function findVerificationToken<T extends VerificationTokenKind>({
  kind,
  identifier,
}: {
  kind: T;
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

  const value = parseVerificationTokenValue({
    kind,
    value: verification.value,
  });

  if (!value) {
    return null;
  }

  return {
    ...verification,
    value,
    isExpired: verification.expiresAt <= new Date(),
  };
}

export async function deleteVerificationTokens(
  args: DeleteVerificationTokensArgs,
) {
  if ("lookupKey" in args) {
    return prisma.verification.deleteMany({
      where: {
        lookupKey: args.lookupKey,
      },
    });
  }

  const { kind, identifier } = args;
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
