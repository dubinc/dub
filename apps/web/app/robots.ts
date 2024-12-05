import { headers } from "next/headers";

export default async function robots() {
  const headersList = await headers();
  const domain = headersList.get("host");

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
