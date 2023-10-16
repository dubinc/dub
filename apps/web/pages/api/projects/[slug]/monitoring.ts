import { withProjectAuth } from "#/lib/auth";
import { qstash } from "#/lib/cron";
import prisma from "#/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export default withProjectAuth(
  async (req, res, project) => {
    // GET /api/projects/[slug]/monitoring – get current monitoring schedules
    if (req.method === "GET") {
      if (!project.monitoringId) {
        return res.status(200).json({
          schedule: null,
        });
      }
      const response = await qstash.schedules.get({
        id: project.monitoringId || "",
      });
      return res.status(200).json({
        schedule: response,
      });

      // POST /api/projects/[slug]/monitoring – create a new monitoring schedule
    } else if (req.method === "POST") {
      const { frequency } = req.body;

      const { messageId } = await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/monitoring`,
        headers: {
          "Upstash-Cron": frequency,
        },
        body: {
          projectId: project.id,
        },
      });

      const response = await prisma.project.update({
        where: {
          id: project.id,
        },
        data: {
          monitoringId: messageId,
        },
      });

      return res.status(200).json(response);

      // DELETE /api/projects/[slug]/monitoring – delete a monitoring schedule
    } else if (req.method === "DELETE") {
      const response = await qstash.schedules.delete({
        id: project.monitoringId || "",
      });

      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["GET", "POST", "DELETE"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  },
  {
    requiredRole: ["owner"],
    requiredPlan: ["pro", "enterprise"],
    excludeGet: true,
  },
);
