export const config = { runtime: "experimental-edge" };
import { redis } from "@/lib/upstash";
import { LinkProps } from "@/lib/types";
import Head from "next/head";
import { escape } from "html-escaper";

export default function LinkPage({ url, title, description, image }) {
  return (
    <Head>
      <meta prefix="og: http://ogp.me/ns#" charSet="UTF-8" />
      <meta
        prefix="og: http://ogp.me/ns#"
        name="viewport"
        content="width=device-width, initial-scale=1.0"
      />
      <title>{escape(title)}</title>
      <meta
        prefix="og: http://ogp.me/ns#"
        name="description"
        content={escape(description)}
      />
      <meta
        prefix="og: http://ogp.me/ns#"
        property="og:title"
        content={escape(title)}
      />
      <meta
        prefix="og: http://ogp.me/ns#"
        property="og:description"
        content={escape(description)}
      />
      <meta
        prefix="og: http://ogp.me/ns#"
        property="og:image"
        content={escape(image)}
      />
      <meta
        prefix="og: http://ogp.me/ns#"
        property="og:url"
        content={escape(url)}
      />
      <meta
        prefix="og: http://ogp.me/ns#"
        property="og:type"
        content="website"
      />
      <meta
        prefix="og: http://ogp.me/ns#"
        property="og:site_name"
        content={escape(url)}
      />
      <meta
        prefix="og: http://ogp.me/ns#"
        name="twitter:card"
        content="summary_large_image"
      />
      <meta
        prefix="og: http://ogp.me/ns#"
        name="twitter:title"
        content={escape(title)}
      />
      <meta
        prefix="og: http://ogp.me/ns#"
        name="twitter:description"
        content={escape(description)}
      />
      <meta
        prefix="og: http://ogp.me/ns#"
        name="twitter:image"
        content={escape(image)}
      />
    </Head>
  );
}

export async function getServerSideProps(ctx) {
  const { domain, key } = ctx.params;
  console.log("2nd LOGGING", domain, key);
  const response = await redis.hget<Omit<LinkProps, "key">>(
    `${domain}:links`,
    key
  );
  console.log("3rd LOGGING", response);
  const { url, title, description, image } = response || {};
  if (!url || !title || !description || !image) {
    return {
      notFound: true,
    };
  }

  console.log("4th LOGGING", url, title, description, image);
  const hostname = new URL(url).hostname;

  return {
    props: {
      url: hostname,
      title,
      description,
      image,
    },
  };
}
