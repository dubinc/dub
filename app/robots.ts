import { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isHomeHostname } from "#/lib/constants";

export default function robots(): MetadataRoute.Robots {
  const headersList = headers();
  let domain = headersList.get("host") as string;
  if (isHomeHostname(domain)) domain = "dub.co";

  return {
    rules: {
      userAgent: "*",
      disallow: ["/api/", "/_next/"],
      allow: "/api/og/",
    },
    sitemap: `https://${domain}/sitemap.xml`,
  };
}
