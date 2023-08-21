import Link from "next/link";
import { useMDXComponent } from "next-contentlayer/hooks";
import GithubRepo, { GithubRepoProps } from "@/components/shared/github-repo";
import MDXTweet from "#/ui/tweet";
import { Tweet as TweetProps } from "react-tweet/api";
import { cn, formatDate } from "#/lib/utils";
import "react-medium-image-zoom/dist/styles.css";
import { HELP_CATEGORIES, POPULAR_ARTICLES } from "#/lib/constants/content";
import HelpArticleLink from "./help-article-link";
import CategoryCard from "./category-card";
import { ListChecks } from "lucide-react";
import ZoomImage from "./zoom-image";
import {
  allBlogPosts,
  allChangelogPosts,
  allHelpPosts,
} from "contentlayer/generated";
import CopyBox from "./copy-box";
import { ExpandingArrow } from "../icons";

const CustomLink = (props: any) => {
  const href = props.href;

  if (href.startsWith("/")) {
    return (
      <Link {...props} href={href}>
        {props.children}
      </Link>
    );
  }

  if (href.startsWith("#")) {
    return <a {...props} />;
  }

  return <a target="_blank" rel="noopener noreferrer" {...props} />;
};

const components = {
  h2: (props: any) => (
    <h2 className="text-2xl underline-offset-4 hover:underline" {...props} />
  ),
  a: (props: any) => (
    <CustomLink
      className="font-medium text-gray-500 underline-offset-4 hover:text-black"
      {...props}
    />
  ),
  code: (props: any) => (
    <code
      className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-medium text-gray-600 before:hidden after:hidden"
      {...props}
    />
  ),
  thead: (props: any) => <thead className="text-lg" {...props} />,
  Note: (props: any) => (
    <div
      className={cn(
        "mt-4 rounded-md border-l-4 border-gray-500 bg-gray-100 px-4 py-1 text-[0.95rem] leading-[1.4rem]",
        {
          "border-yellow-500 bg-yellow-100": props.variant === "warning",
          "border-blue-500 bg-blue-100": props.variant === "info",
          "border-green-500 bg-green-100": props.variant === "success",
        },
      )}
      {...props}
    />
  ),
  Prerequisites: (props: any) => (
    <div className="mt-4 rounded-md border border-gray-200 bg-white px-6 py-1 text-[0.95rem] leading-[1.4rem] shadow-md">
      <div className="-mb-6 flex items-center space-x-2 text-gray-600">
        <ListChecks size={20} />
        <p className="text-sm font-medium uppercase">Prerequisites</p>
      </div>
      {props.children}
    </div>
  ),
  CopyBox,
  HelpArticles: (props: { articles: string[] }) => (
    <div className="not-prose grid gap-2 rounded-xl border border-gray-200 bg-white p-4">
      {(props.articles || POPULAR_ARTICLES).map((slug) => (
        <HelpArticleLink
          key={slug}
          article={allHelpPosts.find((post) => post.slug === slug)!}
        />
      ))}
    </div>
  ),
  HelpCategories: () => (
    <div className="not-prose grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {HELP_CATEGORIES.map((category) => (
        <CategoryCard
          key={category.slug}
          href={`/help/category/${category.slug}`}
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
  ),
  Changelog: (props: any) => (
    <ul className="not-prose grid list-none rounded-xl border border-gray-200 bg-white p-4">
      {[...allBlogPosts, ...allChangelogPosts]
        .filter((post) => post.publishedAt <= props.before)
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, props.count)
        .map((post) => (
          <li key={post.slug}>
            <Link
              href={`/${post.type === "BlogPost" ? "blog" : "changelog"}/${
                post.slug
              }`}
              className="group flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-purple-100 active:bg-purple-200 sm:px-4"
            >
              <div>
                <p className="text-xs font-medium text-gray-400 group-hover:text-purple-600">
                  {formatDate(post.publishedAt)}
                </p>
                <h3 className="my-px text-base font-medium text-gray-600 group-hover:text-purple-600">
                  {post.title}
                </h3>
                <p className="line-clamp-1 text-sm text-gray-500 group-hover:text-purple-600">
                  {post.summary}
                </p>
              </div>
              <ExpandingArrow className="-ml-4 h-4 w-4 text-gray-400 group-hover:text-purple-600" />
            </Link>
          </li>
        ))}
    </ul>
  ),
};

interface MDXProps {
  code: string;
  images?: { alt: string; src: string; blurDataURL: string }[];
  tweets?: any[];
  repos?: GithubRepoProps[];
  className?: string;
}

export function MDX({ code, images, tweets, repos, className }: MDXProps) {
  const Component = useMDXComponent(code);

  const MDXImage = (props: any) => {
    if (!images) return null;
    const blurDataURL = images.find(
      (image) => image.src === props.src,
    )?.blurDataURL;

    return <ZoomImage {...props} blurDataURL={blurDataURL} />;
  };

  const Tweet = ({ id }: { id: string }) => {
    if (!tweets) return null;
    const tweet = tweets.find((tweet: TweetProps) => tweet?.id_str === id);
    if (!tweet) return null;
    return <MDXTweet data={tweet} className="mx-auto max-w-lg" noTilt />;
  };

  const MDXRepo = ({ url }: { url: string }) => {
    if (!repos) return null;
    const repo = repos.find((repo) => repo.url === url);
    return <GithubRepo {...repo!} />;
  };

  return (
    <article
      data-mdx-container
      className={cn(
        "prose prose-gray max-w-none transition-all prose-headings:relative prose-headings:scroll-mt-20 prose-headings:font-display prose-headings:font-bold",
        className,
      )}
    >
      <Component
        components={{
          ...components,
          Image: MDXImage,
          Tweet,
          MDXRepo,
        }}
      />
    </article>
  );
}
