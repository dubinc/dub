import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import cloudinary from "cloudinary";
import { NextResponse } from "next/server";

// POST /api/projects/[slug]/logo – upload a new project logo
export const POST = withAuth(
  async ({ req, project }) => {
    const { image } = await req.json();

    const { secure_url } = await cloudinary.v2.uploader.upload(image, {
      public_id: project.id,
      folder: "logos",
      overwrite: true,
      invalidate: true,
    });

    const response = await prisma.project.update({
      where: { id: project.id },
      data: { logo: secure_url },
    });

    return NextResponse.json(response);
  },
  {
    requiredRole: ["owner"],
  },
);
