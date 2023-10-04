import { ImageResponse, NextRequest } from "next/server";
import { allChangelogPosts } from "contentlayer/generated";
import { formatDate } from "#/lib/utils";

export const runtime = "edge";
export const contentType = "image/png";

const satoshiBold = fetch(
  new URL("@/styles/Satoshi-Bold.ttf", import.meta.url),
).then((res) => res.arrayBuffer());

const interMedium = fetch(
  new URL("@/styles/Inter-Medium.ttf", import.meta.url),
).then((res) => res.arrayBuffer());

export default async function handler() {
  const [satoshiBoldData, interMediumData] = await Promise.all([
    satoshiBold,
    interMedium,
  ]);

  const post = allChangelogPosts.sort((a, b) => {
    if (new Date(a.publishedAt) > new Date(b.publishedAt)) {
      return -1;
    }
    return 1;
  })[0];

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
          fontFamily: "Inter Medium",
        }}
      >
        <img
          src="https://dub.co/_static/logotype.png"
          style={{
            height: "40px",
            position: "absolute",
            top: "20px",
            left: "20px",
          }}
        />
        <div tw="flex flex-col text-left pt-20 pb-10 pl-80 border-b border-gray-200 w-full">
          <h1
            style={{
              fontFamily: "Satoshi Bold",
            }}
            tw="text-5xl font-bold text-black"
          >
            Changelog
          </h1>
          <p tw="text-lg text-gray-500">
            All the latest updates, improvements, and fixes to Dub.
          </p>
        </div>
        <div tw="flex w-full pt-10 pl-28">
          <p tw="text-gray-500">{formatDate(post.publishedAt)}</p>
          <div tw="flex flex-col ml-24">
            <img src={post.image} tw="rounded-lg h-96" />
          </div>
        </div>
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
