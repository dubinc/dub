import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allChangelogPosts } from "contentlayer/generated";
import { MDX } from "app/(marketing)/components/mdx";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { getBlurDataURL, getImages } from "@/lib/images";
import BlurImage from "@/components/shared/blur-image";
import Author from "app/(marketing)/components/author";
import { Facebook, LinkedIn, Twitter } from "@/components/shared/icons";

export async function generateStaticParams() {
  return allChangelogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata | undefined> {
  const post = allChangelogPosts.find((post) => post.slug === params.slug);
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
  const post = allChangelogPosts.find((post) => post.slug === params.slug);
  if (!post) {
    notFound();
  }

  const images = await getImages(post.images || []);

  return (
    <div className="mx-auto my-20 max-w-screen-md">
      <div className="mx-5 grid gap-5 md:mx-0">
        <div className="flex space-x-4">
          <Link
            href="/changelog"
            className="flex max-w-fit items-center justify-center rounded-full bg-gray-200 px-3 py-1 text-sm text-gray-500"
          >
            Changelog
          </Link>
          <time
            dateTime={post.publishedAt}
            className="flex items-center text-sm text-gray-500"
          >
            {formatDate(post.publishedAt)}
          </time>
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-gray-800 sm:text-5xl">
          {post.title}
        </h1>
      </div>
      <BlurImage
        src={post.image}
        alt={post.title}
        width={1200}
        height={900}
        priority // since it's above the fold
        placeholder="blur"
        blurDataURL={await getBlurDataURL(post.image!)}
        className="my-10 md:rounded-2xl"
      />
      <div className="mb-10 flex items-center justify-between">
        {/* @ts-expect-error Async Server Component */}
        <Author username={post.author} />
        <div className="flex items-center space-x-6">
          <Link
            href={`https://twitter.com/intent/tweet?text=${post.title}&url=https://dub.sh/changelog/${post.slug}&via=${post.author}`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-all hover:scale-110"
          >
            <Twitter className="h-6 w-6" />
          </Link>
          <Link
            href={`
            http://www.linkedin.com/shareArticle?mini=true&url=https://dub.sh/changelog/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-all hover:scale-110"
          >
            <LinkedIn className="h-6 w-6" fill="black" />
          </Link>
          <Link
            href={`https://www.facebook.com/sharer/sharer.php?u=https://dub.sh/changelog/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-all hover:scale-110"
          >
            <Facebook className="h-6 w-6" fill="black" />
          </Link>
        </div>
      </div>
      <MDX code={post.body.code} images={images} />
    </div>
  );
}
