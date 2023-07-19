import { isHomeHostname } from "#/lib/utils";
import { MetadataRoute } from "next";
import { headers } from "next/headers";

export default function robots(): MetadataRoute.Robots {
  const headersList = headers();
  let domain = headersList.get("host") as string;
  if (isHomeHostname(domain)) domain = "dub.sh";

  return {
    rules: {
      userAgent: "*",
      disallow: "/api/",
      allow: "/api/og/",
    },
    sitemap: `https://${domain}/sitemap.xml`,
  };
}
