import { APP_DOMAIN } from "#/lib/constants";
import { features } from "#/lib/constants/content";
import { constructMetadata } from "#/lib/utils";
import CTA from "#/ui/home/cta";
import Logos from "#/ui/home/logos";
import { Github } from "@/components/shared/icons";
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
    <>
      <div className="mx-auto mb-10 mt-12 max-w-md px-2.5 text-center sm:max-w-lg sm:px-0">
        <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.15] text-black sm:text-6xl sm:leading-[1.15]">
          {data.title}
        </h1>
        <h2 className="mt-5 text-gray-600 sm:text-xl">
          Dub is an open-source link management tool for modern marketing teams
          to create, share, and track short links.
        </h2>

        <div className="mx-auto mt-10 flex max-w-fit space-x-4">
          <a
            href={`${APP_DOMAIN}/register`}
            className="rounded-full border border-black bg-black px-5 py-2 text-sm text-white shadow-lg transition-all hover:bg-white hover:text-black"
          >
            Start For Free
          </a>
          <a
            className="flex items-center justify-center space-x-2 rounded-full border border-gray-300 bg-white px-5 py-2 shadow-lg transition-all hover:border-gray-800"
            href="https://dub.sh/github"
            target="_blank"
            rel="noreferrer"
          >
            <Github className="h-5 w-5 text-black" />
            <p className="text-sm">Star on GitHub</p>
          </a>
        </div>
      </div>
      <Logos />
      <CTA />
    </>
  );
}
