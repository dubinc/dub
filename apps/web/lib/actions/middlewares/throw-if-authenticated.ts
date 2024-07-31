import { getSession } from "@/lib/auth";

export const throwIfAuthenticated = async ({ next, ctx }) => {
  const session = await getSession();

  if (session) {
    throw new Error("You are already logged in.");
  }

  return next({ ctx });
};
