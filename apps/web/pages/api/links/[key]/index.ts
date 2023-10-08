import { deleteLink, editLink, processKey } from "#/lib/api/links";
import { withLinksAuth } from "#/lib/auth";
import { isBlacklistedDomain, isBlacklistedKey } from "#/lib/edge-config";
import { GOOGLE_FAVICON_URL, getApexDomain, log } from "@dub/utils";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1500kb",
    },
  },
};

export default withLinksAuth(
  async (req, res, session, project, domain, link) => {
    // GET /api/links/:key – get a link
    if (req.method === "GET") {
      return res.status(200).json(link);

      // PUT /api/links/:key – edit a link
    } else if (req.method === "PUT") {
      // if request body is empty or not a valid json
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).end("Missing or invalid request body.");
      }
      if (Object.keys(req.body).length === 0) {
        return res.status(304).end("No fields to update.");
      }

      const updatedLink = {
        ...link,
        ...req.body,
      };

      let { key, url, rewrite } = updatedLink;

      // for default dub.sh links (not part of a project)
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

      key = processKey(key);
      if (!key) {
        return res.status(422).end("Invalid key.");
      }

      const [response, invalidFavicon] = await Promise.allSettled([
        editLink({
          domain,
          key: link!.key, // link is guaranteed to exist because if not we will return 404,
          updatedLink,
        }),
        ...(!project && url
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
          }* edited a link (dub.sh/${key}) to the ${url} ${
            invalidFavicon
              ? " but it has an invalid favicon :thinking_face:"
              : ""
          }`,
          type: "links",
          mention: true,
        });
      }
      return res.status(200).json(response);

      // DELETE /api/links/:key – delete a link
    } else if (req.method === "DELETE") {
      const response = await deleteLink({
        domain,
        key: link!.key, // link is guaranteed to exist because if not we will return 404
      });
      return res.status(200).json(response[0]);
    } else {
      res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  },
  {
    needNotExceededUsage: true,
  },
);
