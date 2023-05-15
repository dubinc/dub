import { addLink, getLinksForProject } from "@/lib/api/links";
import { withLinksAuth } from "@/lib/auth";
import { isBlacklistedDomain, isBlacklistedKey } from "@/lib/utils";
import { log } from "@/lib/utils";
import { DUB_PROJECT_ID, GOOGLE_FAVICON_URL } from "@/lib/constants";

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
      const { domain, tagId, search, sort, userId, showArchived } =
        req.query as {
          domain?: string;
          tagId?: string;
          search?: string;
          sort?: "createdAt" | "clicks";
          userId?: string;
          showArchived?: boolean;
        };
      const response = await getLinksForProject({
        projectId: project?.id || DUB_PROJECT_ID,
        domain,
        tagId,
        search,
        sort,
        userId: project?.id ? userId : session.user.id,
        showArchived,
      });
      return res.status(200).json(response);

      // POST /api/links – create a new link
    } else if (req.method === "POST") {
      let { key, url } = req.body;
      if (!key || !url) {
        return res.status(400).end("Missing key or url.");
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
      }

      const [response, invalidFavicon] = await Promise.allSettled([
        addLink({
          ...req.body,
          projectId: project?.id || DUB_PROJECT_ID,
          userId: session.user.id,
        }),
        ...(!project
          ? [fetch(`${GOOGLE_FAVICON_URL}${url}`).then((res) => !res.ok)]
          : []),
        // @ts-ignore
      ]).then((results) => results.map((result) => result.value));

      if (response === null) {
        return res.status(409).end("Key already exists.");
      }

      if (!project && invalidFavicon) {
        await log(
          `*${
            session.user.email
          }* created a new link (*dub.sh/${key}*) for ${url} ${
            invalidFavicon
              ? " but it has an invalid favicon :thinking_face:"
              : ""
          }`,
          "links",
          invalidFavicon ? true : false,
        );
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
