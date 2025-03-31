"use client";

import useLink from "@/lib/swr/use-link";

export function LinkPageClient({
  domain,
  slug,
}: {
  domain: string;
  slug: string;
}) {
  const { link } = useLink({
    domain,
    slug,
  });

  return (
    <div>
      <h1>{domain}</h1>
      <p>{slug}</p>
      <p>{link?.url}</p>
    </div>
  );
}
