import Image from "next/future/image";
import Head from "next/head";
import { unescape } from "html-escaper";
import prisma from "@/lib/prisma";
import { getApexDomain } from "@/lib/utils";

export default function LinkPage({
  fullDomain,
  apexDomain,
  title,
  description,
  image,
}) {
  return (
    <>
      <Head>
        <meta property="og:title" content={unescape(title)} />
        <meta property="og:site_name" content={unescape(fullDomain)} />
        <meta property="og:description" content={unescape(description)} />
        <meta property="og:image" content={unescape(image)} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content={unescape(fullDomain)} />
        <meta name="twitter:title" content={unescape(title)} />
        <meta name="twitter:description" content={unescape(description)} />
        <meta name="twitter:image" content={unescape(image)} />
        <meta charSet="utf-8" />
        <link
          rel="icon"
          href={`https://www.google.com/s2/favicons?sz=64&domain_url=${unescape(
            apexDomain,
          )}`}
        />
      </Head>
      <main className="flex h-screen w-screen items-center justify-center">
        <div className="mx-5 w-full max-w-lg overflow-hidden rounded-lg border border-gray-200 sm:mx-0">
          <Image
            src={image}
            alt={title}
            width={1200}
            height={627}
            className="w-full object-cover"
          />
          <div className="flex space-x-3 bg-gray-100 p-5">
            <Image
              src={`https://www.google.com/s2/favicons?sz=64&domain_url=${unescape(
                apexDomain,
              )}`}
              alt={title}
              width={300}
              height={300}
              className="mt-1 h-6 w-6"
            />
            <div className="flex flex-col space-y-3">
              <h1 className="font-bold text-gray-700">{title}</h1>
              <p className="text-sm text-gray-500">{description}</p>
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
  const { domain, key } = ctx.params as { domain: string; key: string };
  const link = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain,
        key,
      },
    },
  });

  const { url, title, description, image } = link || {};

  if (!url) {
    return {
      notFound: true,
      revalidate: 1,
    };
  } else if (!image) {
    return {
      redirect: {
        destination: url,
      },
      revalidate: 1,
    };
  }

  const fullDomain = new URL(url).hostname;
  const apexDomain = getApexDomain(url);

  return {
    props: {
      fullDomain,
      apexDomain,
      title,
      description,
      image,
    },
    revalidate: 300,
  };
}
