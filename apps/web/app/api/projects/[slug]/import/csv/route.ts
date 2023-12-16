import * as Papa from "papaparse";
import { withAuth } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";
import { redis } from "@/lib/upstash";

// POST /api/projects/[slug]/import/csv - create job to import links via CSV file
export const POST = withAuth(
  async ({ req, project, session, searchParams }) => {
    if (!searchParams.domain) {
      return new Response("Missing domain for imported links.", {
        status: 400,
      });
    }

    const file = await req.formData();

    // take uploaded csv and turn it into json
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any[]) => {
        console.log(results);
        // TODO: convert to format suitable for upload to prisma & redis

        // save to redis as a list
        await redis.lpush(`import:csv:${project.id}`, ...results);
      },
    });

    // const response = await qstash.publishJSON({
    //   url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/csv`,
    //   body: {
    //     projectId: project.id,
    //     userId: session?.user?.id,
    //     domain: searchParams.domain,
    //   },
    // });

    return NextResponse.json({});
  },
);
