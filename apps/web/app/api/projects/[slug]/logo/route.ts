import { withAuth } from "@/lib/auth";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import prisma from "@/lib/prisma";
import z from "@/lib/zod";
import cloudinary from "cloudinary";
import { NextResponse } from "next/server";

const uploadLogoSchema = z.object({
  image: z.string().url(),
});

// POST /api/projects/[slug]/logo – upload a new project logo
export const POST = withAuth(
  async ({ req, project }) => {
    try {
      const { image } = uploadLogoSchema.parse(await req.json());

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
    } catch (error) {
      return handleAndReturnErrorResponse(error);
    }
  },
  {
    requiredRole: ["owner"],
  },
);
