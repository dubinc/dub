"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { BlurImage, ExpandingArrow } from "@dub/ui";
import {
  DICEBEAR_AVATAR_URL,
  smartTruncate,
  STAGGER_CHILD_VARIANTS,
} from "@dub/utils";
import { COUNTRIES } from "@dub/utils/src/constants/countries";
import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";
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

  if (loading) {
    return <LayoutLoader />;
  } else if (!yearInReview) {
    redirect(`/${slug}`);
  }

  return (
    <div className="relative mx-auto my-10 max-w-lg px-4 sm:px-8">
      <h1 className="animate-slide-up-fade font-display mx-0 mb-4 mt-8 p-0 text-center text-xl font-semibold text-black [animation-delay:150ms] [animation-duration:1s] [animation-fill-mode:both]">
        Dub {year} Year in Review 🎊
      </h1>
      <p className="animate-slide-up-fade text-center text-sm leading-6 text-black [animation-delay:300ms] [animation-duration:1s] [animation-fill-mode:both]">
        As we put a wrap on {year}, we wanted to say thank you for your support!
        Here's a look back at your activity in {year}:
      </p>

      <div className="animate-slide-up-fade my-8 rounded-lg border border-neutral-200 bg-white p-2 shadow-md [animation-delay:450ms] [animation-duration:1s] [animation-fill-mode:both]">
        <div
          className="flex h-24 flex-col items-center justify-center rounded-lg"
          style={{
            backgroundImage: `url(https://assets.dub.co/misc/year-in-review-header.jpg)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <BlurImage
            src={logo || `${DICEBEAR_AVATAR_URL}${name}`}
            alt={name || "Workspace Logo"}
            className="h-8 rounded-lg"
            width={32}
            height={32}
          />
          <h2 className="mt-1 text-xl font-semibold">{name}</h2>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 p-4">
          {Object.entries(stats).map(([key, value]) => (
            <StatCard key={key} title={key} value={value || 0} />
          ))}
        </div>
        <div className="grid gap-2 p-4">
          <StatTable
            title="Top Links"
            value={topLinks as { item: string; count: number }[]}
          />
          <StatTable
            title="Top Countries"
            value={topCountries as { item: string; count: number }[]}
          />
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ title, value }: { title: string; value: number }) => {
  return (
    <div className="text-center">
      <h3 className="font-medium text-neutral-500">{title}</h3>
      <NumberFlow value={value} className="text-lg font-medium text-black" />
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
              className="text-sm text-gray-500"
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
                <NumberFlow
                  value={count}
                  className="text-neutral-600 group-hover:text-black"
                />
              </a>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};
