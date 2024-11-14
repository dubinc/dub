import { getContentAPI } from "@/lib/fetchers/get-content-api";
import { ClientOnly } from "@dub/ui";
import { News, NewsArticle } from "./news";

export async function NewsRSC() {
  const { latestNewsArticles } = await getContentAPI();

  return (
    <ClientOnly>
      <News
        articles={
          (Array.isArray(latestNewsArticles)
            ? latestNewsArticles
            : []) as NewsArticle[]
        }
      />
    </ClientOnly>
  );
}
