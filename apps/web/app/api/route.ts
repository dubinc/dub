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
      pathItem.get.security = [{ token: [] }, {}];
    }

    if (pathItem.post) {
      pathItem.post.security = [{ token: [] }, {}];
    }

    if (pathItem.put) {
      pathItem.put.security = [{ token: [] }, {}];
    }

    if (pathItem.delete) {
      pathItem.delete.security = [{ token: [] }, {}];
    }

    if (pathItem.patch) {
      pathItem.patch.security = [{ token: [] }, {}];
    }
  }

  return NextResponse.json(document);
}
