import { archiveLink } from "@/lib/api/links";
import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";

// POST /api/links/[linkId]/archive – archive a link
export const POST = withWorkspace(async ({ headers, link }) => {
  const response = await archiveLink({ linkId: link!.id, archived: true });
  return NextResponse.json(response, { headers });
});

// DELETE /api/links/[linkId]/archive – unarchive a link
export const DELETE = withWorkspace(async ({ headers, link }) => {
  const response = await archiveLink({ linkId: link!.id, archived: false });
  return NextResponse.json(response, { headers });
});
