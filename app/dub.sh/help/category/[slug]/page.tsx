import { notFound } from "next/navigation";
import { allHelpPosts } from "contentlayer/generated";
import { CATEGORIES } from "#/lib/constants/content";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import SearchButton from "#/ui/content/search-button";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ArticleLink from "#/ui/content/article-link";

export default function HelpArticle({
  params,
}: {
  params: {
    slug: string;
  };
}) {
  const data = CATEGORIES.find((category) => category.slug === params.slug);
  if (!data) {
    notFound();
  }
  const articles = allHelpPosts.filter((post) => post.category === data.slug);

  return (
    <>
      <MaxWidthWrapper className="max-w-screen-lg">
        <div className="flex flex-col py-10">
          <SearchButton />
        </div>
      </MaxWidthWrapper>

      <div className="border border-gray-200 bg-white/50 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.2)] backdrop-blur-lg">
        <MaxWidthWrapper className="flex max-w-screen-lg flex-col py-10">
          <div className="flex items-center space-x-2">
            <Link
              href="/help"
              className="text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              All Categories
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <Link
              href={`/help/category/${data.slug}`}
              className="text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              {data.title}
            </Link>
          </div>
          <div className="my-8 flex flex-col space-y-4">
            <Link href={`/help/category/${data.slug}`}>
              <h1 className="font-display text-2xl font-bold sm:text-4xl">
                {data.title}
              </h1>
            </Link>
            <p className="text-gray-500">{data.description}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-6">
            {articles.map((article) => (
              <ArticleLink key={article.slug} article={article} />
            ))}
          </div>
        </MaxWidthWrapper>
      </div>
    </>
  );
}
