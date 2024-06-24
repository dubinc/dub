import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getLinkViaEdge } from "@/lib/planetscale";
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

  const domain = req.nextUrl.searchParams.get("domain") || "dub.sh";
  const key = req.nextUrl.searchParams.get("key") || "github";

  const link = await getLinkViaEdge(domain, key);
  if (!link?.publicStats) {
    return new Response(`Stats for this link are not public`, {
      status: 403,
    });
  }

  const data = await getAnalytics({
    event: "clicks",
    groupBy: "timeseries",
    // workspaceId can be undefined (for public links that haven't been claimed/synced to a workspace)
    ...(link.projectId && { workspaceId: link.projectId }),
    linkId: link.id,
    interval: "24h",
  });

  const clicks = data.reduce((acc, { clicks }) => acc + clicks, 0);

  return new ImageResponse(
    (
      <div tw="flex flex-col bg-[#f9fafb] w-full h-full p-16">
        <div tw="flex justify-between items-center">
          <div tw="flex items-center">
            <img
              tw="rounded-full w-10 h-10"
              src={`${GOOGLE_FAVICON_URL}${getApexDomain(link.url || "dub.co")}`}
              alt="favicon"
            />
            <h1 tw="text-4xl font-bold ml-4">
              {linkConstructor({ domain, key, pretty: true })}
            </h1>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 16 16"
              width="24"
              height="24"
            >
              <path
                fillRule="evenodd"
                d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"
              />
            </svg>
          </div>

          <div tw="flex items-center rounded-md border border-gray-200 bg-white shadow-sm h-12 px-6">
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
            <p tw="text-gray-700 ml-2 mt-4">Last 24 hours</p>
          </div>
        </div>
        <div tw="flex flex-col h-full w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div tw="flex flex-col px-12 py-4">
            <div tw="flex items-center">
              <h1 tw="font-bold text-5xl leading-none">{nFormatter(clicks)}</h1>
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
            <p tw="text-lg font-medium uppercase -mt-4 text-gray-600">
              Total Clicks
            </p>
          </div>

          <Chart data={data} />
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
      style={{ color: "#3B82F6", marginLeft: "-4px", marginTop: "-32px" }}
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
