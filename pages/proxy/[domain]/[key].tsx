export const config = { runtime: "experimental-edge" };
import { redis } from "@/lib/upstash";
import { LinkProps } from "@/lib/types";
import Head from "next/head";

export default function LinkPage({ url, title, description, image }) {
  return (
    <Head>
      <meta property="og:title" content={title} />
      <meta property="og:site_name" content={url} />
      <meta property="og:description" content={description} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={url} />
      <meta property="og:image" content={image} />
    </Head>
  );
}

export async function getServerSideProps(ctx) {
  const { domain, key } = ctx.params;
  const response = await redis.hget<Omit<LinkProps, "key">>(
    `${domain}:links`,
    key
  );
  const { url, title, description, image } = response || {};
  if (!url || !title || !description || !image) {
    return {
      notFound: true,
    };
  }

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
