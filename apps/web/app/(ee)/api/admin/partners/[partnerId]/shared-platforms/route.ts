import { getSharedPartnerPlatforms } from "@/lib/api/partners/get-shared-partner-platforms";
import { withAdmin } from "@/lib/auth";
import { partnerSharedPlatformSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/admin/partners/:partnerId/shared-platforms – other partners in the network with the same verified platform identifiers
export const GET = withAdmin(async ({ params }) => {
  const { partnerId } = params;

  const sharedPlatforms = await getSharedPartnerPlatforms({ partnerId });

  if (sharedPlatforms === null) {
    return new Response("Partner not found.", { status: 404 });
  }

  return NextResponse.json(
    z.array(partnerSharedPlatformSchema).parse(sharedPlatforms),
  );
});
