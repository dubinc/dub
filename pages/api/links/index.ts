import { NextApiRequest, NextApiResponse } from "next";
import { addLink, getLinksForProject } from "@/lib/api/links";
import { Session, withUserAuth } from "@/lib/auth";
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

// This is a special route for retrieving and creating custom dub.sh links.
export default withUserAuth(
  async (req: NextApiRequest, res: NextApiResponse, session: Session) => {
    // GET /api/links – get all dub.sh links created by the user
    if (req.method === "GET") {
      const { status, tag, search, sort } = req.query as {
        status?: string;
        tag?: string;
        search?: string;
        sort?: "createdAt" | "clicks";
      };
      const response = await getLinksForProject({
        projectId: DUB_PROJECT_ID,
        status,
        tag,
        search,
        sort,
        userId: session.user.id,
      });
      return res.status(200).json(response);

      // POST /api/links – create a new link
    } else if (req.method === "POST") {
      let { key, url } = req.body;
      if (!key || !url) {
        return res.status(400).json({ error: "Missing key or url" });
      }
      const keyBlacklisted = await isBlacklistedKey(key);
      if (keyBlacklisted) {
        return res.status(400).json({ error: "Invalid key" });
      }
      const domainBlacklisted = await isBlacklistedDomain(url);
      if (domainBlacklisted) {
        return res.status(400).json({ error: "Invalid url" });
      }
      const [response, invalidFavicon] = await Promise.allSettled([
        addLink({
          ...req.body,
          domain: "dub.sh",
          projectId: DUB_PROJECT_ID,
          userId: session.user.id,
        }),
        fetch(`${GOOGLE_FAVICON_URL}${url}}`).then((res) => !res.ok),
        // @ts-ignore
      ]).then((results) => results.map((result) => result.value));

      if (response === null) {
        return res.status(403).json({ error: "Key already exists" });
      }
      await log(
        `*${
          session.user.email
        }* created a new link (*dub.sh/${key}*) for ${url} ${
          invalidFavicon ? " but it has an invalid favicon :thinking_face:" : ""
        }`,
        "links",
        invalidFavicon ? true : false,
      );
      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
);
