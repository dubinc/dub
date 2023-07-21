import SearchButton from "#/ui/content/search-button";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { allHelpPosts } from "contentlayer/generated";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { CATEGORIES } from "#/lib/constants/content";
import Link from "next/link";
import Author from "#/ui/content/author";
import { MDX } from "#/ui/content/mdx";
import TableOfContents from "#/ui/content/table-of-contents";
import Feedback from "#/ui/content/feedback";

export default function HelpArticle({
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
  const category = CATEGORIES.find(
    (category) => category.slug === data.category,
  )!;

  return (
    <>
      <MaxWidthWrapper className="max-w-screen-lg">
        <div className="flex flex-col py-10">
          <SearchButton />
        </div>
      </MaxWidthWrapper>

      <div className="border border-gray-200 bg-white/50 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.2)] backdrop-blur-lg">
        <MaxWidthWrapper className="grid max-w-screen-lg grid-cols-4 gap-10 py-10">
          <div className="col-span-4 sm:col-span-3 sm:pr-10">
            <div className="flex flex-wrap items-center space-x-2">
              <Link
                href="/help"
                className="text-sm font-medium text-gray-500 hover:text-gray-800"
              >
                All Categories
              </Link>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <Link
                href={`/help/category/${category.slug}`}
                className="text-sm font-medium text-gray-500 hover:text-gray-800"
              >
                {category.title}
              </Link>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <Link
                href={`/help/article/${data.slug}`}
                className="text-sm font-medium text-gray-500 hover:text-gray-800"
              >
                {data.title}
              </Link>
            </div>
            <div className="my-8 flex flex-col space-y-4">
              <Link href={`/help/article/${data.slug}`}>
                <h1 className="font-display text-2xl font-bold sm:text-4xl">
                  {data.title}
                </h1>
              </Link>
              <p className="text-gray-500">{data.summary}</p>
              <Author username={data.author} updatedAt={data.updatedAt} />
            </div>
            <MDX code={data.body.code} />
            <Feedback />
          </div>
          <TableOfContents items={data.tableOfContents} />
        </MaxWidthWrapper>
      </div>
    </>
  );
}
