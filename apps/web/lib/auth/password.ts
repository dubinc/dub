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

export const meetsPasswordRequirements = (password: string) => {
  // Check if the password is at least 8 characters long
  if (password.length < 8) {
    return false;
  }

  // Check if the password contains at least one uppercase and one lowercase letter
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    return false;
  }

  // Check if the password contains at least one digit
  if (!/\d+/.test(password)) {
    return false;
  }

  return true;
};
