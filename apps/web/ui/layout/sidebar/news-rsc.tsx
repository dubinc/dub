import { getContentAPI } from "@/lib/fetchers";
import { News, NewsArticle } from "./news";

export async function NewsRSC() {
  const { latestNewsArticles } = await getContentAPI();

  return (
    <News
      articles={
        (Array.isArray(latestNewsArticles)
          ? latestNewsArticles
          : []) as NewsArticle[]
      }
    />
  );
}
