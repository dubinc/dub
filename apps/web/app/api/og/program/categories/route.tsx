import { PROGRAM_CATEGORIES } from "@/lib/network/program-categories";
import { DUB_WORDMARK } from "@dub/utils";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { loadGoogleFont } from "../../load-google-font";

const DARK_CELLS = [
  [2, 3],
  [5, 3],
  [56, 7],
  [53, 1],
];

// GET /api/og/program/categories?categorySlug=ai
export async function GET(req: NextRequest) {
  const categorySlug = req.nextUrl.searchParams.get("categorySlug");

  if (!categorySlug) {
    return new Response("Missing 'categorySlug' parameter", {
      status: 400,
    });
  }

  const category = PROGRAM_CATEGORIES.find(
    ({ id }) => id.toLowerCase() === categorySlug.toLowerCase(),
  );

  if (!category) {
    return new Response("Category not found", {
      status: 404,
    });
  }

  const interSemibold = await loadGoogleFont("Inter:wght@600");

  return new ImageResponse(
    (
      <div
        tw="flex flex-col bg-white w-full h-full"
        style={{ fontFamily: "Inter" }}
      >
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

        <div tw="relative flex flex-col mx-auto h-full bg-white w-[920px] px-16 py-20 overflow-hidden">
          <div tw="flex items-center">
            <img src={DUB_WORDMARK} height={56} />
            <div tw="ml-4 h-10 w-px bg-neutral-300" />
            <div tw="ml-4 text-left uppercase text-2xl text-neutral-500">
              Program Marketplace
            </div>
          </div>
          <div
            tw="mt-32 text-5xl font-semibold text-neutral-800"
            style={{
              display: "block",
              lineClamp: 2,
              textOverflow: "ellipsis",
              fontFamily: "Inter",
            }}
          >
            {`${category.label} Affiliate Programs`}
          </div>
          <div tw="mt-10 flex">
            <div
              tw="w-full flex items-center rounded-md bg-neutral-100 border border-neutral-200 p-10 text-3xl"
              style={{
                display: "block",
                lineClamp: 3,
                textOverflow: "ellipsis",
              }}
            >
              {category.listPageDescription}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: interSemibold
        ? [
            {
              name: "Inter",
              data: interSemibold,
              style: "normal",
              weight: 600,
            },
          ]
        : [],
    },
  );
}
