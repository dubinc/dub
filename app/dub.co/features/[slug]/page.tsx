import { APP_DOMAIN } from "#/lib/constants";
import { FEATURES_LIST } from "#/lib/constants/content";
import { cn, constructMetadata } from "#/lib/utils";
import BlurImage from "#/ui/blur-image";
import CTA from "#/ui/home/cta";
import Logos from "#/ui/home/logos";
import { Play, PlayCircle } from "lucide-react";
import { notFound } from "next/navigation";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import Link from "next/link";
import { QRCodePicker } from "#/ui/modals/link-qr-modal";
import Image from "next/image";
import { getBlurDataURL } from "#/lib/images";
import PlayButton from "../../../ui/home/play-button";

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
    description: data.description,
    image: data.thumbnail,
  });
}

export async function generateStaticParams() {
  return FEATURES_LIST.map(({ slug }) => ({
    slug,
  }));
}

export default async function FeaturePage({
  params,
}: {
  params: {
    slug: string;
  };
}) {
  const feature = FEATURES_LIST.find(({ slug }) => slug === params.slug);
  if (!feature) {
    notFound();
  }
  const data = {
    ...feature,
    thumbnailBlurhash: await getBlurDataURL(feature.thumbnail),
    bentoFeatures: feature.bentoFeatures
      ? await Promise.all(
          feature.bentoFeatures.map(async (feature) => ({
            ...feature,
            imageBlurhash: feature.image
              ? await getBlurDataURL(feature.image)
              : undefined,
          })),
        )
      : undefined,
  };

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
          <PlayButton
            url={data.videoUrl}
            className="flex items-center justify-center space-x-2 rounded-full border border-gray-300 bg-white px-5 py-2 shadow-lg transition-all hover:border-gray-800"
          >
            <PlayCircle className="h-5 w-5 text-gray-400" />
            <p className="text-sm">Watch Demo</p>
          </PlayButton>
        </div>
      </div>
      <div className="relative mx-auto mt-10 max-w-screen-lg overflow-hidden border border-b-0 border-gray-200 lg:rounded-t-lg">
        <PlayButton
          url={data.videoUrl}
          className="group absolute inset-0 z-10 flex h-full w-full items-center justify-center bg-black bg-opacity-0 transition-all duration-300 hover:bg-opacity-5 focus:outline-none"
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="rounded-full bg-gradient-to-tr from-black to-gray-700 p-5 ring-[6px] ring-gray-300 transition-all duration-300 group-hover:scale-110 group-hover:ring-4 group-active:scale-90">
              <Play className="h-5 w-5 text-white" fill="currentColor" />
            </div>
            <div className="flex rounded-full border border-gray-200 bg-white p-2 shadow-xl group-hover:shadow-2xl">
              <BlurImage
                src="https://d2vwwcvoksz7ty.cloudfront.net/author/steventey.jpg"
                alt="Steven Tey"
                width={36}
                height={36}
                className="h-10 w-10 rounded-full"
              />
              <div className="ml-2 mr-4 flex flex-col text-left">
                <p className="text-sm font-medium text-gray-500">Watch Demo</p>
                <p className="text-sm text-blue-500">
                  {data?.videoLength || "2:30"}
                </p>
              </div>
            </div>
          </div>
        </PlayButton>
        <BlurImage
          src={data.thumbnail}
          placeholder="blur"
          blurDataURL={data.thumbnailBlurhash}
          priority
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
            {data.bentoTitle}
          </h2>
          <p className="mt-5 text-gray-600 sm:text-lg">
            {data.bentoDescription}
          </p>
        </div>
        {data.slug === "qr-codes" ? (
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-gray-200 bg-white shadow backdrop-blur">
            <QRCodePicker
              props={{
                key: "github",
                url: "https://github.com/steven-tey/dub",
              }}
            />
          </div>
        ) : (
          <>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {data.bentoFeatures?.slice(0, 2).map((feature, idx) => (
                <BentoCard key={idx} {...feature} />
              ))}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {data.bentoFeatures?.slice(2, 5).map((feature, idx) => (
                <BentoCard key={idx} {...feature} />
              ))}
            </div>
          </>
        )}
      </MaxWidthWrapper>
      <CTA />
    </>
  );
}

const BentoCard = ({
  title,
  description,
  image,
  imageBlurhash,
  href,
}: {
  title: string;
  description: string;
  image?: string;
  imageBlurhash?: string;
  href?: string;
}) => {
  const contents = (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow",
        {
          "transition-all hover:shadow-lg": href,
        },
      )}
    >
      {image && (
        <div className="relative h-[250px]">
          <div className="absolute top-0 h-16 w-full bg-gradient-to-b from-white to-transparent" />
          <div className="absolute bottom-0 h-10 w-full bg-gradient-to-b from-transparent to-white" />
          <div className="absolute left-0 h-full w-16 bg-gradient-to-r from-white to-transparent" />
          <div className="absolute right-0 h-full w-16 bg-gradient-to-r from-transparent to-white" />
          <Image
            src={image}
            placeholder="blur"
            blurDataURL={imageBlurhash}
            alt={title}
            draggable={false}
            width={750}
            height={489}
          />
        </div>
      )}
      <div className="relative h-full bg-white p-8">
        <h3 className="text-xl font-semibold text-gray-700">{title}</h3>
        <p className="mt-2 text-gray-500 [text-wrap:balance]">{description}</p>
      </div>
    </div>
  );
  if (href) {
    return <Link href={href}>{contents}</Link>;
  }
  return contents;
};
