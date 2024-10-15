import { NextRequest, NextResponse } from "next/server";

const supportedFiles = ["apple-app-site-association", "assetlinks.json"];

export async function GET(
  _req: NextRequest,
  { params }: { params: { domain: string; file: string } },
) {
  const { domain, file } = params;
  if (!supportedFiles.includes(file)) {
    return NextResponse.json({ error: "File not supported" }, { status: 400 });
  }
  const json = await getJson({ domain, file });
  return NextResponse.json(json);
}

async function getJson({ domain, file }: { domain: string; file: string }) {
  if (file === "apple-app-site-association") {
    return {
      applinks: {
        apps: [],
        details: [],
      },
    };
  } else if (file === "assetlinks.json") {
    return {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.example.app",
        sha256_cert_fingerprints: ["fingerprint1", "fingerprint2"],
      },
    };
  }
}
