import { RawStatsProps, StatsProps } from "@/lib/stats";
import Clicks from "@/components/stats/clicks";
import Toggle from "@/components/stats/toggle";
import Devices from "@/components/stats/devices";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import { useRouter } from "next/router";

export default function Stats() {
  const router = useRouter();

  const { data } = useSWR<StatsProps>(
    router.query.key &&
      `/api/links/${router.query.key}/stats${
        router.query.interval ? `?interval=${router.query.interval}` : ""
      }`,
    fetcher,
    {
      keepPreviousData: true,
    }
  );

  return (
    <div className="relative bg-gray-50 dark:bg-black py-20">
      <Toggle />
      <div className="max-w-4xl mx-auto grid gap-5">
        {data && <Clicks data={data} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Devices />
          <Devices />
        </div>
      </div>
    </div>
  );
}
