import { getPartnerRewind } from "@/lib/api/partners/get-partner-rewind";
import {
  REWIND_ASSETS_PATH,
  REWIND_PERCENTILES,
  REWIND_STEPS,
} from "@/ui/partners/rewind/constants";
import { cn, nFormatter } from "@dub/utils";
import { readFile } from "fs/promises";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const WIDTH = 1084;
const HEIGHT = 994;

export async function GET(req: NextRequest) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const stylesPath = join(__dirname, "../../../../styles");

  const [interSemibold, satoshiBold] = await Promise.all([
    readFile(join(stylesPath, "Inter-Semibold.ttf")),
    readFile(join(stylesPath, "Satoshi-Bold.ttf")),
  ]);

  const partnerId = req.nextUrl.searchParams.get("partnerId");
  const stepRaw = req.nextUrl.searchParams.get("step");

  const step = REWIND_STEPS.find((step) => step.id === stepRaw);

  if (!partnerId || !step)
    return new Response("Missing 'partnerId' or 'step' parameter", {
      status: 400,
    });

  const rewind = await getPartnerRewind({ partnerId });

  if (!rewind)
    return new Response("Partner rewind not found", {
      status: 404,
    });

  const percentileLabel = REWIND_PERCENTILES.find(
    ({ minPercentile }) => rewind[step.percentileId] >= minPercentile,
  )?.label;

  const value =
    step.valueType === "currency"
      ? Math.floor(rewind[step.id] / 100)
      : Math.floor(rewind[step.id]);

  return new ImageResponse(
    (
      <div
        tw="flex flex-col bg-neutral-50 w-full h-full items-center justify-between"
        style={{ fontFamily: "Inter Semibold" }}
      >
        {/* @ts-ignore */}
        <svg tw="absolute inset-0 text-black/10" width={WIDTH} height={HEIGHT}>
          <defs>
            <pattern
              id="grid"
              width={84}
              height={84}
              x={-46}
              y={-4}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M 84 0 L 0 0 0 84`}
                fill="transparent"
                stroke="currentColor"
                strokeWidth={1}
              />
            </pattern>
            <radialGradient id="gradient1" cx="1.1" cy="0.1" r="0.5">
              <stop offset="0%" stopColor="#855AFC" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#855AFC" stopOpacity={0} />
            </radialGradient>
            <radialGradient id="gradient2" cx="-0.1" cy="0.7" r="0.5">
              <stop offset="0%" stopColor="#FD3A4E" stopOpacity={0.05} />
              <stop offset="100%" stopColor="#FD3A4E" stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect fill="url(#grid)" width={WIDTH} height={HEIGHT} />
          <rect fill="url(#gradient1)" width={WIDTH} height={HEIGHT} />
          <rect fill="url(#gradient2)" width={WIDTH} height={HEIGHT} />
        </svg>

        <div
          tw="relative bg-white border-neutral-200 flex w-full max-w-screen-sm flex-col rounded-2xl border p-10 shadow-sm mt-16"
          style={{ transform: "scale(1.5)", transformOrigin: "top center" }}
        >
          <div tw="flex grow flex-col">
            <span tw="text-neutral-900 text-lg font-semibold">
              {step.label}
            </span>

            <div tw="flex pt-2">
              <span tw="text-neutral-900 text-8xl font-bold">
                {step.valueType === "currency" && "$"}
                {nFormatter(value, { full: value <= 9999999 })}
              </span>
            </div>

            <div
              tw={cn("mt-5 flex items-center", !percentileLabel && "opacity-0")}
            >
              <img
                src="https://assets.dub.co/misc/partner-rewind-2025/top-medallion.jpg"
                tw="w-6 h-6 mr-2.5"
              />
              <span tw="text-neutral-900 text-base font-semibold">
                {percentileLabel} of all partners
              </span>
            </div>
          </div>

          <div tw="flex items-end justify-between">
            <span
              tw="text-neutral-900 max-w-[180px] text-3xl leading-8 font-bold"
              style={{ fontFamily: "Satoshi Bold" }}
            >
              Dub Partner Rewind &rsquo;25
            </span>

            <img
              tw="-mb-4 -mr-1 -mt-8 flex h-[280px]"
              src={`${REWIND_ASSETS_PATH}/${step.image}`}
            />
          </div>
        </div>

        <img src="https://assets.dub.co/wordmark.svg" tw="h-16 mb-18" />
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        {
          name: "Inter Semibold",
          data: interSemibold,
        },
        {
          name: "Satoshi Bold",
          data: satoshiBold,
        },
      ],
    },
  );
}
