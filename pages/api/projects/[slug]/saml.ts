import { withProjectAuth } from "#/lib/auth";
import prisma from "#/lib/prisma";
import jackson from "#/lib/jackson";

export default withProjectAuth(async (req, res, project) => {
  // POST /api/projects/[slug]/logo – upload a new logo
  if (req.method === "POST") {
    const { metadataUrl } = req.body as { metadataUrl: string };

    const { apiController } = await jackson();

    const data = await apiController.createSAMLConnection({
      encodedRawMetadata: metadataUrl,
      metadataUrl,
      defaultRedirectUrl: process.env.NEXTAUTH_URL as string,
      redirectUrl: process.env.NEXTAUTH_URL as string,
      tenant: project.id,
      product: "dub",
    });

    return res.status(200).json(data);
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});
