import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
const supportedFiles = [
  "apple-app-site-association",
  "assetlinks.json",
] as const;

type SupportedFiles = (typeof supportedFiles)[number];

export async function GET(
  _req: NextRequest,
  { params }: { params: { domain: string; file: SupportedFiles } },
) {
  const { domain, file } = params;

  if (!supportedFiles.includes(file)) {
    return NextResponse.json({ error: "File not supported" }, { status: 400 });
  }

  const response = await generateWellKnownFile({ domain, file });

  return NextResponse.json(response);
}

async function generateWellKnownFile({
  domain,
  file,
}: {
  domain: string;
  file: SupportedFiles;
}) {
  const domainRecord = await prisma.domain.findUniqueOrThrow({
    where: {
      slug: domain,
      // slug: "devvv.com",
    },
    select: {
      deepLink: true,
    },
  });

  // Apple App Site Association
  if (file === "apple-app-site-association") {
    const { iosAppId, iosTeamId } = domainRecord.deepLink as Prisma.JsonObject;

    if (!iosAppId || !iosTeamId) {
      return [];
    }

    const identifier = `${iosTeamId}.${iosAppId}`;

    return {
      applinks: {
        apps: [],
        details: [
          {
            appIDs: [identifier],
            components: [
              {
                "/": "*",
                comment:
                  "Matches any URL whose path is * and instructs the system to open it as a Universal link",
              },
              {
                "/": "/",
                comment:
                  "Matches any URL whose path is / and instructs the system to open it as a Universal link",
              },
            ],
          },
        ],
      },
    };
  }

  // Android Asset Links
  if (file === "assetlinks.json") {
    const { androidPackageName, androidSha256CertFingerprints } =
      domainRecord.deepLink as Prisma.JsonObject;

    if (!androidPackageName || !androidSha256CertFingerprints) {
      return [];
    }

    return [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: androidPackageName,
          sha256_cert_fingerprints: [androidSha256CertFingerprints],
        },
      },
    ];
  }
}
