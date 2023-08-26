import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { allBlogPosts } from "contentlayer/generated";
import { notFound } from "next/navigation";
import Link from "next/link";
import Author from "#/ui/content/author";
import { MDX } from "#/ui/content/mdx";
import { getBlurDataURL } from "#/lib/images";
import { Metadata } from "next";
import { constructMetadata, formatDate } from "#/lib/utils";
import BlurImage from "#/ui/blur-image";
import { BLOG_CATEGORIES } from "#/lib/constants/content";
import { getAndCacheTweet } from "#/lib/twitter";

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

  const { title, seoTitle, summary, seoDescription, image } = post;

  return constructMetadata({
    title: `${seoTitle || title} – Dub`,
    description: seoDescription || summary,
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
    await Promise.all(
      data.tweetIds.map(async (id: string) => getAndCacheTweet(id)),
    ),
  ]);

  const category = BLOG_CATEGORIES.find(
    (category) => category.slug === data.categories[0],
  )!;

  const relatedArticles =
    (data.related &&
      data.related.map(
        (slug) => allBlogPosts.find((post) => post.slug === slug)!,
      )) ||
    [];

  return (
    <>
      <MaxWidthWrapper>
        <div className="flex max-w-screen-sm flex-col space-y-4 pt-16">
          <div className="flex items-center space-x-4">
            <Link
              href={`/blog/category/${category.slug}`}
              className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-semibold text-gray-700 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.1)] backdrop-blur transition-all hover:border-gray-300 hover:bg-white/50"
            >
              {category.title}
            </Link>
            <time
              dateTime={data.publishedAt}
              className="text-sm text-gray-500 transition-colors hover:text-gray-800"
            >
              {formatDate(data.publishedAt)}
            </time>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-gray-700 sm:text-4xl">
            {data.title}
          </h1>
          <p className="text-xl text-gray-500">{data.summary}</p>
        </div>
      </MaxWidthWrapper>

      <div className="relative">
        <div className="absolute top-52 h-full w-full border border-gray-200 bg-white/50 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.2)] backdrop-blur-lg" />
        <MaxWidthWrapper className="grid grid-cols-4 gap-10 px-0 py-10">
          <div className="relative col-span-4 mb-10 flex flex-col space-y-8 bg-white sm:rounded-xl sm:border sm:border-gray-200 md:col-span-3">
            <BlurImage
              className="aspect-[1200/630] rounded-t-xl object-cover"
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
              className="px-5 pb-20 pt-4 sm:px-10"
            />
          </div>
          <div className="sticky top-20 col-span-1 mt-48 hidden flex-col divide-y divide-gray-200 self-start sm:flex">
            <div className="flex flex-col space-y-4 py-5">
              <p className="text-sm text-gray-500">Written by</p>
              <Author username={data.author} />
            </div>
            {relatedArticles.length > 0 && (
              <div className="flex flex-col space-y-4 py-5">
                <p className="text-sm text-gray-500">Read more</p>
                <ul className="flex flex-col space-y-4">
                  {relatedArticles.map((post) => (
                    <li key={post.slug}>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="group flex flex-col space-y-2"
                      >
                        <p className="font-semibold text-gray-700 underline-offset-4 group-hover:underline">
                          {post.title}
                        </p>
                        <p className="line-clamp-2 text-sm text-gray-500 underline-offset-2 group-hover:underline">
                          {post.summary}
                        </p>
                        <p className="text-xs text-gray-400 underline-offset-2 group-hover:underline">
                          {formatDate(post.publishedAt)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </MaxWidthWrapper>
      </div>
    </>
  );
}
