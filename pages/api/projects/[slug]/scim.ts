import { withProjectAuth } from "#/lib/auth";
import { APP_DOMAIN_WITH_NGROK } from "#/lib/constants";
import jackson from "#/lib/jackson";
import { SAMLProviderProps } from "#/lib/types";

export default withProjectAuth(
  async (req, res, project) => {
    const { directorySyncController } = await jackson();

    // GET /api/projects/[slug]/scim – get all SCIM directories
    if (req.method === "GET") {
      const { data, error } =
        await directorySyncController.directories.getByTenantAndProduct(
          project.id,
          "Dub",
        );
      if (error) {
        return res.status(500).end(error.message);
      }

      return res.status(200).json({
        directories: data,
      });

      // POST /api/projects/[slug]/scim – create a new SCIM directory
    } else if (req.method === "POST") {
      const { provider = "okta-scim-v2", currentDirectoryId } = req.body as {
        provider: SAMLProviderProps["scim"];
        currentDirectoryId?: string;
      };

      const [data, _] = await Promise.all([
        directorySyncController.directories.create({
          name: "Dub SCIM Directory",
          tenant: project.id,
          product: "Dub",
          type: provider,
        }),
        currentDirectoryId &&
          directorySyncController.directories.delete(currentDirectoryId),
      ]);

      return res.status(200).json(data);

      // DELETE /api/projects/[slug]/scim – delete a SCIM directory
    } else if (req.method === "DELETE") {
      const { directoryId } = req.query as {
        directoryId?: string;
      };

      if (!directoryId) {
        return res.status(400).end(`Missing SCIM directory ID`);
      }

      const response = await directorySyncController.directories.delete(
        directoryId,
      );

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
