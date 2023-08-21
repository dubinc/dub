import { formatDate } from "#/lib/utils";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { allBlogPosts, allChangelogPosts } from "contentlayer/generated";
import Link from "next/link";

export default function Changelog() {
  return (
    <MaxWidthWrapper className="space-y-5 pt-20 md:space-y-10">
      <div className="mx-auto max-w-md text-center sm:max-w-xl">
        <h2 className="font-display text-4xl font-extrabold leading-tight text-black sm:text-5xl sm:leading-tight">
          We ship{" "}
          <span className="bg-gradient-to-br from-green-600 to-green-300 bg-clip-text pr-2 italic text-transparent">
            fast
          </span>
        </h2>
        <p className="mt-5 text-gray-600 sm:text-lg">
          Check out our changelog to see what's new on Dub.
        </p>
      </div>
      <ul className="mx-5 max-w-2xl md:mx-auto md:translate-x-28">
        {[...allBlogPosts, ...allChangelogPosts]
          .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
          .slice(0, 6)
          .map((post) => (
            <li key={post.slug}>
              <DesktopChangelogEntry post={post} />
              <MobileChangelogEntry post={post} />
            </li>
          ))}
      </ul>
      <Link
        href="/changelog"
        className="mx-auto block max-w-fit rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white hover:bg-white hover:text-black"
      >
        Full changelog
      </Link>
    </MaxWidthWrapper>
  );
}

const DesktopChangelogEntry = ({ post }) => (
  <Link
    href={`/${post.type === "BlogPost" ? "blog" : "changelog"}/${post.slug}`}
    className="group hidden grid-cols-5 items-center md:grid"
  >
    <dl>
      <dt className="sr-only">Published on</dt>
      <dd className="text-base font-medium text-gray-400 transition-colors group-hover:text-gray-700">
        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
      </dd>
    </dl>
    <div className="col-span-4 flex items-center">
      <div className="relative ml-4">
        <div className="h-16 border-l border-gray-400 pr-8" />
        <div className="absolute -left-1 top-[1.6875rem] h-2.5 w-2.5 rounded-full bg-gray-400 transition-colors group-hover:bg-gray-700" />
      </div>
      <h3 className="text-2xl font-medium tracking-tight text-gray-700 transition-colors group-hover:text-black">
        {post.title}
      </h3>
    </div>
  </Link>
);

const MobileChangelogEntry = ({ post }) => (
  <Link
    href={`/${post.type === "BlogPost" ? "blog" : "changelog"}/${post.slug}`}
    className="flex items-center space-x-4 rounded-lg active:bg-gray-100 md:hidden"
  >
    <div className="relative">
      <div className="h-16 border-l border-gray-400" />
      <div className="absolute -left-1 top-5 h-2.5 w-2.5 rounded-full bg-gray-400" />
    </div>
    <div>
      <dl>
        <dt className="sr-only">Published on</dt>
        <dd className="text-sm font-medium text-gray-400">
          <time dateTime={post.publishedAt}>
            {formatDate(post.publishedAt)}
          </time>
        </dd>
      </dl>
      <h3 className="text-lg font-medium tracking-tight text-gray-700">
        {post.title}
      </h3>
    </div>
  </Link>
);
