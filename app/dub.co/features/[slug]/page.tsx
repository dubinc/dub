import { features } from "#/lib/constants/content";
import { constructMetadata } from "#/lib/utils";
import CTA from "#/ui/home/cta";
import { notFound } from "next/navigation";

export function generateMetadata({
  params,
}: {
  params: {
    slug: string;
  };
}) {
  const data = features.find(({ slug }) => slug === params.slug);
  if (!data) {
    return;
  }
  return constructMetadata({
    title: `${data.seoTitle || data.title} – Dub`,
  });
}

export default function FeaturePage({
  params,
}: {
  params: {
    slug: string;
  };
}) {
  const data = features.find(({ slug }) => slug === params.slug);
  if (!data) {
    notFound();
  }
  return (
    <div>
      <CTA />
    </div>
  );
}
