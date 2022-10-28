import { useRouter } from "next/router";
import useSWR from "swr";
import Clicks from "@/components/stats/clicks";
import Devices from "@/components/stats/devices";
import Feedback from "@/components/stats/feedback";
import Locations from "@/components/stats/locations";
import Referer from "@/components/stats/referer";
import Toggle from "@/components/stats/toggle";
import { StatsProps, dummyData } from "@/lib/stats";
import { fetcher } from "@/lib/utils";

export default function Stats({
  atModalTop,
  domain,
}: {
  atModalTop?: boolean;
  domain?: string;
}) {
  const router = useRouter();

  const { slug, key, interval } = router.query as {
    slug?: string;
    key: string;
    interval?: string;
  };

  const { data, isValidating } = useSWR<StatsProps>(
    router.isReady &&
      `${
        slug && domain
          ? `/api/projects/${slug}/domains/${domain}/links/${key}/stats`
          : `/api/edge/links/${key}/stats`
      }${interval ? `?interval=${interval}` : ""}`,
    fetcher,
    {
      keepPreviousData: true,
      fallbackData: dummyData,
    },
  );

  return (
    <div className="bg-gray-50 py-10">
      <Toggle domain={domain} atModalTop={atModalTop} />
      <div className="mx-auto grid max-w-4xl gap-5">
        <Clicks data={data!} isValidating={isValidating} />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Locations data={data!} />
          <Devices data={data!} />
          <Referer data={data!} />
          <Feedback />
        </div>
      </div>
    </div>
  );
}
