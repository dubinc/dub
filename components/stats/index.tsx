import { StatsProps, dummyData } from "@/lib/stats";
import Clicks from "@/components/stats/clicks";
import Toggle from "@/components/stats/toggle";
import Devices from "@/components/stats/devices";
import Locations from "@/components/stats/locations";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import { useRouter } from "next/router";

export default function Stats() {
  const router = useRouter();

  const { data, isValidating } = useSWR<StatsProps>(
    router.query.key &&
      `/api/edge/links/${router.query.key}/stats${
        router.query.interval ? `?interval=${router.query.interval}` : ""
      }`,
    fetcher,
    {
      keepPreviousData: true,
      fallbackData: dummyData,
    }
  );

  return (
    <div className="relative bg-gray-50 dark:bg-black py-20 mx-auto lg:px-0 px-2.5">
      <Toggle data={data!} />
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
