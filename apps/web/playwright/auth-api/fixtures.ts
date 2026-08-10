import { createId } from "@/lib/api/create-id";
import { MAX_LOGIN_ATTEMPTS } from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth/password";
import { PrismaClient } from "@prisma/client";

export const AUTH_API_PASSWORD = "password";
export const AUTH_API_PASSWORD_STRONG = "Password1";
export const AUTH_API_PASSWORD_STRONG_ALT = "Password2";

export const AUTH_API_USERS = {
  ok: {
    name: "Auth API OK",
    email: "auth-api-ok@dub-internal-test.com",
  },
  password: {
    name: "Auth API Password",
    email: "auth-api-password@dub-internal-test.com",
  },
  locked: {
    name: "Auth API Locked",
    email: "auth-api-locked@dub-internal-test.com",
  },
  unverified: {
    name: "Auth API Unverified",
    email: "auth-api-unverified@dub-internal-test.com",
  },
  saml: {
    name: "Auth API SAML",
    email: "user@saml-e2e-test.com",
  },
} as const;

const SAML_WORKSPACE = {
  slug: "auth-api-saml-e2e",
  name: "Auth API SAML E2E",
  ssoEmailDomain: "saml-e2e-test.com",
};

const prisma = new PrismaClient();

async function upsertCredentialUser({
  name,
  email,
  password,
  emailVerified,
  emailVerifiedBa,
  lockedAt = null,
  invalidLoginAttempts = 0,
}: {
  name: string;
  email: string;
  password: string;
  emailVerified: Date | null;
  emailVerifiedBa: boolean;
  lockedAt?: Date | null;
  invalidLoginAttempts?: number;
}) {
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      emailVerified,
      emailVerifiedBa,
      lockedAt,
      invalidLoginAttempts,
    },
    create: {
      id: createId({ prefix: "user_" }),
      email,
      name,
      passwordHash,
      emailVerified,
      emailVerifiedBa,
      lockedAt,
      invalidLoginAttempts,
    },
  });

  await prisma.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: user.id,
      },
    },
    update: {
      password: passwordHash,
    },
    create: {
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: passwordHash,
    },
  });

  return user;
}

export async function ensureAuthApiFixtures() {
  const ok = await upsertCredentialUser({
    ...AUTH_API_USERS.ok,
    password: AUTH_API_PASSWORD,
    emailVerified: new Date(),
    emailVerifiedBa: true,
    lockedAt: null,
    invalidLoginAttempts: 0,
  });

  const password = await upsertCredentialUser({
    ...AUTH_API_USERS.password,
    password: AUTH_API_PASSWORD,
    emailVerified: new Date(),
    emailVerifiedBa: true,
    lockedAt: null,
    invalidLoginAttempts: 0,
  });

  const locked = await upsertCredentialUser({
    ...AUTH_API_USERS.locked,
    password: AUTH_API_PASSWORD,
    emailVerified: new Date(),
    emailVerifiedBa: true,
    lockedAt: new Date(),
    invalidLoginAttempts: 10,
  });

  const unverified = await upsertCredentialUser({
    ...AUTH_API_USERS.unverified,
    password: AUTH_API_PASSWORD,
    emailVerified: null,
    emailVerifiedBa: false,
    lockedAt: null,
    invalidLoginAttempts: 0,
  });

  const saml = await upsertCredentialUser({
    ...AUTH_API_USERS.saml,
    password: AUTH_API_PASSWORD,
    emailVerified: new Date(),
    emailVerifiedBa: true,
    lockedAt: null,
    invalidLoginAttempts: 0,
  });

  const existingWorkspace = await prisma.project.findUnique({
    where: { slug: SAML_WORKSPACE.slug },
    select: { id: true },
  });

  await prisma.project.upsert({
    where: { slug: SAML_WORKSPACE.slug },
    update: {
      name: SAML_WORKSPACE.name,
      ssoEmailDomain: SAML_WORKSPACE.ssoEmailDomain,
      ssoEnforcedAt: new Date(),
    },
    create: {
      id: existingWorkspace?.id ?? createId({ prefix: "ws_" }),
      name: SAML_WORKSPACE.name,
      slug: SAML_WORKSPACE.slug,
      billingCycleStart: 1,
      ssoEmailDomain: SAML_WORKSPACE.ssoEmailDomain,
      ssoEnforcedAt: new Date(),
    },
  });

  return { ok, password, locked, unverified, saml };
}

export async function resetPasswordUserPassword(password = AUTH_API_PASSWORD) {
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.update({
    where: { email: AUTH_API_USERS.password.email },
    data: {
      passwordHash,
      lockedAt: null,
      invalidLoginAttempts: 0,
    },
  });

  await prisma.account.update({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: user.id,
      },
    },
    data: {
      password: passwordHash,
    },
  });

  return user;
}

export async function resetLockedUserState() {
  await prisma.user.update({
    where: { email: AUTH_API_USERS.locked.email },
    data: {
      lockedAt: new Date(),
      invalidLoginAttempts: MAX_LOGIN_ATTEMPTS,
    },
  });
}

export async function setOkUserLoginAttempts(attempts: number) {
  await prisma.user.update({
    where: {
      email: AUTH_API_USERS.ok.email,
    },
    data: {
      lockedAt: null,
      invalidLoginAttempts: attempts,
    },
  });
}

export async function getUserAuthState(email: string) {
  return prisma.user.findUniqueOrThrow({
    where: {
      email,
    },
    select: {
      id: true,
      lockedAt: true,
      invalidLoginAttempts: true,
      emailVerified: true,
      emailVerifiedBa: true,
    },
  });
}

export async function countUserSessions(userId: string) {
  return prisma.session.count({
    where: {
      userId,
    },
  });
}

export async function disconnectFixtures() {
  await prisma.$disconnect();
}

export { MAX_LOGIN_ATTEMPTS };
