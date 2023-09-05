import BlurImage from "#/ui/blur-image";
import { getBlurDataURL } from "#/lib/images";
import { allChangelogPosts } from "contentlayer/generated";
import { constructMetadata, formatDate } from "#/lib/utils";
import Link from "next/link";
import { MDX } from "#/ui/content/mdx";
import { Twitter } from "@/components/shared/icons";
import { Rss } from "lucide-react";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export const metadata = constructMetadata({
  title: "Changelog – Dub",
  description:
    "All the latest updates, improvements, and fixes to Dub - the link management tool for modern marketing teams.",
  image: "/api/og/changelog",
});

export default function Changelog() {
  return (
    <MaxWidthWrapper className="px-0">
      <div className="relative grid border-b border-gray-200 py-20 md:grid-cols-4">
        <div className="md:col-span-1" />
        <div className="mx-5 flex flex-col space-y-6 md:col-span-3 md:mx-0">
          <h1 className="font-display text-4xl font-bold tracking-tight text-gray-800 md:text-5xl">
            Changelog
          </h1>
          <p className="text-lg text-gray-500">
            All the latest updates, improvements, and fixes to Dub.
          </p>
        </div>
        <div className="absolute bottom-2 right-0 flex items-center space-x-2">
          <p className="text-sm text-gray-500">Subscribe to updates →</p>
          <Link
            href="https://twitter.com/dubdotco"
            className="rounded-full bg-blue-100 p-2 transition-colors hover:bg-blue-200"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Twitter className="h-4 w-4 text-[#1d9bf0]" />
          </Link>
          <Link
            href="/atom"
            className="rounded-full bg-gray-100 p-2 transition-colors hover:bg-gray-200"
          >
            <Rss className="h-4 w-4 text-gray-500" />
          </Link>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {allChangelogPosts
          .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
          .map(async (post, idx) => (
            <div
              key={idx}
              className="grid py-20 md:grid-cols-4 md:px-5 xl:px-0"
            >
              <div className="sticky top-20 hidden self-start md:col-span-1 md:block">
                <Link href={`/changelog/${post.slug}`}>
                  <time
                    dateTime={post.publishedAt}
                    className="text-gray-500 transition-colors hover:text-gray-800"
                  >
                    {formatDate(post.publishedAt)}
                  </time>
                </Link>
              </div>
              <div className="flex flex-col gap-6 md:col-span-3">
                <Link href={`/changelog/${post.slug}`}>
                  <BlurImage
                    src={post.image}
                    alt={post.title}
                    width={1200}
                    height={630}
                    priority={idx === 0} // since it's above the fold
                    placeholder="blur"
                    blurDataURL={await getBlurDataURL(post.image!)}
                    className="aspect-video border border-gray-100 object-cover md:rounded-2xl"
                  />
                </Link>
                <Link
                  href={`/changelog/${post.slug}`}
                  className="group mx-5 flex items-center space-x-3 md:mx-0"
                >
                  <time
                    dateTime={post.publishedAt}
                    className="text-sm text-gray-500 transition-all group-hover:text-gray-800 md:hidden"
                  >
                    {formatDate(post.publishedAt)}
                  </time>
                </Link>
                <Link href={`/changelog/${post.slug}`} className="mx-5 md:mx-0">
                  <h2 className="font-display text-3xl font-bold tracking-tight text-gray-800 hover:underline hover:decoration-1 hover:underline-offset-4 md:text-4xl">
                    {post.title}
                  </h2>
                </Link>
                <MDX
                  code={post.body.code}
                  className="mx-5 sm:prose-lg md:mx-0"
                />
              </div>
            </div>
          ))}
      </div>
    </MaxWidthWrapper>
  );
}
