/* eslint-env node */
import { truncate } from "#/lib/utils";
import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const config = {
  runtime: "edge",
};

const satoshiBold = fetch(
  new URL("@/styles/Satoshi-Bold.ttf", import.meta.url),
).then((res) => res.arrayBuffer());

const interMedium = fetch(
  new URL("@/styles/Inter-Medium.ttf", import.meta.url),
).then((res) => res.arrayBuffer());

export default async function (req: NextRequest) {
  const [satoshiBoldData, interMediumData] = await Promise.all([
    satoshiBold,
    interMedium,
  ]);

  const { searchParams } = new URL(req.url);

  const title = searchParams.get("title") || "Help Center";
  const summary = searchParams.get("summary") || "Learn how to use Dub";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: 80,
          backgroundColor: "#030303",
          backgroundImage:
            "radial-gradient(circle at 25px 25px, #333 2%, transparent 0%), radial-gradient(circle at 75px 75px, #333 2%, transparent 0%)",
          backgroundSize: "100px 100px",
          backgroundPosition: "-30px -10px",
          fontWeight: 600,
          color: "white",
        }}
      >
        <svg
          style={{ position: "absolute", top: 70, left: 80 }}
          height="40"
          viewBox="0 0 834 236"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M266 119.5C266 181.632 215.632 232 153.5 232C91.368 232 41 181.632 41 119.5C41 57.368 91.368 7 153.5 7C215.632 7 266 57.368 266 119.5Z"
            fill="currentColor"
          />
          <mask
            id="mask0_46_2"
            style={{
              maskType: "alpha",
            }}
            maskUnits="userSpaceOnUse"
            x="41"
            y="7"
            width="225"
            height="225"
          >
            <path
              d="M266 119.5C266 181.632 215.632 232 153.5 232C91.368 232 41 181.632 41 119.5C41 57.368 91.368 7 153.5 7C215.632 7 266 57.368 266 119.5Z"
              fill="currentColor"
            />
          </mask>
          <g mask="url(#mask0_46_2)">
            <ellipse cx="153" cy="124.5" rx="58" ry="57.5" fill="black" />
            <path d="M185 -10H211V181H185V-10Z" fill="black" />
          </g>
          <path
            d="M397.25 213.75C385.25 213.75 374.833 211.083 366 205.75C357.167 200.417 350.25 192.917 345.25 183.25C340.417 173.417 338 161.917 338 148.75C338 135.417 340.5 123.75 345.5 113.75C350.5 103.583 357.583 95.6667 366.75 90C376.083 84.3333 387.083 81.5 399.75 81.5C407.583 81.5 414.833 82.9167 421.5 85.75C428.333 88.5833 433.583 92.3333 437.25 97V22H475.75V210.5H439.5L437.5 194.5C434.167 200.167 428.833 204.833 421.5 208.5C414.333 212 406.25 213.75 397.25 213.75ZM406.5 178.5C412.5 178.5 417.75 177.25 422.25 174.75C426.917 172.083 430.5 168.417 433 163.75C435.667 158.917 437 153.417 437 147.25C437 140.917 435.667 135.417 433 130.75C430.5 126.083 426.917 122.5 422.25 120C417.75 117.333 412.5 116 406.5 116C400.5 116 395.25 117.333 390.75 120C386.25 122.667 382.75 126.333 380.25 131C377.917 135.667 376.75 141.083 376.75 147.25C376.75 153.417 377.917 158.833 380.25 163.5C382.75 168.167 386.25 171.833 390.75 174.5C395.25 177.167 400.5 178.5 406.5 178.5Z"
            fill="currentColor"
          />
          <path
            d="M587.662 85.5H626.162C626.162 85.5 626.162 148.5 626.162 164C626.162 179.5 623.786 191.5 616.5 200.5C609.214 209.5 594 213.75 582.162 213.75C570.324 213.75 564.412 213.75 564.412 213.75C564.412 213.75 556.662 213.75 549.162 213.75C534.995 213.75 523.745 209.333 515.412 200.5C507.245 191.5 503.162 179.333 503.162 164V85.5H541.662V150C541.662 160.167 543.495 167.667 547.162 172.5C550.829 177.167 556.579 179.5 564.412 179.5C572.745 179.5 578.662 177.25 582.162 172.75C585.829 168.083 587.662 160.667 587.662 150.5V85.5Z"
            fill="currentColor"
          />
          <path
            d="M691.303 210.5H655.053V22H693.553V100C697.386 94.3333 703.053 89.8333 710.553 86.5C718.219 83 726.553 81.25 735.553 81.25C747.219 81.25 757.303 84.0833 765.803 89.75C774.469 95.4167 781.136 103.333 785.803 113.5C790.469 123.667 792.803 135.583 792.803 149.25C792.803 162.083 790.219 173.417 785.053 183.25C780.053 192.917 772.969 200.417 763.803 205.75C754.803 211.083 744.386 213.75 732.553 213.75C723.886 213.75 715.969 212 708.803 208.5C701.803 204.833 696.636 200.167 693.303 194.5L691.303 210.5ZM693.803 147.25C693.803 153.417 695.053 158.917 697.553 163.75C700.219 168.417 703.803 172.083 708.303 174.75C712.969 177.25 718.303 178.5 724.303 178.5C730.469 178.5 735.719 177.167 740.053 174.5C744.553 171.833 747.969 168.167 750.303 163.5C752.803 158.833 754.053 153.417 754.053 147.25C754.053 141.083 752.803 135.667 750.303 131C747.969 126.333 744.553 122.667 740.053 120C735.719 117.333 730.469 116 724.303 116C718.303 116 712.969 117.333 708.303 120C703.803 122.5 700.219 126.083 697.553 130.75C695.053 135.417 693.803 140.917 693.803 147.25Z"
            fill="currentColor"
          />
        </svg>
        <h1
          style={{
            fontSize: 82,
            fontFamily: "Satoshi Bold",
            margin: "0 0 40px -2px",
            lineHeight: 1.1,
            textShadow: "0 2px 30px #000",
            letterSpacing: -4,
            backgroundImage: "linear-gradient(90deg, #fff 40%, #aaa)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          {truncate(title, 100)}
        </h1>
        <p
          style={{
            position: "absolute",
            bottom: 70,
            left: 80,
            margin: 0,
            fontSize: 30,
            fontFamily: "Inter Medium",
            letterSpacing: -1,
          }}
        >
          {truncate(summary, 140)}
        </p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Satoshi Bold",
          data: satoshiBoldData,
        },
        {
          name: "Inter Medium",
          data: interMediumData,
        },
      ],
    },
  );
}
