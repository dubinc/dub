import { withSession } from "@/lib/auth";
import { getIntegrationGuideMarkdown } from "@/lib/get-integration-guide-markdown";

// GET /api/docs/guides/[guide] - get doc guide markdown
export const GET = withSession(async ({ params }) => {
  const { guide } = params;

  const markdown = await getIntegrationGuideMarkdown(guide);

  return new Response(markdown);
});
