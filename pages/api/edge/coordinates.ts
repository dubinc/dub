import type { NextRequest } from "next/server";

export const config = {
  runtime: "experimental-edge",
};

export default async function handler(req: NextRequest) {
  if (req.method === "GET") {
    const count = 50;
    const domain = req.nextUrl.searchParams.get("domain");

    const response = await fetch(
      `https://api.us-east.tinybird.co/v0/pipes/coordinates.json?domain=${domain}&count=${count}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
        },
      },
    )
      .then((res) => res.json())
      .then((res) => res.data);

    const latestCoordinates = response.map(({ latitude, longitude }, idx) => {
      return {
        location: [latitude, longitude],
        size: 0.075 - (0.075 / count) * idx,
      };
    });
    return new Response(JSON.stringify(latestCoordinates), { status: 200 });
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
