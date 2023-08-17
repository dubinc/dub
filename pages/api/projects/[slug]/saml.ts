import { withProjectAuth } from "#/lib/auth";
import { APP_DOMAIN_WITH_NGROK } from "#/lib/constants";
import jackson, { samlAudience } from "#/lib/jackson";

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
        issuer: samlAudience,
        acs:
          process.env.NODE_ENV === "production"
            ? "https://api.dub.co/auth/saml/callback"
            : `${APP_DOMAIN_WITH_NGROK}/api/auth/saml/callback`,
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
    requiredRole: ["owner"],
    requiredPlan: ["enterprise"],
    excludeGet: true,
  },
);
