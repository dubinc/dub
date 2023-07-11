import { withProjectAuth } from "#/lib/auth";
import prisma from "#/lib/prisma";
import { qstash } from "#/lib/upstash";

export default withProjectAuth(async (req, res, project, session) => {
  const { bitlyGroup, bitlyApiKey, preserveTags } = req.body;

  const [bitlyGroupDomains, projectDomains] = await Promise.all([
    fetch(`https://api-ssl.bitly.com/v4/groups/${bitlyGroup}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bitlyApiKey}`,
      },
    }).then(async (r) => {
      const data = await r.json();
      if (data.message === "FORBIDDEN") {
        return null;
      }
      return data.bsds as string[];
    }),
    prisma.domain
      .findMany({
        where: {
          projectId: project.id,
        },
        select: {
          slug: true,
        },
      })
      .then((domains) => domains.map((domain) => domain.slug)),
  ]);

  if (!bitlyGroupDomains) {
    return res.status(400).end("Invalid Bitly API key for given Bitly group");
  }

  const missingDomains = bitlyGroupDomains.filter(
    (domain) => !projectDomains.includes(domain),
  );

  if (missingDomains.length > 0) {
    return res
      .status(400)
      .end(
        `All domains in your Bitly group must be added to your project before importing. The following domains are missing from your project: "${missingDomains.join(
          ", ",
        )}"`,
      );
  }

  // const response = await qstash.publishJSON({
  //   url: "https://dub.sh/api/cron/import",
  //   body: {
  //     provider: "bitly",
  //     providerOpts: {
  //       bitlyGroup,
  //       bitlyApiKey,
  //       preserveTags,
  //     },
  //     projectId: project.id,
  //     projectDomains,
  //     emailToNotify: session.user.email,
  //   },
  // });

  return res.status(200).json({ response: "ok" });
});
