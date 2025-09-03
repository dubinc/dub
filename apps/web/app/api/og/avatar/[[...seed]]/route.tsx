import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getTheme } from "./utils";

export const runtime = "edge";

export async function GET(
  req: NextRequest,
  { params }: { params: { seed?: string[] } },
) {
  const origin = req.headers.get("origin");
  // Validate the origin header and set CORS headers accordingly
  const corsHeaders = {
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (origin && origin.endsWith(".dub.co")) {
    corsHeaders["Access-Control-Allow-Origin"] = origin;
  }

  const { searchParams } = new URL(req.url);
  const seed = params.seed?.[0] ?? searchParams.get("seed");
  const theme = getTheme(seed);

  return new ImageResponse(
    (
      <div
        tw="flex items-center justify-center w-full h-full relative"
        style={{
          background: theme.bg,
          display: "flex",
          margin: 0,
          padding: 0,
        }}
      >
        {/* Head */}
        <div
          tw="absolute w-[51px] h-[51px] rounded-full"
          style={{
            background: theme.fg,
            display: "flex",
            top: "28px",
            backgroundImage:
              "linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.2) 100%)",
            boxShadow:
              "inset 6px -5px 11px rgba(0,0,0,0.13), inset -18px -12px 19px rgba(255,255,255,0.4)",
          }}
        />
        {/* Shoulders */}
        <div
          tw="absolute w-[102px] h-[102px] rounded-full"
          style={{
            background: theme.fg,
            display: "flex",
            top: "90px",
            clipPath: "inset(0 0 50% 0)",
            backgroundImage:
              "linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.2) 100%)",
            boxShadow:
              "inset 10px -12px 19px rgba(0,0,0,0.4), inset -18px -12px 19px rgba(255,255,255,0.4), inset 2px -1px 11px rgba(0,0,0,0.1)",
          }}
        />
      </div>
    ),
    {
      width: 128,
      height: 128,
      headers: corsHeaders,
    },
  );
}
