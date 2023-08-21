import SearchButton from "#/ui/content/search-button";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { HelpPost, allHelpPosts } from "contentlayer/generated";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { HELP_CATEGORIES } from "#/lib/constants/content";
import Link from "next/link";
import Author from "#/ui/content/author";
import { MDX } from "#/ui/content/mdx";
import TableOfContents from "#/ui/content/table-of-contents";
import Feedback from "#/ui/content/feedback";
import HelpArticleLink from "#/ui/content/help-article-link";
import { getBlurDataURL } from "#/lib/images";
import { Metadata } from "next";
import { constructMetadata } from "#/lib/utils";
import { getAndCacheTweet } from "#/lib/twitter";

export async function generateStaticParams() {
  return allHelpPosts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata | undefined> {
  const post = allHelpPosts.find((post) => post.slug === params.slug);
  if (!post) {
    return;
  }

  const { title, summary } = post;

  return constructMetadata({
    title: `${title} – Dub Help Center`,
    description: summary,
    image: `/api/og/help?title=${encodeURIComponent(
      title,
    )}&summary=${encodeURIComponent(summary)}`,
  });
}

export default async function HelpArticle({
  params,
}: {
  params: {
    slug: string;
  };
}) {
  const data = allHelpPosts.find((post) => post.slug === params.slug);
  if (!data) {
    notFound();
  }
  const category = HELP_CATEGORIES.find(
    (category) => data.categories[0] === category.slug,
  )!;

  const [images, tweets] = await Promise.all([
    await Promise.all(
      data.images.map(async (src: string) => ({
        src,
        blurDataURL: await getBlurDataURL(src),
      })),
    ),
    await Promise.all(
      data.tweetIds.map(async (id: string) => getAndCacheTweet(id)),
    ),
  ]);

  const relatedArticles =
    ((data.related &&
      data.related
        .map((slug) => allHelpPosts.find((post) => post.slug === slug))
        .filter(Boolean)) as HelpPost[]) || [];

  return (
    <>
      <MaxWidthWrapper className="flex max-w-screen-lg flex-col py-10">
        <SearchButton />
      </MaxWidthWrapper>

      <div className="border border-gray-200 bg-white/50 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.2)] backdrop-blur-lg">
        <MaxWidthWrapper className="grid max-w-screen-lg grid-cols-4 gap-10 py-10">
          <div className="col-span-4 flex flex-col space-y-8 sm:col-span-3 sm:pr-10">
            <div className="flex items-center space-x-2">
              <Link
                href="/help"
                className="whitespace-nowrap text-sm font-medium text-gray-500 hover:text-gray-800"
              >
                All Categories
              </Link>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <Link
                href={`/help/category/${category.slug}`}
                className="whitespace-nowrap text-sm font-medium text-gray-500 hover:text-gray-800"
              >
                {category.title}
              </Link>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <Link
                href={`/help/article/${data.slug}`}
                className="truncate text-sm font-medium text-gray-500 hover:text-gray-800"
              >
                {data.title}
              </Link>
            </div>
            <div className="flex flex-col space-y-4">
              <Link href={`/help/article/${data.slug}`}>
                <h1 className="font-display text-3xl font-bold !leading-snug sm:text-4xl">
                  {data.title}
                </h1>
              </Link>
              <p className="text-gray-500">{data.summary}</p>
              <Author username={data.author} updatedAt={data.updatedAt} />
            </div>
            <MDX code={data.body.code} images={images} tweets={tweets} />
            {relatedArticles.length > 0 && (
              <div className="flex flex-col space-y-4 border-t border-gray-200 pt-8">
                <h2 className="font-display text-xl font-bold sm:text-2xl">
                  Related Articles
                </h2>
                <div className="grid gap-2 rounded-xl border border-gray-200 bg-white p-4">
                  {relatedArticles.map((article) => (
                    <HelpArticleLink key={article.slug} article={article} />
                  ))}
                </div>
              </div>
            )}
            <Feedback />
          </div>
          <div className="sticky top-20 col-span-1 hidden flex-col space-y-10 divide-y divide-gray-200 self-start sm:flex">
            {data.tableOfContents.length > 0 && (
              <TableOfContents items={data.tableOfContents} />
            )}
            <div className="flex justify-center pt-5">
              <Link
                href={`https://github.com/steven-tey/dub/blob/main/content/help/${params.slug}.mdx`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 transition-colors hover:text-gray-800"
              >
                Found a typo? Edit this page ↗
              </Link>
            </div>
          </div>
        </MaxWidthWrapper>
      </div>
    </>
  );
}
