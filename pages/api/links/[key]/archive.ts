import { archiveLink } from "#/lib/api/links";
import { withLinksAuth } from "#/lib/auth";

const temporarilyArchivedLinks = {};

export default withLinksAuth(async (req, res, _session, _project, domain) => {
  const { key } = req.query as { key: string };

  if (req.method === "POST") {
    const response = await archiveLink(domain || "dub.sh", key, true);

    temporarilyArchivedLinks[key] = response;

    return res.status(200).json(response);
  } else if (req.method === "DELETE") {
    if (key in temporarilyArchivedLinks) {
      const restoredLink = temporarilyArchivedLinks[key];
      delete temporarilyArchivedLinks[key];
      return res.status(200).json({ message: "Link unarchived", link: restoredLink });
    } else {
      return res.status(404).json({ message: "Link not found in the temporary archive" });
    }
  } else {
    res.setHeader("Allow", ["POST", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});

