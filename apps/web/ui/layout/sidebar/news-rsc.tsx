import { News, NewsArticle } from "./news";

export async function NewsRSC() {
  const { latestNewsArticles } = await fetch(
    // "https://dub.co/api/content?type=news",
    "https://dub-site-git-news-api-dubinc.vercel.app/api/content?type=news", // TODO: Update to dub.co
    {
      next: {
        revalidate: 60 * 60 * 24, // cache for 24 hours
      },
    },
  ).then((res) => res.json());

  return (
    <News
      articles={(
        (Array.isArray(latestNewsArticles) ? latestNewsArticles : []) as Omit<
          NewsArticle,
          "href"
        >[]
      )
        .slice(0, 6) // Limit to 6 latest articles
        .map((article) => ({
          ...article,
          href: `https://dub.co/${article.type === "ChangelogPost" ? "changelog" : "blog"}/${article.slug}`,
        }))}
    />
  );
}
