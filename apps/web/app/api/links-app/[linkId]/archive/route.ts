import { archiveLink } from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// POST /api/projects/[slug]/links/[linkId]/archive – archive a link
export const POST = withAuth(async ({ headers, link }) => {
  const response = await archiveLink(link!.domain || "dub.sh", link!.key, true);
  return NextResponse.json(response, { headers });
});

// DELETE /api/projects/[slug]/links/[linkId]/archive – unarchive a link
export const DELETE = withAuth(async ({ headers, link }) => {
  const response = await archiveLink(
    link!.domain || "dub.sh",
    link!.key,
    false,
  );
  return NextResponse.json(response, { headers });
});
