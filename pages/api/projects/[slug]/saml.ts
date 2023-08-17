import { withProjectAuth } from "#/lib/auth";
import jackson from "#/lib/jackson";
import prisma from "#/lib/prisma";

export default withProjectAuth(
  async (req, res, project) => {
    // GET /api/projects/[slug]/saml – get all SAML connections
    if (req.method === "GET") {
      const { apiController } = await jackson();

      const connections = await apiController.getConnections({
        tenant: project.id,
        product: "Dub",
      });

      const response = {
        connections,
        issuer: "https://saml.dub.sh",
        acs: `${process.env.NEXTAUTH_URL}/api/auth/saml/callback`,
      };

      return res.status(200).json(response);

      // POST /api/projects/[slug]/saml – create a new SAML connection
    } else if (req.method === "POST") {
      const { metadataUrl } = req.body;

      const { apiController } = await jackson();

      const data = await apiController.createSAMLConnection({
        encodedRawMetadata: "",
        metadataUrl,
        defaultRedirectUrl: `${process.env.NEXTAUTH_URL}/auth/saml`,
        redirectUrl: process.env.NEXTAUTH_URL as string,
        tenant: project.id,
        product: "Dub",
      });

      return res.status(200).json(data);

      // DELETE /api/projects/[slug]/saml – delete all SAML connections
    } else if (req.method === "DELETE") {
      const { clientID, clientSecret } = req.query as {
        clientID: string;
        clientSecret: string;
      };

      const { apiController } = await jackson();

      const response = await apiController.deleteConnections({
        clientID,
        clientSecret,
      });

      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["GET", "POST", "DELETE"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  },
  {
    requiredPlan: ["enterprise"],
    excludeGet: true,
  },
);
