"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { BlurImage, ExpandingArrow } from "@dub/ui";
import {
  cn,
  DICEBEAR_AVATAR_URL,
  smartTruncate,
  STAGGER_CHILD_VARIANTS,
} from "@dub/utils";
import { COUNTRIES } from "@dub/utils/src/constants/countries";
import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { redirect, useParams } from "next/navigation";

export default function WrappedPageClient() {
  const { slug, year } = useParams();
  const { name, logo, yearInReview, loading } = useWorkspace();

  const { totalLinks, totalClicks, topLinks, topCountries } =
    yearInReview || {};

  const stats = {
    "Total Links": totalLinks,
    "Total Clicks": totalClicks,
  };

  const placeholderArray = Array.from({ length: 5 }, (_, index) => ({
    item: "placeholder",
    count: 0,
  }));

  if (!loading && !yearInReview) {
    redirect(`/${slug}`);
  }

  return (
    <div className="relative mx-auto my-10 max-w-lg px-4 sm:px-8">
      <h1 className="animate-slide-up-fade font-display mx-0 mb-4 mt-8 p-0 text-center text-xl font-semibold text-black [animation-delay:150ms] [animation-duration:1s] [animation-fill-mode:both]">
        {year} Year in Review 🎊
      </h1>
      <p className="animate-slide-up-fade text-balance text-center text-sm leading-6 text-black [animation-delay:300ms] [animation-duration:1s] [animation-fill-mode:both]">
        As we put a wrap on {year}, we wanted to say thank you for your support!
        Here's a look back at your activity in {year}:
      </p>

      <div className="animate-slide-up-fade mb-4 mt-8 rounded-lg border border-neutral-200 bg-white p-2 shadow-md [animation-delay:450ms] [animation-duration:1s] [animation-fill-mode:both]">
        <div
          className="flex h-24 flex-col items-center justify-center rounded-lg"
          style={{
            backgroundImage: `url(https://assets.dub.co/misc/year-in-review-header.jpg)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {name ? (
            <>
              <BlurImage
                src={logo || `${DICEBEAR_AVATAR_URL}${name}`}
                alt={name || "Workspace Logo"}
                className="h-8 rounded-full"
                width={32}
                height={32}
              />
              <h2 className="mt-1 text-xl font-semibold">{name}</h2>
            </>
          ) : (
            <>
              <div className="h-8 animate-pulse rounded-full bg-neutral-200" />
              <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-200" />
            </>
          )}
        </div>
        <div className="grid w-full grid-cols-2 gap-2 p-4">
          {Object.entries(stats).map(([key, value]) => (
            <StatCard key={key} title={key} value={value} />
          ))}
        </div>
        <div className="grid gap-2 p-4">
          <StatTable
            title="Top Links"
            value={
              topLinks
                ? (topLinks as { item: string; count: number }[])
                : placeholderArray
            }
          />
          <StatTable
            title="Top Countries"
            value={
              topCountries
                ? (topCountries as { item: string; count: number }[])
                : placeholderArray
            }
          />
        </div>
      </div>

      <Link
        className="group flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4 sm:flex-row"
        href="https://dub.co/blog/2024"
        target="_blank"
      >
        <Image
          src="https://assets.dub.co/blog/2024.jpg"
          alt="Dub logo with confetti"
          width={1838}
          height={1172}
          className="w-1/3 rounded-md"
          draggable={false}
        />
        <div className="flex flex-col gap-2">
          <h3 className="font-display font-semibold text-black">
            Dub {year} Year in Review 🎊
          </h3>
          <p className="text-sm text-neutral-500 group-hover:underline">
            A full recap of some of the top features we shipped this year – and
            how we grew as a company.
          </p>
        </div>
      </Link>
    </div>
  );
}

const StatCard = ({
  title,
  value,
}: {
  title: string;
  value: number | undefined;
}) => {
  return (
    <div className="text-center">
      <h3 className="font-medium text-neutral-500">{title}</h3>
      <NumberFlow
        value={value || 0}
        className={cn(
          "text-lg font-medium text-black",
          value === undefined && "text-neutral-300",
        )}
      />
    </div>
  );
};

const StatTable = ({
  title,
  value,
}: {
  title: string;
  value: { item: string; count: number }[];
}) => {
  const { slug } = useParams();
  return (
    <div className="mb-2">
      <h3 className="mb-2 font-medium text-neutral-500">{title}</h3>
      <motion.div
        variants={{
          show: {
            transition: {
              delayChildren: 0.5,
              staggerChildren: 0.08,
            },
          },
        }}
        initial="hidden"
        animate="show"
        className="grid divide-y divide-neutral-200 text-sm"
      >
        {value.map(({ item, count }, index) => {
          const [domain, ...pathParts] = item.split("/");
          const path = pathParts.join("/") || "_root";
          return (
            <motion.div
              key={index}
              variants={STAGGER_CHILD_VARIANTS}
              className="text-sm text-neutral-500"
            >
              <a
                href={`/${slug}/analytics?${new URLSearchParams({
                  ...(title === "Top Links"
                    ? {
                        domain,
                        key: path,
                      }
                    : {
                        country: item,
                      }),
                  interval: "1y",
                }).toString()}`}
                key={index}
                className="group flex justify-between py-1.5"
              >
                {item === "placeholder" ? (
                  <div className="h-4 w-12 animate-pulse rounded-md bg-neutral-200" />
                ) : (
                  <div className="flex items-center gap-2">
                    {title === "Top Countries" && (
                      <img
                        src={`https://hatscripts.github.io/circle-flags/flags/${item.toLowerCase()}.svg`}
                        alt={COUNTRIES[item]}
                        className="size-4"
                      />
                    )}
                    <div className="flex gap-0.5">
                      <p className="font-medium text-black">
                        {title === "Top Links"
                          ? smartTruncate(item, 33)
                          : COUNTRIES[item]}{" "}
                      </p>
                      <ExpandingArrow className="size-3" />
                    </div>
                  </div>
                )}
                <NumberFlow
                  value={count}
                  className={cn(
                    "text-neutral-600 group-hover:text-black",
                    count === 0 && "text-neutral-300",
                  )}
                />
              </a>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};
