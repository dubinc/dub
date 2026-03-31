import { Wordmark } from "@dub/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import WrappedPageClient from "./client";

export default async function WrappedPage(props: {
  params: Promise<{ slug: string; year: string }>;
}) {
  const params = await props.params;
  if (params.year !== "2024") {
    redirect(`/${params.slug}`);
  }

  return (
    <div className="relative flex flex-col items-center">
      <Link href={`/${params.slug}`}>
        <Wordmark className="mt-6 h-8" />
      </Link>
      <WrappedPageClient />
    </div>
  );
}
