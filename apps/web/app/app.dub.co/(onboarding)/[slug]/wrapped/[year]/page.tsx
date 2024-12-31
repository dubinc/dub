import { Wordmark } from "@dub/ui";
import Link from "next/link";
import WrappedPageClient from "./client";

export default function WrappedPage({
  params,
}: {
  params: { slug: string; year: string };
}) {
  return (
    <div className="relative flex flex-col items-center">
      <Link href={`/${params.slug}`}>
        <Wordmark className="mt-6 h-8" />
      </Link>
      <WrappedPageClient />
    </div>
  );
}
