import { withLinksAuth } from "#/lib/auth";
import { DUB_PROJECT_ID } from "#/lib/constants";
import { getLinksCount } from "#/lib/api/links";

export default withLinksAuth(async (req, res, session, project) => {
  // GET /api/links/_count – get the number of links for a project
  if (req.method === "GET") {
    const { userId } = req.query as { userId?: string };
    const count = await getLinksCount({
      req,
      projectId: project?.id || DUB_PROJECT_ID,
      userId: project?.id ? userId : session.user.id,
    });
    return res.status(200).json(count);
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});
