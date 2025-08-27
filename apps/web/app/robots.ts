import { MetadataRoute } from "next";
import { headers } from "next/headers";

export default function robots(): MetadataRoute.Robots {
  const headersList = headers();
  let domain = headersList.get("host") as string;

  if (domain && domain.includes("dev")) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `https://${domain}/sitemap.xml`,
  };
}
