import { NextResponse } from "next/server";

export const runtime = "edge";

export default async function handler() {
  return NextResponse.json({
    openapi: "3.0.3",
    info: {
      title: "Dub.co API",
      description:
        "Dub is an open-source link management tool for modern marketing teams to create, share, and track short links.",
      contact: {
        email: "support@dub.co",
        name: "Dub.co Support",
        url: "https://dub.co/help",
      },
      version: "0.0.1",
    },
    servers: [
      {
        url: "https://api.dub.co",
        description: "Production API",
      },
      {
        url: "https://api.dub.sh",
        description: "Staging API",
      },
    ],
    paths: {},
  });
}
