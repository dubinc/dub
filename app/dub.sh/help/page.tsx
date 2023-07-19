import { constructMetadata } from "#/lib/utils";
import { ExpandingArrow } from "#/ui/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { allHelpPosts } from "contentlayer/generated";
import { Search } from "lucide-react";
import Link from "next/link";
import { CATEGORIES, POPULAR_ARTICLES } from "./constants";
import CategoryCard from "#/ui/help/category-card";

export const metadata = constructMetadata({
  title: "Help Center – Dub",
});

export default function HelpCenter() {
  const popularArticles = POPULAR_ARTICLES.map(
    (slug) => allHelpPosts.find((post) => post.slug === slug)!,
  );

  const categories = CATEGORIES.map((category) => ({
    ...category,
    postCount: allHelpPosts.filter((post) =>
      post.categories.includes(category.slug),
    ).length,
  }));

  return (
    <>
      <MaxWidthWrapper className="max-w-screen-lg">
        <div className="flex flex-col space-y-4 py-10">
          <h1 className="font-display text-xl font-bold text-gray-700 sm:text-3xl">
            👋 How can we help today?
          </h1>
          <button className="group relative flex">
            <Search className="absolute inset-y-0 left-4 z-10 my-auto h-4 w-4 text-gray-500" />
            <div className="w-full rounded-xl border border-gray-200 bg-white p-3 pl-12 text-left text-gray-500 shadow-md transition ease-out group-active:border-gray-200 group-active:shadow-none">
              Search for articles...
            </div>
          </button>
        </div>
      </MaxWidthWrapper>

      <div className="relative">
        <div className="absolute top-28 h-full w-full border border-gray-200 bg-white/10 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.2)] backdrop-blur" />
        <MaxWidthWrapper className="max-w-screen-lg pb-20">
          <div className="relative mb-10 rounded-xl border border-gray-200 bg-white px-4 py-6">
            <h2 className="px-4 font-display text-2xl font-bold text-gray-700">
              Popular Articles
            </h2>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {popularArticles.map((article) => (
                <Link
                  href={`/help/${article.slug}`}
                  key={article.slug}
                  className="group flex items-center justify-between rounded-lg px-4 py-2.5 transition-colors hover:bg-purple-100 active:bg-purple-200"
                >
                  <h3 className="font-medium text-gray-600 group-hover:text-purple-600">
                    {article.title}
                  </h3>
                  <ExpandingArrow className="-ml-4 h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                </Link>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {categories.map((category) => (
              <CategoryCard
                key={category.slug}
                href={`/help/${category.slug}`}
                name={category.title}
                description={category.description}
                icon={category.icon}
                pattern={{
                  y: 16,
                  squares: [
                    [0, 1],
                    [1, 3],
                  ],
                }}
              />
            ))}
          </div>
        </MaxWidthWrapper>
      </div>
    </>
  );
}
