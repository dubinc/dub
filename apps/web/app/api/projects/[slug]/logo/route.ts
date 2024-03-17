import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { storage } from "@/lib/storage";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const uploadLogoSchema = z.object({
  image: z.string().url(),
});

// POST /api/projects/[slug]/logo – upload a new project logo
export const POST = withAuth(
  async ({ req, project }) => {
    const { image } = uploadLogoSchema.parse(await req.json());

    const { url } = await storage.upload(`logos/${project.id}`, image);
        
    const response = await prisma.project.update({
      where: { id: project.id },
      data: { logo: url },
    });

    return NextResponse.json(response);
  },
  {
    requiredRole: ["owner"],
  },
);
