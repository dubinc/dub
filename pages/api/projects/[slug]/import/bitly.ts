import { withProjectAuth } from "#/lib/auth";
import { inngest } from "#/lib/inngest";

export default withProjectAuth(async (req, res, project) => {
  const { bitlyGroup, bitlyApiKey } = req.body;

  await inngest.send({
    name: "import-links",
    data: {
      source: "bitly",
      projectId: project.id,
      bitlyGroup,
      bitlyApiKey,
    },
  });

  res.status(200).json({ message: "Importing links from Bitly" });
});
