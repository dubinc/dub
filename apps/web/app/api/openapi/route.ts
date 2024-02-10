import { NextResponse } from "next/server";
import { createDocument } from "zod-openapi";

import { openApiObject } from "@/lib/openapi";

export const GET = async () => {
  return NextResponse.json(createDocument(openApiObject));
};
