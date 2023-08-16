import prisma from "#/lib/prisma";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { nFormatter } from "#/lib/utils";

export default async function Stats() {
  const [domains, shortlinks, clicks] = await Promise.all([
    prisma.domain.count({
      where: {
        verified: true,
      },
    }),
    prisma.link.count(),
    process.env.TINYBIRD_API_KEY
      ? fetch(`https://api.us-east.tinybird.co/v0/pipes/all_clicks.json`, {
          headers: {
            Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
          },
          next: {
            revalidate: 300,
          },
        })
          .then((res) => res.json())
          .then((res) => res.data[0]["count(timestamp)"])
          .catch(() => 5000000)
      : 5000000,
  ]);

  return (
    <StatsSection domains={domains} shortlinks={shortlinks} clicks={clicks} />
  );
}

export function StatsSection({
  domains,
  shortlinks,
  clicks,
}: {
  domains: number;
  shortlinks: number;
  clicks: number;
}) {
  return (
    <div className="border-y border-gray-200 bg-white/10 py-8 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.2)] backdrop-blur">
      <MaxWidthWrapper className="grid gap-y-4 divide-x divide-gray-200 md:grid-cols-3 md:gap-y-0">
        {[
          { name: "Custom Domains", value: domains },
          { name: "Short Links", value: shortlinks },
          { name: "Link Redirects", value: clicks },
        ].map(({ name, value }) => (
          <div
            key={name}
            className="flex flex-col items-center justify-center space-y-2"
          >
            <p className="text-4xl font-bold md:text-6xl">
              {name === "Custom Domains"
                ? Intl.NumberFormat().format(value)
                : nFormatter(value)}
            </p>
            <p className="font-semibold uppercase text-gray-500 md:text-lg">
              {name}
            </p>
          </div>
        ))}
      </MaxWidthWrapper>
    </div>
  );
}
