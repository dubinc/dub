import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { createId, parseRequestBody } from "@/lib/api/utils";
import { createFileBodySchema } from "@/lib/zod/schemas/files";
import { prisma } from "@dub/prisma";
import { NextRequest, NextResponse } from "next/server";

// const CORS_HEADERS = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Methods": "GET, OPTIONS",
// };

export async function POST(req: NextRequest) {
  try {
    const body = createFileBodySchema.parse(await parseRequestBody(req));

    const id = createId({ prefix: "file_" });

    const file = await prisma.file.create({
      data: {
        id,
        name: body.name || null,
        size: body.size || null,
        extension: body.extension || null,
      },
    });

    return NextResponse.json(file);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}

// export function OPTIONS() {
//   return new Response(null, {
//     status: 204,
//     headers: CORS_HEADERS,
//   });
// }
