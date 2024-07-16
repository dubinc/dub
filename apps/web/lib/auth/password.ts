import { compare, hash } from "bcryptjs";

export async function hashPassword(password: string) {
  return await hash(password, 12);
}

export async function validatePassword({
  password,
  passwordHash,
}: {
  password: string;
  passwordHash: string;
}) {
  return await compare(password, passwordHash);
}

export const PASSWORD_RESET_TOKEN_EXPIRY = 1 * 60 * 60; // 1 hour
