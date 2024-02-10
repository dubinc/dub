import { NextResponse } from "next/server";
import { openAPIDocument } from "@/lib/zod/openapi";

export const GET = async () => {
  return NextResponse.json(openAPIDocument);
};
