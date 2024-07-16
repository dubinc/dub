import { prisma } from "@/lib/prisma";
import { User } from "@prisma/client";
import { ACCOUN_LOCK_DURATION, MAX_LOGIN_ATTEMPTS } from "./constants";

export const incrementLoginAttempts = async (
  user: Pick<User, "id" | "email">,
) => {
  const { invalidLoginAttempts, lockedUntil } = await prisma.user.update({
    where: { id: user.id },
    data: {
      invalidLoginAttempts: {
        increment: 1,
      },
    },
    select: {
      lockedUntil: true,
      invalidLoginAttempts: true,
    },
  });

  if (!lockedUntil && invalidLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lockedUntil: new Date(Date.now() + ACCOUN_LOCK_DURATION * 1000),
      },
    });

    // TODO:
    // Send email to user that their account has been locked
  }

  return {
    invalidLoginAttempts,
    lockedUntil,
  };
};

export const resetLoginAttempts = async (userId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      invalidLoginAttempts: 0,
    },
  });
};

export const isAccountLocked = async (userId: string) => {
  const { lockedUntil } = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      lockedUntil: true,
    },
  });

  return lockedUntil && lockedUntil > new Date();
};

export const exceededLoginAttemptsThreshold = (
  user: Pick<User, "invalidLoginAttempts">,
) => {
  return user.invalidLoginAttempts >= MAX_LOGIN_ATTEMPTS;
};
