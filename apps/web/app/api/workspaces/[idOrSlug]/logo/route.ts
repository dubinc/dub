import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { storage } from "@/lib/storage";
import z from "@/lib/zod";
import { R2_URL, nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

const uploadLogoSchema = z.object({
  image: z.string().url(),
});

// POST /api/workspaces/[idOrSlug]/logo – upload a new workspace logo
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const { image } = uploadLogoSchema.parse(await req.json());

    const { url } = await storage.upload(
      `logos/${workspace.id}_${nanoid(7)}`,
      image,
    );

    const response = await prisma.project.update({
      where: { id: workspace.id },
      data: { logo: url },
    });

    waitUntil(
      (async () => {
        if (
          workspace.logo &&
          workspace.logo.startsWith(`${R2_URL}/logos/${workspace.id}`)
        ) {
          await storage.delete(workspace.logo.replace(`${R2_URL}/`, ""));
        }
      })(),
    );

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
