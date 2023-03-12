import { getLinkViaEdge } from "@/lib/planetscale";
import { getStats } from "@/lib/stats";
import { nFormatter, truncate } from "@/lib/utils";
import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const config = {
  runtime: "edge",
};

const satoshiBLack = fetch(
  new URL("../../../styles/Satoshi-Black.ttf", import.meta.url),
).then((res) => res.arrayBuffer());

const satoshiBold = fetch(
  new URL("../../../styles/Satoshi-Bold.ttf", import.meta.url),
).then((res) => res.arrayBuffer());

export default async function handler(req: NextRequest) {
  const [satoshiBlackData, satoshiBoldData] = await Promise.all([
    satoshiBLack,
    satoshiBold,
  ]);

  const { searchParams } = req.nextUrl;
  const domain = searchParams.get("domain") || "dub.sh";
  const key = searchParams.get("key") || "github";

  const data = await getLinkViaEdge(domain, key);
  if (!data?.publicStats) {
    return new Response(`Stats for this link are not public`, {
      status: 403,
    });
  }

  const timeseries = await getStats({
    domain,
    key,
    endpoint: "timeseries",
    interval: "30d",
  });

  const maxClicks = Math.max(...timeseries.map((t) => t.clicks));
  const totalClicks = timeseries.reduce((acc, t) => acc + t.clicks, 0);

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
            fontSize: "80px",
            fontFamily: "Satoshi Black",
            background:
              "linear-gradient(95.78deg, #C7BF00 21.66%, #E43838 86.47%)",
            backgroundClip: "text",
            color: "transparent",
            marginTop: "50px",
            lineHeight: "7rem",
          }}
        >
          {domain}/{truncate(key, 12)}
        </h1>
        <p
          style={{
            fontSize: "40px",
            fontFamily: "Satoshi Bold",
            color: "black",
            opacity: 0.8,
            marginTop: "-10px",
          }}
        >
          {nFormatter(totalClicks)} clicks in the last 30 days
        </p>
        <div
          style={{
            position: "absolute",
            bottom: "80px",
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "center",
            marginTop: "50px",
          }}
        >
          {timeseries.map(({ start, clicks }) => (
            <div
              key={start}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "20px",
                height: `${(clicks / maxClicks) * 300}px`, // normalize clicks count to scale of 300px
                marginRight: "10px",
                backgroundColor: "#2563eb",
              }}
            />
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "0px",
            height: "80px",
            width: "100%",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255, 255, 255, 0.4)",
            backdropFilter: "blur(30px)",
          }}
        >
          <img
            src={new URL(
              "../../../public/_static/logo.png",
              import.meta.url,
            ).toString()}
            style={{
              width: "40px",
              height: "40px",
            }}
          />
          <h2
            style={{
              fontSize: "25px",
              fontFamily: "Satoshi Bold",
              color: "#000",
              marginLeft: "20px",
            }}
          >
            Dub.sh - Link Management For Modern Marketing Teams
          </h2>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Satoshi Black",
          data: satoshiBlackData,
        },
        {
          name: "Satoshi Bold",
          data: satoshiBoldData,
        },
      ],
    },
  );
}
