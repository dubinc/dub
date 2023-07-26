"use client";

import { BLOG_CATEGORIES } from "#/lib/constants/content";
import { cn } from "#/lib/utils";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function BlogLayoutHero() {
  const { slug } = useParams() as { slug?: string };

  const data = BLOG_CATEGORIES.find((category) => category.slug === slug);

  return (
    <MaxWidthWrapper>
      <div className="max-w-screen-sm py-16">
        <h1 className="font-display text-3xl font-extrabold text-gray-700 sm:text-4xl">
          {data?.title || "Blog"}
        </h1>
        <p className="mt-4 text-xl text-gray-500">
          {data?.description || "Latest news and updates from Dub."}
        </p>
        <div className="mt-6 flex items-center space-x-4">
          <CategoryLink title="All" href="/blog" active={!slug} />
          {BLOG_CATEGORIES.map((category) => (
            <CategoryLink
              key={category.slug}
              title={category.title}
              href={`/blog/category/${category.slug}`}
              active={category.slug === slug}
            />
          ))}
          <CategoryLink title="Changelog" href="/changelog" active={false} />
        </div>
      </div>
    </MaxWidthWrapper>
  );
}

const CategoryLink = ({
  title,
  href,
  active,
}: {
  title: string;
  href: string;
  active: boolean;
}) => {
  return (
    <Link
      href={href}
      className={cn("border-b-2 border-transparent py-1", {
        "border-black text-black": active,
      })}
    >
      <div className="rounded-md px-3 py-2 text-sm text-gray-600 transition-all hover:bg-gray-100 active:bg-gray-200">
        {title}
      </div>
    </Link>
  );
};
