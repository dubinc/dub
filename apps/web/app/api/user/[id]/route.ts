import { DubApiError } from "@/lib/api/errors";
import { withSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/user/[id] – get a specific user
export const GET = withSession(async ({ params }) => {
  if (!params.id) {
    throw new DubApiError({
      code: "bad_request",
      message: "Invalid user ID",
    });
  }
  const user = await prisma.user.findUnique({
    where: {
      id: params.id,
    },
  });

  if (!user) {
    throw new DubApiError({
      code: "not_found",
      message: "User not found",
    });
  }

  return NextResponse.json(user);
});
