import { allHelpPosts } from "contentlayer/generated";
import { notFound } from "next/navigation";

export default function HelpArticle({
  params,
}: {
  params: {
    slug: string;
  };
}) {
  const data = allHelpPosts.find((post) => post.slug === params.slug);
  if (!data) {
    notFound();
  }
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h1 className="text-6xl font-bold">{data.title}</h1>
      <p className="text-2xl font-semibold">{data.summary}</p>
    </div>
  );
}
