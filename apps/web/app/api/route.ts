import { openApiObject } from "@/lib/openapi";
import { NextResponse } from "next/server";
import { createDocument } from "zod-openapi";

export const runtime = "edge";

export function GET() {
  const document = createDocument(openApiObject);

  if (!document || !document.paths) {
    throw new Error("Failed to create OpenAPI spec.");
  }

  // Set security requirement to optional for all paths
  // This is for Speakeasy auth hook to work
  const paths = Object.keys(document.paths);

  for (const path of paths) {
    const pathItem = document.paths[path];

    if (pathItem.get) {
      pathItem?.get?.security?.push({});
    }

    if (pathItem.post) {
      pathItem?.post?.security?.push({});
    }

    if (pathItem.put) {
      pathItem?.put?.security?.push({});
    }

    if (pathItem.delete) {
      pathItem?.delete?.security?.push({});
    }

    if (pathItem.patch) {
      pathItem?.patch?.security?.push({});
    }
  }

  return NextResponse.json(document);
}
