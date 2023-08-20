import { addLink, getLinksForProject, processKey } from "#/lib/api/links";
import { withLinksAuth } from "#/lib/auth";
import { isBlacklistedDomain, isBlacklistedKey } from "#/lib/edge-config";
import { getApexDomain, log } from "#/lib/utils";
import { DUB_PROJECT_ID, GOOGLE_FAVICON_URL } from "#/lib/constants";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1500kb",
    },
  },
};

export default withLinksAuth(
  async (req, res, session, project) => {
    // GET /api/links – get all links for a project
    // if no project, get all dub.sh links for user
    if (req.method === "GET") {
      const { domain, tagId, search, sort, page, userId, showArchived } =
        req.query as {
          domain?: string;
          tagId?: string;
          search?: string;
          sort?: "createdAt" | "clicks";
          page?: string;
          userId?: string;
          showArchived?: string;
        };
      const response = await getLinksForProject({
        projectId: project?.id || DUB_PROJECT_ID,
        domain,
        tagId,
        search,
        sort,
        page,
        userId: project?.id ? userId : session.user.id,
        showArchived: showArchived === "true" ? true : false,
      });
      return res.status(200).json(response);

      // POST /api/links – create a new link
    } else if (req.method === "POST") {
      let { domain, key, url, rewrite, geo } = req.body;
      if (!domain || !key || !url) {
        return res.status(400).end("Missing domain or key or url.");
      }

      // if it's not a custom project, do some filtering
      if (!project) {
        if (key.includes("/")) {
          return res.status(422).end("Key cannot contain '/'.");
        }
        const keyBlacklisted = await isBlacklistedKey(key);
        if (keyBlacklisted) {
          return res.status(422).end("Invalid key.");
        }
        const domainBlacklisted = await isBlacklistedDomain(url);
        if (domainBlacklisted) {
          return res.status(422).end("Invalid url.");
        }
        if (rewrite) {
          return res
            .status(403)
            .end("You can only use link cloaking on a custom domain.");
        }
      }

      // free plan restrictions
      if (!project || project.plan === "free") {
        if (geo) {
          return res
            .status(403)
            .end("You can only use geo targeting on a Pro plan.");
        }
      }

      key = processKey(key);
      if (!key) {
        return res.status(422).end("Invalid key.");
      }

      const [response, invalidFavicon] = await Promise.allSettled([
        addLink({
          ...req.body,
          key,
          projectId: project?.id || DUB_PROJECT_ID,
          userId: session.user.id,
        }),
        ...(!project
          ? [
              fetch(`${GOOGLE_FAVICON_URL}${getApexDomain(url)}`).then(
                (res) => !res.ok,
              ),
            ]
          : []),
        // @ts-ignore
      ]).then((results) => results.map((result) => result.value));

      if (response === null) {
        return res.status(409).end("Key already exists.");
      }

      if (!project && invalidFavicon) {
        await log({
          message: `*${
            session.user.email
          }* created a new link (dub.sh/${key}) for ${url} ${
            invalidFavicon
              ? " but it has an invalid favicon :thinking_face:"
              : ""
          }`,
          type: "links",
          mention: true,
        });
      }

      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  },
  {
    needNotExceededUsage: true,
    excludeGet: true,
  },
);
