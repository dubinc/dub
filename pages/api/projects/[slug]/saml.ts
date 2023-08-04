import { withProjectAuth } from "#/lib/auth";
import jackson from "#/lib/jackson";

export default withProjectAuth(async (req, res, project) => {
  // GET /api/projects/[slug]/saml – get all SAML connections
  if (req.method === "GET") {
    const { apiController } = await jackson();

    const connections = await apiController.getConnections({
      tenant: project.id,
      product: "dub",
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
      defaultRedirectUrl: process.env.NEXTAUTH_URL as string,
      redirectUrl: process.env.NEXTAUTH_URL as string,
      tenant: project.id,
      product: "dub",
    });

    return res.status(200).json(data);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});
