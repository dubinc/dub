import { DubApiError } from "@/lib/api/errors";
import { getPartnerRewind } from "@/lib/api/partners/get-partner-rewind";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  REWIND_ASSETS_PATH,
  REWIND_PERCENTILES,
  REWIND_STEPS,
} from "@/ui/partners/rewind/constants";
import { cn, nFormatter } from "@dub/utils";
import { ImageResponse } from "next/og";
import { z } from "zod";
import { loadGoogleFont } from "../load-google-font";

const WIDTH = 1084;
const HEIGHT = 994;

export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { step: stepRaw } = z
    .object({
      step: z.enum(
        REWIND_STEPS.map((step) => step.id) as [string, ...string[]],
      ),
    })
    .parse(searchParams);

  const step = REWIND_STEPS.find((step) => step.id === stepRaw)!;

  const rewind = await getPartnerRewind({ partnerId: partner.id });

  if (!rewind) {
    throw new DubApiError({
      code: "not_found",
      message: "Partner rewind not found",
    });
  }

  const percentileLabel = REWIND_PERCENTILES.find(
    ({ minPercentile }) => rewind[step.percentileId] >= minPercentile,
  )?.label;

  const value =
    step.valueType === "currency"
      ? Math.floor(rewind[step.id] / 100)
      : Math.floor(rewind[step.id]);

  // Load Inter font (full character set)
  const interBold = await loadGoogleFont("Inter:wght@700");

  return new ImageResponse(
    (
      <div
        tw="flex flex-col bg-neutral-50 w-full h-full items-center justify-between"
        style={{ fontFamily: "Inter" }}
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
              style={{ fontFamily: "Inter" }}
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
      fonts: interBold
        ? [
            {
              name: "Inter",
              data: interBold,
              style: "normal",
              weight: 700,
            },
          ]
        : [],
    },
  );
});
