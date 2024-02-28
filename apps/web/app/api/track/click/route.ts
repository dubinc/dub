import { recordClick } from "@/lib/tinybird";
import { NextRequest, NextResponse } from "next/server";
import { internal_runWithWaitUntil as waitUntil } from "next/dist/server/web/internal-edge-wait-until";
import { nanoid } from "@dub/utils";

export const runtime = "edge";

/**
vercel.com?via=zach
no dclid cookie:
-> POST /api/analytics/click
- records the origin location/ua/device of the click
- get back dclid (set to cookie)

vercel.link/zach -> vercel.com?via=zach
2 click events:
- middleware
- POST /api/track/click
**/

// POST /api/track/click – post click event
export const POST = async (req: NextRequest) => {
  // Add Auth to check API key to make sure it's a valid project on Dub

  // zod for body validation
  const body = req.json();
  // @ts-expect-error
  const { id, url } = body;

  const click_id = nanoid(16);

  waitUntil(async () => {
    // auth
    // record click
    const response = await recordClick({
      req,
      id,
      url,
    });
  });

  return NextResponse.json({
    click_id,
  });
};
