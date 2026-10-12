import { banUser } from "@/lib/admin/ban-user";
import { withAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

// POST /api/admin/ban
export const POST = withAdmin(
  async ({ req }) => {
    const { email, blockEmailDomain } = await req.json();

    await banUser({
      email,
      blockEmailDomain,
    });

    return NextResponse.json({
      success: true,
    });
  },
  {
    requiredRoles: ["owner"],
  },
);
