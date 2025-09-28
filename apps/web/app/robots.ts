import { MetadataRoute } from "next";
import { headers, type UnsafeUnwrappedHeaders } from "next/headers";

export default function robots(): MetadataRoute.Robots {
  const headersList = (headers() as unknown as UnsafeUnwrappedHeaders);
  let domain = headersList.get("host") as string;

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
