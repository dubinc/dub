import { getStats } from "@/lib/stats";
import { nFormatter, truncate } from "@/lib/utils";
import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const config = {
  runtime: "experimental-edge",
};

const satoshi = fetch(
  new URL("../../../styles/Satoshi-Black.ttf", import.meta.url),
).then((res) => res.arrayBuffer());

const inter = fetch(
  new URL("../../../styles/Inter-Bold.ttf", import.meta.url),
).then((res) => res.arrayBuffer());

export default async function handler(req: NextRequest) {
  const [satoshiData, interData] = await Promise.all([satoshi, inter]);

  const { searchParams } = req.nextUrl;
  const key = searchParams.get("key") || "github";
  const clicks = searchParams.get("clicks") || "12702";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "white",
          backgroundImage: `url(${new URL(
            "../../../public/_static/background.png",
            import.meta.url,
          ).toString()})`,
        }}
      >
        <h1
          style={{
            fontSize: "100px",
            fontWeight: "bold",
            fontFamily: "Satoshi",
            background:
              "linear-gradient(95.78deg, #C7BF00 21.66%, #E43838 86.47%)",
            backgroundClip: "text",
            color: "transparent",
            marginTop: "100px",
          }}
        >
          dub.sh/{truncate(key, 12)}
        </h1>
        <p
          style={{
            fontSize: "50px",
            fontWeight: "bold",
            fontFamily: "Inter",
            color: "black",
            opacity: 0.6,
            marginTop: "16px",
          }}
        >
          {nFormatter(parseInt(clicks))} TOTAL CLICKS
        </p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Satoshi",
          data: satoshiData,
        },
        {
          name: "Inter",
          data: interData,
        },
      ],
    },
  );
}
