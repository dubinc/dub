import { SHORT_DOMAIN } from "@dub/utils";
import { MetadataRoute } from "next";
import { headers } from "next/headers";

export default function robots(): MetadataRoute.Robots {
  const headersList = headers();
  let domain = headersList.get("host") as string;

  if (domain === "dub.localhost:8888" || domain.endsWith(".vercel.app")) {
    // for local development and preview URLs
    domain = SHORT_DOMAIN;
  }

  return {
    rules: [
      {
        userAgent: "Googlebot", // for Googlebot
        allow: ["/$", "/api/og/"], // allow the home page and the OG image API
        disallow: "/", // disallow everything else
      },
      {
        userAgent: "LinkedInBot", // for LinkedInBot
        allow: "/", // allow everything
      },
    ],
    sitemap: `https://${domain}/sitemap.xml`,
  };
}
