import { withLinksAuth } from "@/lib/auth";
import { getRandomKey } from "@/lib/api/links";

export default withLinksAuth(async (req, res, _session, _project, domain) => {
  if (req.method === "GET") {
    const response = await getRandomKey(domain || "dub.sh");
    return res.status(200).json(response);
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});
