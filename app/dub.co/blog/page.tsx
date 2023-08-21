import { getBlurDataURL } from "#/lib/images";
import { constructMetadata } from "#/lib/utils";
import BlogCard from "#/ui/content/blog-card";
import { allBlogPosts } from "contentlayer/generated";

export const metadata = constructMetadata({
  title: "Blog – Dub",
  description: "Latest news and updates from Dub.",
});

export default async function Blog() {
  const articles = await Promise.all(
    // order by publishedAt (desc)
    allBlogPosts
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .map(async (post) => ({
        ...post,
        blurDataURL: await getBlurDataURL(post.image),
      })),
  );

  return articles.map((article, idx) => (
    <BlogCard key={article.slug} data={article} priority={idx <= 1} />
  ));
}
