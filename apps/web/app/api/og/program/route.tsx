import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const DARK_CELLS = [
  [2, 3],
  [5, 3],
  [56, 7],
  [53, 1],
];

export async function GET(req: NextRequest) {
  const interMedium = await fetch(
    new URL("@/styles/Inter-Medium.ttf", import.meta.url),
  ).then((res) => res.arrayBuffer());

  const programId = req.nextUrl.searchParams.get("programId");

  // if (!program) {
  //   return new Response(`Program not found`, {
  //     status: 404,
  //   });
  // }

  return new ImageResponse(
    (
      <div tw="flex flex-col bg-white w-full h-full">
        {/* @ts-ignore */}
        <svg tw="absolute inset-0 text-black/10" width="1200" height="630">
          <defs>
            <pattern
              id="grid"
              width={20}
              height={20}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M 20 0 L 0 0 0 20`}
                fill="transparent"
                stroke="currentColor"
                strokeWidth={1}
              />
            </pattern>
            <pattern
              id="grid-large"
              width={160}
              height={160}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M 160 0 L 0 0 0 160`}
                fill="transparent"
                stroke="currentColor"
                strokeOpacity={0.5}
                strokeWidth={1}
              />
            </pattern>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity={0} />
              <stop offset="100%" stopColor="#fff" stopOpacity={1} />
            </linearGradient>
          </defs>
          {DARK_CELLS.map(([x, y]) => (
            <rect
              key={`${x}-${y}`}
              x={x * 20 + 1}
              y={y * 20 + 1}
              width={19}
              height={19}
              fill="black"
              fillOpacity={0.02}
            />
          ))}
          <rect fill="url(#grid)" width="1200" height="630" />
          <rect fill="url(#grid-large)" width="1200" height="630" />
          <rect fill="url(#gradient)" width="1200" height="630" />
        </svg>

        <div tw="relative flex mx-auto h-full bg-white w-[879px] px-16 py-20">
          WIP
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
