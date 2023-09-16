import { APP_DOMAIN } from "#/lib/constants";
import { FEATURES_LIST } from "#/lib/constants/content";
import { constructMetadata } from "#/lib/utils";
import BlurImage from "#/ui/blur-image";
import CTA from "#/ui/home/cta";
import Logos from "#/ui/home/logos";
import { PlayCircle } from "lucide-react";
import { notFound } from "next/navigation";
import DemoVideo from "./video";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export function generateMetadata({
  params,
}: {
  params: {
    slug: string;
  };
}) {
  const data = FEATURES_LIST.find(({ slug }) => slug === params.slug);
  if (!data) {
    return;
  }
  return constructMetadata({
    title: `${data.title} – Dub`,
  });
}

export default function FeaturePage({
  params,
}: {
  params: {
    slug: string;
  };
}) {
  const data = FEATURES_LIST.find(({ slug }) => slug === params.slug);
  if (!data) {
    notFound();
  }
  return (
    <>
      <div className="mx-auto mt-12 max-w-md px-2.5 text-center sm:max-w-lg sm:px-0">
        <h1 className="mt-5 font-display text-3xl font-extrabold leading-[1.15] text-black [text-wrap:balance] sm:text-5xl sm:leading-[1.15]">
          {data.title}
        </h1>
        <p className="mt-5 text-gray-600 sm:text-xl">{data.description}</p>
        <div className="mx-auto mt-5 flex max-w-fit space-x-4">
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
            <PlayCircle className="h-5 w-5 text-gray-400" />
            <p className="text-sm">Watch Demo</p>
          </a>
        </div>
      </div>
      <div className="relative mx-auto mt-10 max-w-screen-lg overflow-hidden border border-b-0 border-gray-200 lg:rounded-t-lg">
        <DemoVideo url={data.videoUrl} />
        <BlurImage
          src={data.thumbnail}
          alt={data.title}
          width={1735}
          height={990}
        />
      </div>
      <div className="border-y border-gray-200 bg-white/10 py-8 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.2)] backdrop-blur">
        <Logos />
      </div>
      <MaxWidthWrapper className="py-20 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="font-display text-3xl font-extrabold leading-[1.15] text-black [text-wrap:balance] sm:text-5xl sm:leading-[1.15]">
            Detailed insights for every click
          </h2>
          <p className="mt-5 text-gray-600 sm:text-lg">
            Dub provides detailed analytics for every click on your links. See
            where your audience is coming from and what devices they are using.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <BentoCard />
          <BentoCard />
        </div>
      </MaxWidthWrapper>
      <CTA />
    </>
  );
}

const BentoCard = () => {
  return (
    <div className="relative h-[400px] overflow-hidden rounded-3xl border border-gray-200 bg-white/50 p-8 shadow backdrop-blur">
      {/* <img
        src="/_static/features/analytics.svg"
        alt="Analytics"
        className="h-full w-full"
      /> */}
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <h3 className="text-xl font-semibold text-gray-700">
          Powerful analytics for the modern marketer
        </h3>
        <p className="mt-2 text-gray-500">
          Dub provides powerful analytics for your links, including geolocation,
          device, browser, and referrer information.
        </p>
      </div>
    </div>
  );
};
