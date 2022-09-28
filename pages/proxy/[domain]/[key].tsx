import { redis } from "@/lib/upstash";
import prisma from "@/lib/prisma";
import { LinkProps } from "@/lib/types";
import Head from "next/head";
import { escape } from "html-escaper";
import Image from "next/future/image";

export default function LinkPage({ url, title, description, image, logo }) {
  return (
    <>
      <Head>
        <meta property="og:title" content={escape(title)} />
        <meta property="og:site_name" content={escape(url)} />
        <meta property="og:description" content={escape(description)} />
        <meta property="og:image" content={escape(image)} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content={escape(url)} />
        <meta name="twitter:title" content={escape(title)} />
        <meta name="twitter:description" content={escape(description)} />
        <meta name="twitter:image" content={escape(image)} />
        {logo && <link rel="icon" href={logo} />}
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
            {logo && (
              <Image
                src={logo}
                alt={title}
                width={300}
                height={300}
                className="w-6 h-6 mt-1"
              />
            )}
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
    key
  );
  const { url, title, description, image } = response || {};
  if (!url || !title || !description || !image) {
    return {
      notFound: true,
    };
  }
  const project = await prisma.project.findUnique({
    where: {
      domain,
    },
    select: {
      logo: true,
    },
  });

  const hostname = new URL(url).hostname;

  return {
    props: {
      url: hostname,
      title,
      description,
      image,
      logo: project?.logo,
    },
    revalidate: 300,
  };
}
