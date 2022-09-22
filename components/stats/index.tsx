import { StatsProps, dummyData } from "@/lib/stats";
import Clicks from "@/components/stats/clicks";
import Toggle from "@/components/stats/toggle";
import Devices from "@/components/stats/devices";
import Locations from "@/components/stats/locations";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import { useRouter } from "next/router";

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
    }
  );

  return (
    <div className="bg-gray-50 py-20 mx-auto lg:px-0 px-2.5">
      <Toggle domain={domain} atModalTop={atModalTop} />
      <div className="max-w-4xl mx-auto grid gap-5">
        <Clicks data={data!} isValidating={isValidating} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Locations data={data!} />
          <Devices data={data!} />
        </div>
      </div>
    </div>
  );
}
