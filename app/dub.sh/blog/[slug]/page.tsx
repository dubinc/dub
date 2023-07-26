import SearchButton from "#/ui/content/search-button";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { allBlogPosts } from "contentlayer/generated";
import { notFound } from "next/navigation";
import Link from "next/link";
import Author from "#/ui/content/author";
import { MDX } from "#/ui/content/mdx";
import TableOfContents from "#/ui/content/table-of-contents";
import Feedback from "#/ui/content/feedback";
import { getBlurDataURL } from "#/lib/images";
import { Metadata } from "next";
import { constructMetadata } from "#/lib/utils";
import { getTweet } from "react-tweet/api";
import BlurImage from "#/ui/blur-image";

export async function generateStaticParams() {
  return allBlogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata | undefined> {
  const post = allBlogPosts.find((post) => post.slug === params.slug);
  if (!post) {
    return;
  }

  const { title, summary, image } = post;

  return constructMetadata({
    title: `${title} | Dub Help Center`,
    description: summary,
    image,
  });
}

export default async function BlogArticle({
  params,
}: {
  params: {
    slug: string;
  };
}) {
  const data = allBlogPosts.find((post) => post.slug === params.slug);
  if (!data) {
    notFound();
  }

  const [thumbnailBlurhash, images, tweets] = await Promise.all([
    getBlurDataURL(data.image),
    await Promise.all(
      data.images.map(async (src: string) => ({
        src,
        blurDataURL: await getBlurDataURL(src),
      })),
    ),
    await Promise.all(data.tweetIds.map(async (id: string) => getTweet(id))),
  ]);

  const relatedArticles =
    (data.related &&
      data.related.map(
        (slug) => allBlogPosts.find((post) => post.slug === slug)!,
      )) ||
    [];

  return (
    <>
      <MaxWidthWrapper>
        <div className="flex max-w-screen-sm flex-col space-y-4 pt-10">
          <h1 className="font-display text-3xl font-extrabold text-gray-700 sm:text-4xl">
            {data.title}
          </h1>
          <p className="text-xl text-gray-500">{data.summary}</p>
        </div>
      </MaxWidthWrapper>

      <div className="relative">
        <div className="absolute top-28 h-full w-full border border-gray-200 bg-white/50 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.2)] backdrop-blur-lg" />
        <MaxWidthWrapper className="grid grid-cols-4 gap-10 py-10">
          <div className="relative col-span-4 mb-10 flex flex-col space-y-8 rounded-xl border border-gray-200 bg-white sm:col-span-3">
            <BlurImage
              className="rounded-t-xl"
              src={data.image}
              blurDataURL={thumbnailBlurhash}
              width={1200}
              height={630}
              alt={data.title}
              priority // cause it's above the fold
            />
            <MDX
              code={data.body.code}
              images={images}
              tweets={tweets}
              className="px-6 pb-20 pt-4"
            />
          </div>
          <div className="sticky top-20 col-span-1 hidden flex-col space-y-10 divide-y divide-gray-200 self-start sm:flex">
            <Author username={data.author} />
          </div>
        </MaxWidthWrapper>
      </div>
    </>
  );
}
