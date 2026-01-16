import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// POST /api/admin/reset-login-attempts
export const POST = withAdmin(async ({ req }) => {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      invalidLoginAttempts: true,
      lockedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updatedUser = await prisma.user.update({
    where: { email },
    data: {
      invalidLoginAttempts: 0,
      lockedAt: null,
    },
    select: {
      id: true,
      email: true,
      invalidLoginAttempts: true,
      lockedAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    user: updatedUser,
  });
});
