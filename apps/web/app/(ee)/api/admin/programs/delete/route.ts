import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { deleteProgramAdmin } from "./delete-program-admin";

// POST /api/admin/programs/delete
export const POST = withAdmin(
  async ({ req }) => {
    const { programIdOrSlug } = await req.json();

    if (!programIdOrSlug || typeof programIdOrSlug !== "string") {
      return new Response("Program ID or slug is required", { status: 400 });
    }

    const program = await prisma.program.findUnique({
      where: programIdOrSlug.startsWith("prog_")
        ? { id: programIdOrSlug }
        : { slug: programIdOrSlug },
      select: {
        id: true,
      },
    });

    if (!program) {
      return new Response(
        `Program with ID or slug ${programIdOrSlug} not found`,
        { status: 404 },
      );
    }

    await deleteProgramAdmin(program.id);

    return NextResponse.json({ success: true });
  },
  {
    requiredRoles: ["owner"],
  },
);
