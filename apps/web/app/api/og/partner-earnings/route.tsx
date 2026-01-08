import { getPartnerEarningsTimeseries } from "@/lib/api/partner-profile/get-partner-earnings-timeseries";
import { withPartnerProfile } from "@/lib/auth/partner";
import { getPartnerEarningsTimeseriesSchema } from "@/lib/zod/schemas/partner-profile";
import { currencyFormatter, formatDate } from "@dub/utils";
import { ImageResponse } from "next/og";
import * as z from "zod/v4";
import { loadGoogleFont } from "../load-google-font";

const WIDTH = 1368;
const HEIGHT = 994;

const BACKGROUND_IMAGES = {
  light: "https://assets.dub.co/misc/partner-earnings-share-light.jpg",
  dark: "https://assets.dub.co/misc/partner-earnings-share-dark.jpg",
};

export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const { programId, background, ...filters } =
    getPartnerEarningsTimeseriesSchema
      .extend({
        programId: z.string(),
        background: z.enum(["light", "dark"]).optional().default("light"),
      })
      .parse(searchParams);

  const timeseries = await getPartnerEarningsTimeseries({
    partnerId: partner.id,
    programId,
    filters,
  });

  const interSemibold = await loadGoogleFont("Inter:wght@600");

  const total = timeseries.reduce((acc, { earnings }) => acc + earnings, 0);

  const startLabel =
    timeseries.length > 0
      ? formatDate(new Date(timeseries[0].start), {
          month: "short",
          year: "numeric",
        })
      : "";
  const endLabel =
    timeseries.length > 0
      ? formatDate(new Date(timeseries[timeseries.length - 1].start), {
          month: "short",
          year: "numeric",
        })
      : "";

  const logoColor = background === "dark" ? "#ffffff" : "#000000";

  return new ImageResponse(
    (
      <div
        tw="flex flex-col w-full h-full items-center justify-center"
        style={{ fontFamily: "Inter Semibold" }}
      >
        <img
          src={BACKGROUND_IMAGES[background]}
          tw="absolute inset-0"
          style={{ width: WIDTH, height: HEIGHT, objectFit: "cover" }}
        />

        <div
          tw={`flex flex-col rounded-3xl shadow-2xl overflow-hidden ${
            background === "dark" ? "bg-neutral-900" : "bg-white"
          }`}
          style={{
            width: 1210,
            marginTop: -10,
          }}
        >
          <div tw="flex flex-col p-10">
            <span
              tw={`text-4xl ${
                background === "dark" ? "text-neutral-100" : "text-neutral-800"
              }`}
              style={{ fontFamily: "Inter Semibold" }}
            >
              Earnings
            </span>

            <div tw="flex items-baseline mt-3">
              <span
                tw={`font-medium text-4xl ${
                  background === "dark"
                    ? "text-neutral-200"
                    : "text-neutral-600"
                }`}
                style={{ fontFamily: "Inter Semibold" }}
              >
                {currencyFormatter(total, { maximumFractionDigits: 2 })}
              </span>
            </div>

            <div tw="flex mt-6" style={{ width: 1130, height: 430 }}>
              <Chart data={timeseries} background={background} />
            </div>

            <div tw="flex justify-between mt-4">
              <span
                tw={`text-2xl ${
                  background === "dark"
                    ? "text-neutral-400"
                    : "text-neutral-500"
                }`}
              >
                {startLabel}
              </span>
              <span
                tw={`text-2xl ${
                  background === "dark"
                    ? "text-neutral-400"
                    : "text-neutral-500"
                }`}
              >
                {endLabel}
              </span>
            </div>
          </div>
        </div>

        <div tw="flex mt-22">
          <svg
            width="160"
            height="73"
            viewBox="0 0 46 21"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M11 2H14V13.9332L14.0003 13.9731L14.0003 14C14.0003 14.0223 14.0002 14.0445 14 14.0668V21H11V19.7455C9.86619 20.5362 8.48733 21 7.00016 21C3.13408 21 0 17.866 0 14C0 10.134 3.13408 7 7.00016 7C8.48733 7 9.86619 7.46375 11 8.25452V2ZM7 17.9998C9.20914 17.9998 11 16.209 11 13.9999C11 11.7908 9.20914 10 7 10C4.79086 10 3 11.7908 3 13.9999C3 16.209 4.79086 17.9998 7 17.9998ZM32 2H35V8.25474C36.1339 7.46383 37.5128 7 39.0002 7C42.8662 7 46.0003 10.134 46.0003 14C46.0003 17.866 42.8662 21 39.0002 21C35.1341 21 32 17.866 32 14V2ZM39 17.9998C41.2091 17.9998 43 16.209 43 13.9999C43 11.7908 41.2091 10 39 10C36.7909 10 35 11.7908 35 13.9999C35 16.209 36.7909 17.9998 39 17.9998ZM19 7H16V14C16 14.9192 16.1811 15.8295 16.5329 16.6788C16.8846 17.5281 17.4003 18.2997 18.0503 18.9497C18.7003 19.5997 19.472 20.1154 20.3213 20.4671C21.1706 20.8189 22.0809 21 23.0002 21C23.9194 21 24.8297 20.8189 25.679 20.4671C26.5283 20.1154 27.3 19.5997 27.95 18.9497C28.6 18.2997 29.1157 17.5281 29.4675 16.6788C29.8192 15.8295 30.0003 14.9192 30.0003 14H30V7H27V14C27 15.0608 26.5785 16.0782 25.8284 16.8283C25.0783 17.5784 24.0609 17.9998 23 17.9998C21.9391 17.9998 20.9217 17.5784 20.1716 16.8283C19.4215 16.0782 19 15.0608 19 14V7Z"
              fill={logoColor}
            />
          </svg>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: interSemibold
        ? [
            {
              name: "Inter Semibold",
              data: interSemibold,
              style: "normal",
              weight: 600,
            },
          ]
        : [],
    },
  );
});

function Chart({
  data,
  background,
}: {
  data: { start: string; earnings: number }[];
  background: "light" | "dark";
}) {
  if (!data || data.length === 0) {
    return null;
  }

  const circleRadius = 10;
  const strokeWidth = 6;
  const strokeHalfWidth = strokeWidth / 2;
  const edgePadding = circleRadius + strokeHalfWidth;

  const width = 1400;
  const height = 600;
  const padding = {
    top: 40,
    right: edgePadding,
    bottom: edgePadding,
    left: edgePadding,
  };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxEarnings = Math.max(...data.map((d) => d.earnings), 1);

  const scaleX = (index: number) =>
    padding.left + (chartWidth / (data.length - 1)) * index;

  const scaleY = (value: number) =>
    padding.top + chartHeight - (value / maxEarnings) * chartHeight;

  const isDark = background === "dark";
  const lineColorStart = isDark ? "#A78BFA" : "#7D3AEC";
  const lineColorEnd = isDark ? "#F472B6" : "#DA2778";
  const circleColor = isDark ? "#F472B6" : "#DA2778";
  const areaColorStart = isDark ? "#F472B6" : "#DA2778";
  const areaColorEnd = isDark ? "#DA2778" : "#DA2778";
  const areaOpacityStart = isDark ? 0.25 : 0.15;
  const areaOpacityEnd = isDark ? 0.05 : 0.02;

  if (data.length === 1) {
    const singleX = padding.left + chartWidth / 2;
    const singleY = scaleY(data[0].earnings);
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "100%" }}
      >
        <circle cx={singleX} cy={singleY} r={circleRadius} fill={circleColor} />
      </svg>
    );
  }

  const linePath = data
    .map((d, index) => {
      const x = scaleX(index);
      const y = scaleY(d.earnings);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const areaPath = `${linePath} L ${scaleX(data.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  const lastX = scaleX(data.length - 1);
  const lastY = scaleY(data[data.length - 1].earnings);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={lineColorStart} />
          <stop offset="100%" stopColor={lineColorEnd} />
        </linearGradient>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={areaColorStart}
            stopOpacity={areaOpacityStart}
          />
          <stop
            offset="100%"
            stopColor={areaColorEnd}
            stopOpacity={areaOpacityEnd}
          />
        </linearGradient>
      </defs>

      <path d={areaPath} fill="url(#areaGradient)" />

      <path
        d={linePath}
        fill="none"
        stroke="url(#lineGradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx={lastX} cy={lastY} r={circleRadius} fill={circleColor} />
    </svg>
  );
}
