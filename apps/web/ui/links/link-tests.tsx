import useWorkspace from "@/lib/swr/use-workspace";
import { ABTestVariantsSchema } from "@/lib/zod/schemas/links";
import { fetcher, getPrettyUrl, normalizeUrl } from "@dub/utils";
import { motion } from "motion/react";
import { memo, useMemo } from "react";
import useSWR from "swr";
import { LinkAnalyticsBadge } from "./link-analytics-badge";
import { useLinkCardContext } from "./link-card";
import { ResponseLink } from "./links-container";

export const LinkTests = memo(({ link }: { link: ResponseLink }) => {
  const { id: workspaceId } = useWorkspace();
  const { showTests } = useLinkCardContext();

  const testVariants = useMemo(() => {
    if (
      !link.testVariants ||
      !link.testCompletedAt ||
      !(new Date() < new Date(link.testCompletedAt))
    )
      return null;

    try {
      return ABTestVariantsSchema.parse(link.testVariants);
    } catch (e) {
      console.error(`Failed to parse link testVariants for link ${link.id}`, e);
    }
    return null;
  }, [link.testVariants, link.testCompletedAt, link.id]);

  const { data, isLoading, error } = useSWR<
    {
      url: string;
      clicks: number;
      leads: number;
      saleAmount: number;
      sales: number;
    }[]
  >(
    Boolean(testVariants && testVariants.length) &&
      showTests &&
      `/api/analytics?${new URLSearchParams({
        event: "composite",
        groupBy: "top_urls",
        linkId: link.id,
        workspaceId: workspaceId!,
        ...(link.testStartedAt && {
          start: new Date(link.testStartedAt).toISOString(),
        }),
      }).toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const analyticsByNormalizedUrl = useMemo(() => {
    if (!data) return null;

    const map = new Map<
      string,
      {
        clicks: number;
        leads: number;
        sales: number;
        saleAmount: number;
      }
    >();

    for (const row of data) {
      const key = normalizeUrl(row.url);
      const existing = map.get(key);
      if (existing) {
        map.set(key, {
          clicks: existing.clicks + (row.clicks ?? 0),
          leads: existing.leads + (row.leads ?? 0),
          sales: existing.sales + (row.sales ?? 0),
          saleAmount: existing.saleAmount + (row.saleAmount ?? 0),
        });
      } else {
        map.set(key, {
          clicks: row.clicks ?? 0,
          leads: row.leads ?? 0,
          sales: row.sales ?? 0,
          saleAmount: row.saleAmount ?? 0,
        });
      }
    }

    return map;
  }, [data]);

  if (!testVariants || !testVariants.length) return null;

  return (
    <motion.div
      initial={false}
      animate={{ height: showTests ? "auto" : 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <ul className="flex flex-col gap-2.5 border-t border-neutral-200 bg-neutral-100 p-3">
        {testVariants.map((test, idx) => {
          const normalizedTestUrl = normalizeUrl(test.url);
          const analytics = analyticsByNormalizedUrl?.get(normalizedTestUrl);

          return (
            <li
              key={normalizedTestUrl || idx}
              className="flex items-center justify-between rounded-md border border-neutral-300 bg-white p-2.5"
            >
              <div className="flex min-w-0 items-center gap-4">
                {/* Test number */}
                <div className="size-7 shrink-0 select-none rounded-full border border-neutral-200/50 p-px">
                  <div className="flex size-full items-center justify-center rounded-full bg-gradient-to-t from-neutral-950/5 text-sm font-medium text-neutral-800">
                    {idx + 1}
                  </div>
                </div>

                {/* Test name */}
                <span className="truncate text-sm font-medium text-neutral-800">
                  {getPrettyUrl(test.url)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Analytics badge */}
                <div className="flex justify-end sm:min-w-48">
                  {isLoading ? (
                    <div className="h-7 w-32 animate-pulse rounded-md bg-neutral-100" />
                  ) : error ? null : (
                    <LinkAnalyticsBadge
                      link={{
                        ...link,
                        clicks: analytics?.clicks ?? 0,
                        leads: analytics?.leads ?? 0,
                        sales: analytics?.sales ?? 0,
                        saleAmount: analytics?.saleAmount ?? 0,
                      }}
                      url={test.url}
                      sharingEnabled={false}
                    />
                  )}
                </div>

                {/* Test percentage */}
                <div className="h-7 shrink-0 select-none rounded-[6px] border border-neutral-200/50 p-px">
                  <div className="flex size-full items-center justify-center rounded-[5px] bg-gradient-to-t from-neutral-950/5 px-1.5 text-xs font-semibold tabular-nums text-neutral-800">
                    {Math.round(test.percentage)}%
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
});
