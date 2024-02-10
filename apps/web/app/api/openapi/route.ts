import { NextResponse } from "next/server";
import { openAPIDocument } from "@/lib/openapi";

export const GET = async () => {
  return NextResponse.json(openAPIDocument);
};
