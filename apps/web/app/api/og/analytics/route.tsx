import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { Folder, Link } from "@dub/prisma/client";
import { prismaEdge } from "@dub/prisma/edge";
import {
  GOOGLE_FAVICON_URL,
  getApexDomain,
  linkConstructor,
  nFormatter,
} from "@dub/utils";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const interMedium = await fetch(
    new URL("@/styles/Inter-Medium.ttf", import.meta.url),
  ).then((res) => res.arrayBuffer());

  const linkId = req.nextUrl.searchParams.get("linkId");
  const folderId = req.nextUrl.searchParams.get("folderId");

  if (!linkId && !folderId) {
    return new Response("Missing linkId or folderId", {
      status: 400,
    });
  }

  let workspaceId: string | null = null;
  let link: Pick<Link, "domain" | "key" | "url"> | null = null;
  let folder: Pick<Folder, "id" | "name"> | null = null;
  if (linkId) {
    const data = await prismaEdge.link.findUniqueOrThrow({
      where: {
        id: linkId,
      },
      include: {
        dashboard: true,
      },
    });
    if (!data.dashboard) {
      return new Response("Link does not have a public analytics dashboard", {
        status: 403,
      });
    }
    workspaceId = data.projectId;
    link = {
      domain: data.domain,
      key: data.key,
      url: data.url,
    };
  } else if (folderId) {
    const data = await prismaEdge.folder.findUniqueOrThrow({
      where: {
        id: folderId,
      },
      include: {
        dashboard: true,
      },
    });
    workspaceId = data.projectId;
    if (!data.dashboard) {
      return new Response("Folder does not have a public analytics dashboard", {
        status: 403,
      });
    }
    workspaceId = data.projectId;
    folder = {
      id: data.id,
      name: data.name,
    };
  }

  const { startDate, endDate, granularity } = getStartEndDates({
    interval: "30d",
  });

  const timeseriesData = await fetch(
    `https://api.us-east.tinybird.co/v0/pipes/v3_timeseries.json?${new URLSearchParams(
      {
        event: "clicks",
        ...(workspaceId ? { workspaceId } : {}),
        ...(folderId ? { folderId } : {}),
        ...(linkId ? { linkId } : {}),
        start: startDate.toISOString().replace("T", " ").replace("Z", ""),
        end: endDate.toISOString().replace("T", " ").replace("Z", ""),
        granularity,
      },
    )}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
      },
      next: {
        revalidate: 60, // revalidate every minute
      },
    },
  )
    .then((res) => res.json())
    .then((res) => res.data)
    .catch(() => []);

  const totalClicks = timeseriesData.reduce(
    (acc, { clicks }) => acc + clicks,
    0,
  );

  return new ImageResponse(
    (
      <div tw="flex flex-col bg-[#f9fafb] w-full h-full p-16">
        <div tw="flex justify-between items-center mb-4">
          <div tw="flex items-center">
            {folder ? (
              <>
                <div tw="flex items-center justify-center rounded-md bg-blue-100 border border-blue-200 w-10 h-10">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1E40AF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="20"
                    height="20"
                  >
                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                  </svg>
                </div>
                <h1 tw="text-4xl font-bold ml-4 my-0">{folder.name}</h1>
              </>
            ) : (
              <>
                <img
                  tw="rounded-full w-10 h-10"
                  src={`${GOOGLE_FAVICON_URL}${getApexDomain(link?.url || "dub.co")}`}
                  alt="favicon"
                />
                <h1 tw="text-4xl font-bold ml-4 my-0">
                  {linkConstructor({
                    domain: link?.domain || "",
                    key: link?.key || "",
                    pretty: true,
                  })}
                </h1>
              </>
            )}
          </div>

          <div tw="flex items-center rounded-md border border-neutral-200 bg-white shadow-sm h-12 px-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4B5563"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 2v4" />
              <path d="M16 2v4" />
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <path d="M3 10h18" />
            </svg>
            <p tw="text-neutral-700 ml-2 mt-4">Last 30 days</p>
          </div>
        </div>
        <div tw="flex flex-col h-full w-full rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden">
          <div tw="flex flex-col px-12 py-4">
            <div tw="flex items-center">
              <h1 tw="font-bold text-5xl leading-none">
                {nFormatter(totalClicks)}
              </h1>
              <svg
                fill="none"
                shapeRendering="geometricPrecision"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
                width="36"
                height="36"
              >
                <path d="M12 20V10" />
                <path d="M18 20V4" />
                <path d="M6 20v-4" />
              </svg>
            </div>
            <p tw="text-lg font-medium uppercase -mt-4 text-neutral-600">
              Total Clicks
            </p>
          </div>

          <Chart data={timeseriesData} />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Inter Medium",
          data: interMedium,
        },
      ],
    },
  );
}

const Chart = ({ data }) => {
  // Define SVG size
  const width = 1100;
  const height = 370;

  // Find the max clicks value for Y-axis scaling
  const maxClicks = Math.max(...data.map((d) => d.clicks));

  // Function to convert date to X coordinate
  const scaleX = (index) => (width / (data.length - 1)) * index;

  // Function to convert clicks to Y coordinate
  const scaleY = (clicks) => height - (clicks / maxClicks) * height;

  // Extend the points to the bottom to create a closed shape for the fill
  let points = data
    .map((d, index) => `${scaleX(index)},${scaleY(d.clicks)}`)
    .join(" ");
  // Close the shape by drawing a line to the bottom right corner and bottom left corner
  points += ` ${width},${height} 0,${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{
        color: "#3B82F6",
        marginLeft: "-4px",
        marginTop: "-32px",
      }}
    >
      <defs>
        <linearGradient id="customGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.2" />
          <stop offset="100%" stop-color="currentColor" stop-opacity="0.01" />
        </linearGradient>
      </defs>

      <polyline
        fill="url(#customGradient)"
        stroke="currentColor"
        stroke-width="3"
        points={points}
      />
    </svg>
  );
};
