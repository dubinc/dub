import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RequestSetPassword } from "./request-set-password";
import { UpdatePassword } from "./update-password";

export const dynamic = "auto";

export default async function SecurityPage() {
  const user = await getUser();

  return <>{user.hasPassword ? <UpdatePassword /> : <RequestSetPassword />}</>;
}

const getUser = async () => {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findFirstOrThrow({
    where: {
      id: session.user.id,
    },
    select: {
      passwordHash: true,
    },
  });

  return {
    hasPassword: user.passwordHash !== null,
  };
};
