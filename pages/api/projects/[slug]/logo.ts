import { withProjectAuth } from "#/lib/auth";
import cloudinary from "cloudinary";
import prisma from "#/lib/prisma";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "3mb",
    },
  },
};

export default withProjectAuth(
  async (req, res, project) => {
    // POST /api/projects/[slug]/logo – upload a new logo
    if (req.method === "POST") {
      const { image } = req.body;

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

      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  },
  {
    requiredRole: ["owner"],
    excludeGet: true,
  },
);
