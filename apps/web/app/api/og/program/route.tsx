import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { Reward } from "@dub/prisma/client";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { SVGProps } from "react";
import { loadGoogleFont } from "../load-google-font";

const DARK_CELLS = [
  [2, 3],
  [5, 3],
  [56, 7],
  [53, 1],
];

export async function GET(req: NextRequest) {
  // Load Inter Semibold font (weight 600)
  const interSemibold = await loadGoogleFont("Inter:wght@600");

  const slug = req.nextUrl.searchParams.get("slug");
  const groupSlug = req.nextUrl.searchParams.get("groupSlug");

  if (!slug) {
    return new Response("Missing 'slug' parameter", {
      status: 400,
    });
  }

  const program = await prisma.program.findUnique({
    where: {
      slug,
    },
    include: {
      groups: {
        where: {
          slug: groupSlug ?? DEFAULT_PARTNER_GROUP.slug,
        },
        include: {
          clickReward: true,
          saleReward: true,
          leadReward: true,
        },
      },
    },
  });

  if (!program) {
    return new Response(`Program not found`, {
      status: 404,
    });
  }

  const group = program.groups[0];

  const logo = group.wordmark || group.logo;
  const brandColor = group.brandColor || "#000000";

  const rewards = [group.clickReward, group.leadReward, group.saleReward]
    .filter((r): r is Reward => r !== null)
    .map(serializeReward);
  const reward = rewards[0];

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

        <div tw="relative flex flex-col mx-auto h-full bg-white w-[879px] px-16 py-20 overflow-hidden">
          {logo && <img src={logo} height={48} />}
          <div
            tw="mt-16 text-left uppercase text-lg"
            style={{ color: brandColor }}
          >
            Partner Program
          </div>
          <div
            tw="mt-4 text-4xl font-semibold text-neutral-800"
            style={{
              display: "block",
              lineClamp: 2,
              textOverflow: "ellipsis",
              fontFamily: "Inter",
            }}
          >
            {`Join the ${program.name} affiliate program`}
          </div>
          <div tw="mt-10 flex">
            {rewards.length > 0 && (
              <div tw="w-full flex items-center rounded-md bg-neutral-100 border border-neutral-200 p-8 text-2xl">
                {/* @ts-ignore */}
                <InvoiceDollar tw="w-8 h-8 mr-4" />
                {constructRewardAmount(reward)}
                {reward.event === "sale" && reward.maxDuration === 0
                  ? " for the first sale "
                  : ` per ${reward.event} `}
                {reward.maxDuration === null
                  ? "for the customer's lifetime"
                  : reward.maxDuration && reward.maxDuration > 1
                    ? reward.maxDuration % 12 === 0
                      ? `for ${reward.maxDuration / 12} year${reward.maxDuration / 12 > 1 ? "s" : ""}`
                      : `for ${reward.maxDuration} months`
                    : null}
              </div>
            )}
          </div>
          <div
            tw="mt-10 text-white px-4 h-16 flex items-center text-2xl justify-center rounded-lg border-2 border-white/30 shadow-xl"
            style={{
              fontFamily: "Inter",
              backgroundColor: brandColor,
            }}
          >
            Apply today
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

function InvoiceDollar({
  strokeWidth = 1.5,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        <path
          d="M14.75,3.75v12.5l-2.75-1.5-3,1.5-3-1.5-2.75,1.5V3.75c0-1.105,.895-2,2-2h7.5c1.105,0,2,.895,2,2Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <path
          d="M10.724,6.556c-.374-.885-1.122-1.086-1.688-1.086-.526,0-1.907,.28-1.779,1.606,.09,.931,.967,1.277,1.734,1.414s1.88,.429,1.907,1.551c.023,.949-.83,1.597-1.861,1.597-.985,0-1.67-.383-1.934-1.25"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          x1="9"
          x2="9"
          y1="4.75"
          y2="5.47"
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          x1="9"
          x2="9"
          y1="11.638"
          y2="12.25"
        />
      </g>
    </svg>
  );
}
