import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getTheme } from "./utils";

export const runtime = "edge";

export async function GET(req: NextRequest) {
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
  const seed = searchParams.get("seed");
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
          tw="absolute w-[200px] h-[200px] rounded-full"
          style={{
            background: theme.fg,
            display: "flex",
            top: "110px",
            backgroundImage:
              "linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.2) 100%)",
            boxShadow:
              "inset 24px -20px 44px rgba(0,0,0,0.13), inset -72px -48px 76px rgba(255,255,255,0.4)",
          }}
        />
        {/* Shoulders */}
        <div
          tw="absolute w-[400px] h-[400px] rounded-full"
          style={{
            background: theme.fg,
            display: "flex",
            top: "350px",
            clipPath: "inset(0 0 50% 0)",
            backgroundImage:
              "linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.2) 100%)",
            boxShadow:
              "inset 40px -48px 76px rgba(0,0,0,0.4), inset -72px -48px 76px rgba(255,255,255,0.4), inset 8px -2px 44px rgba(0,0,0,0.1)",
          }}
        />
      </div>
    ),
    {
      width: 500,
      height: 500,
      headers: corsHeaders,
    },
  );
}
