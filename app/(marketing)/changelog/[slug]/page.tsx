import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allPosts } from "contentlayer/generated";
import { MDX } from "@/components/shared/mdx";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getBlurDataURL, getImages } from "@/lib/images";
import getTweets from "@/lib/twitter";
import BlurImage from "@/components/shared/blur-image";
import getRepos from "@/lib/github";

export async function generateStaticParams() {
  return allPosts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata | undefined> {
  const post = allPosts.find((post) => post.slug === params.slug);
  if (!post) {
    return;
  }

  const {
    title,
    publishedAt: publishedTime,
    summary: description,
    image,
    slug,
  } = post;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime,
      url: `https://dub.sh/changelog/${slug}`,
      images: [
        {
          url: image,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function ChangelogPost({
  params,
}: {
  params: { slug: string };
}) {
  const post = allPosts.find((post) => post.slug === params.slug);
  if (!post) {
    notFound();
  }

  const [images, tweets, repos] = await Promise.all([
    getImages(post.images),
    getTweets(post.tweetIds),
    getRepos(post.githubRepos),
  ]);

  return (
    <div className="lg:relative">
      <div className="mx-auto mb-20 max-w-2xl">
        <Link
          href="/blog"
          className="group ml-5 mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md shadow-zinc-800/5 ring-1 ring-zinc-900/5 transition sm:ml-0 lg:absolute lg:-left-5 lg:mb-0 lg:-mt-2 xl:-top-1.5 xl:left-0 xl:mt-0"
        >
          <span className="sr-only">Back to blog</span>
          <ArrowLeft className="h-4 w-4 stroke-zinc-500 transition group-hover:stroke-zinc-700" />
        </Link>
        <div>
          <div className="mx-5 flex flex-col sm:mx-auto">
            <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-zinc-800 sm:text-5xl">
              {post.title}
            </h1>
            <time
              dateTime={post.publishedAt}
              className="order-first flex items-center text-base text-zinc-500"
            >
              <span className="h-4 w-0.5 rounded-full bg-zinc-200" />
              <span className="ml-3">{formatDate(post.publishedAt)}</span>
            </time>
          </div>
          <BlurImage
            src={post.image}
            alt={post.title}
            width={1200}
            height={900}
            priority // since it's above the fold
            placeholder="blur"
            blurDataURL={await getBlurDataURL(post.image!)}
            className="my-10 sm:rounded-3xl"
          />

          <MDX
            code={post.body.code}
            images={images}
            tweets={tweets}
            repos={repos}
          />
        </div>
      </div>
    </div>
  );
}
