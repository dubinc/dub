import Image from "next/future/image";
import Head from "next/head";
import { escape } from "html-escaper";
import prisma from "@/lib/prisma";
import { LinkProps } from "@/lib/types";
import { redis } from "@/lib/upstash";

export default function LinkPage({ hostname, title, description, image }) {
  return (
    <>
      <Head>
        <meta property="og:title" content={escape(title)} />
        <meta property="og:site_name" content={escape(hostname)} />
        <meta property="og:description" content={escape(description)} />
        <meta property="og:image" content={escape(image)} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content={escape(hostname)} />
        <meta name="twitter:title" content={escape(title)} />
        <meta name="twitter:description" content={escape(description)} />
        <meta name="twitter:image" content={escape(image)} />
        <link
          rel="icon"
          href={`https://www.google.com/s2/favicons?sz=64&domain_url=${escape(
            hostname,
          )}`}
        />
      </Head>
      <main className="w-screen h-screen flex items-center justify-center">
        <div className="w-full max-w-lg mx-5 sm:mx-0 border border-gray-200 rounded-lg overflow-hidden">
          <Image
            src={image}
            alt={title}
            width={1200}
            height={627}
            className="w-full object-cover"
          />
          <div className="flex space-x-3 bg-gray-100 p-5">
            <Image
              src={`https://www.google.com/s2/favicons?sz=64&domain_url=${escape(
                hostname,
              )}`}
              alt={title}
              width={300}
              height={300}
              className="w-6 h-6 mt-1"
            />
            <div className="flex flex-col space-y-3">
              <h1 className="text-gray-700 font-bold">{title}</h1>
              <p className="text-gray-500 text-sm">{description}</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export function getStaticPaths() {
  return {
    paths: [],
    fallback: "blocking",
  };
}

export async function getStaticProps(ctx) {
  const { domain, key } = ctx.params;
  const response = await redis.hget<Omit<LinkProps, "key">>(
    `${domain}:links`,
    key,
  );
  const { url, title, description, image } = response || {};
  if (!url || !title || !description || !image) {
    return {
      notFound: true,
      revalidate: 1,
    };
  }

  const hostname = new URL(url).hostname;

  return {
    props: {
      hostname,
      title,
      description,
      image,
    },
    revalidate: 300,
  };
}
