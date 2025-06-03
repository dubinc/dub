import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";

// POST /api/domains/status - checks the availability status of a single domain
export const POST = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    return NextResponse.json("OK");
  },
  {
    requiredPermissions: ["domains.write"],
  },
);
