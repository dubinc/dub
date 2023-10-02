import { MetadataRoute } from "next";
import { headers } from "next/headers";

export default function robots(): MetadataRoute.Robots {
  const headersList = headers();
  let domain = headersList.get("host") as string;

  return {
    rules: {
      userAgent: "*",
      disallow: "/api/",
      allow: "/api/og/",
    },
    sitemap: `https://dub.co/sitemap.xml`,
  };
}
