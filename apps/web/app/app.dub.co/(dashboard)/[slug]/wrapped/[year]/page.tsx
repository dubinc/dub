import { prisma } from "@dub/prisma";
import { DUB_WORDMARK, smartTruncate } from "@dub/utils";
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
          {workspace.logo && (
            <img
              src={workspace.logo}
              alt={workspace.name}
              className="h-8 rounded-lg"
            />
          )}
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
      <h3 className="font-medium text-neutral-400">{title}</h3>
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
            <div key={index} className="flex justify-between py-1.5">
              <div className="flex items-center gap-2">
                {title === "Top Countries" && (
                  <img
                    src={`https://hatscripts.github.io/circle-flags/flags/${item.toLowerCase()}.svg`}
                    alt={COUNTRIES[item]}
                    className="size-4"
                  />
                )}
                <div className="text-left font-medium text-black">
                  {title === "Top Links" ? (
                    <a
                      href={`https://app.dub.co/${workspaceSlug}/analytics?domain=${domain}&key=${path}&interval=1y`}
                      target="_blank"
                      className="underline-offset-2 hover:underline"
                    >
                      {smartTruncate(item, 33)} ↗
                    </a>
                  ) : (
                    <p>{COUNTRIES[item]}</p>
                  )}
                </div>
              </div>
              <NumberFlow value={count} className="text-neutral-600" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
