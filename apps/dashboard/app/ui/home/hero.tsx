import { allBlogPosts } from "contentlayer/generated";
import Link from "next/link";
import { ExpandingArrow } from "../icons";
import { APP_DOMAIN } from "#/lib/constants";

const Hero = () => {
  const latestPost = allBlogPosts.sort(
    (a, b) =>
      Number(new Date(b?.publishedAt)) - Number(new Date(a?.publishedAt)),
  )[0];

  return (
    <div className="mx-auto mb-10 mt-12 max-w-xl px-2.5 text-center sm:max-w-xl sm:px-0">
      <Link
        href={`/${latestPost._raw.sourceFileDir}/${latestPost?.slug}`}
        className="group mx-auto flex max-w-fit items-center justify-center space-x-2 overflow-hidden rounded-full border border-gray-200 bg-white px-7 py-2 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.1)] backdrop-blur transition-all hover:border-gray-300 hover:bg-white/50"
      >
        <p className="text-sm font-semibold text-gray-700">
          {latestPost?.title}
        </p>
        <ExpandingArrow className="-ml-1 h-3.5 w-3.5" />
      </Link>

      <h1
        data-testid="hero-text"
        className="mt-5 font-display text-4xl font-extrabold leading-[1.15] text-black sm:text-5xl sm:leading-[1.15]"
      >
        Better outcomes from every&nbsp;
        <span className="bg-gradient-to-r from-blue-500 via-purple-600 to-purple-800 bg-clip-text text-transparent">
          connections
        </span>
        .
      </h1>
      <h2 className="mt-5 text-gray-600 sm:text-xl">
        Create short links, QR Codes. Share them anywhere. Track what’s working,
        and what’s not.
      </h2>
    </div>
  );
};

export default Hero;
