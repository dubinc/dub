import {
  SupportedWellKnownFiles,
  supportedWellKnownFiles,
  WellKnownConfig,
} from "@/lib/well-known";
import { prisma } from "@dub/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ domain: string; file: SupportedWellKnownFiles }> },
) {
  const params = await props.params;
  const { domain, file } = params;

  if (!supportedWellKnownFiles.includes(file)) {
    return NextResponse.json({ error: "File not supported" }, { status: 400 });
  }

  const { appleAppSiteAssociation, assetLinks } =
    (await prisma.domain.findUnique({
      where: {
        slug: domain,
      },
      select: {
        appleAppSiteAssociation: true,
        assetLinks: true,
      },
    })) || {
      appleAppSiteAssociation: null,
      assetLinks: null,
    };

  let response: WellKnownConfig[SupportedWellKnownFiles];
  switch (file) {
    case "apple-app-site-association":
      response =
        (appleAppSiteAssociation as WellKnownConfig["apple-app-site-association"]) || {
          applinks: {
            apps: [],
            details: [],
          },
        };
      break;
    case "assetlinks.json":
      response = (assetLinks as WellKnownConfig["assetlinks.json"]) || [];
      break;
  }

  return NextResponse.json(response, {
    headers: {
      "Vercel-CDN-Cache-Control": "public, s-maxage=86400",
      "Vercel-Cache-Tag": `wellknown:${domain.toLowerCase()}`,
    },
  });
}
