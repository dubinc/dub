import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const uploadLogoSchema = z.object({
  image: z.string().url(),
});

// POST /api/workspaces/[idOrSlug]/logo – upload a new workspace logo
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const { image } = uploadLogoSchema.parse(await req.json());

    const { url } = await storage.upload(`logos/${workspace.id}`, image);

    const response = await prisma.project.update({
      where: { id: workspace.id },
      data: { logo: url },
    });

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
