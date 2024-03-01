import { archiveLink } from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { NextResponse } from "next/server";

// POST /api/links/[linkId]/archive – archive a link
export const POST = withAuth(async ({ headers, link }) => {
  try {
    const response = await archiveLink({ linkId: link!.id, archived: true });
    return NextResponse.json(response, { headers });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});

// DELETE /api/links/[linkId]/archive – unarchive a link
export const DELETE = withAuth(async ({ headers, link }) => {
  try {
    const response = await archiveLink({ linkId: link!.id, archived: false });
    return NextResponse.json(response, { headers });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
