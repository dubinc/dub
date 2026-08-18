import { getServerSession } from "@/lib/better-auth/get-session";

export const throwIfAuthenticated = async ({ next, ctx }) => {
  const { session } = await getServerSession();

  if (session) {
    throw new Error("You are already logged in.");
  }

  return next({ ctx });
};
