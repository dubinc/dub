import { prisma } from "@dub/prisma";
import { BlurImage, ExpandingArrow } from "@dub/ui";
import { DICEBEAR_AVATAR_URL, DUB_WORDMARK, smartTruncate } from "@dub/utils";
import { COUNTRIES } from "@dub/utils/src/constants/countries";
import NumberFlow from "@number-flow/react";
import { redirect } from "next/navigation";

export default function WrappedPage({
  params,
}: {
  params: { slug: string; year: string };
}) {
  return <WrappedPageRSC {...params} />;
}

async function WrappedPageRSC({ slug, year }: { slug: string; year: string }) {
  const workspace = await prisma.project.findUnique({
    where: {
      slug,
    },
    select: {
      name: true,
      logo: true,
      yearInReviews: {
        where: {
          year: parseInt(year),
        },
      },
    },
  });

  if (!workspace?.yearInReviews?.length) {
    redirect(`/${slug}`);
  }

  const { totalLinks, totalClicks, topLinks, topCountries } =
    workspace.yearInReviews[0];

  const stats = {
    "Total Links": totalLinks,
    "Total Clicks": totalClicks,
  };

  return (
    <div className="mx-auto my-10 max-w-lg bg-white px-10 py-5">
      <div className="mt-8 sm:hidden">
        <img src={DUB_WORDMARK} alt="Dub" className="h-8" />
      </div>
      <h1 className="mx-0 mb-4 mt-8 p-0 text-xl font-semibold text-black">
        Dub {year} Year in Review 🎊
      </h1>
      <p className="text-sm leading-6 text-black">
        As we put a wrap on {year}, we wanted to say thank you for your support!
        Here's a look back at your activity in {year}:
      </p>

      <div className="my-8 rounded-lg border border-neutral-200 p-2 shadow-md">
        <div
          className="flex h-24 flex-col items-center justify-center rounded-lg"
          style={{
            backgroundImage: `url(https://assets.dub.co/misc/year-in-review-header.jpg)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <BlurImage
            src={workspace.logo || `${DICEBEAR_AVATAR_URL}${workspace.name}`}
            alt={workspace.name}
            className="h-8 rounded-lg"
            width={32}
            height={32}
          />
          <h2 className="mt-1 text-xl font-semibold">{workspace.name}</h2>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 p-4">
          {Object.entries(stats).map(([key, value]) => (
            <StatCard key={key} title={key} value={value} />
          ))}
        </div>
        <div className="grid gap-2 p-4">
          <StatTable
            title="Top Links"
            value={topLinks as { item: string; count: number }[]}
            workspaceSlug={slug}
          />
          <StatTable
            title="Top Countries"
            value={topCountries as { item: string; count: number }[]}
            workspaceSlug={slug}
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
  workspaceSlug,
}: {
  title: string;
  value: { item: string; count: number }[];
  workspaceSlug: string;
}) => {
  return (
    <div className="mb-2">
      <h3 className="mb-2 font-medium text-neutral-500">{title}</h3>
      <div className="grid divide-y divide-neutral-200 text-sm">
        {value.map(({ item, count }, index) => {
          const [domain, ...pathParts] = item.split("/");
          const path = pathParts.join("/") || "_root";
          return (
            <a
              href={`/${workspaceSlug}/analytics?${new URLSearchParams({
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
          );
        })}
      </div>
    </div>
  );
};
