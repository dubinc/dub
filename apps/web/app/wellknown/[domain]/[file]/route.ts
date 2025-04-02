import {
  SupportedWellKnownFiles,
  supportedWellKnownFiles,
  WellKnownConfig,
} from "@/lib/well-known";
import { prismaEdge } from "@dub/prisma/edge";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(
  _req: NextRequest,
  { params }: { params: { domain: string; file: SupportedWellKnownFiles } },
) {
  const { domain, file } = params;

  if (!supportedWellKnownFiles.includes(file)) {
    return NextResponse.json({ error: "File not supported" }, { status: 400 });
  }

  const { appleAppSiteAssociation, assetLinks } =
    await prismaEdge.domain.findUniqueOrThrow({
      where: {
        slug: domain,
      },
      select: {
        appleAppSiteAssociation: true,
        assetLinks: true,
      },
    });

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

  return NextResponse.json(response);
}
