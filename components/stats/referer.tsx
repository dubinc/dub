import { useRouter } from "next/router";
import BlurImage from "#/ui/blur-image";
import { Link2 } from "lucide-react";
import { LoadingCircle } from "#/ui/icons";
import useSWR from "swr";
import { fetcher } from "#/lib/utils";
import { GOOGLE_FAVICON_URL } from "#/lib/constants";
import { useContext, useState } from "react";
import { StatsContext } from ".";
import BarList from "#/ui/stats/bar-list";
import { Maximize } from "lucide-react";
import Modal from "#/ui/modal";

export default function Referer() {
  const router = useRouter();

  const { endpoint, queryString, modal } = useContext(StatsContext);

  const { data } = useSWR<{ referer: string; clicks: number }[]>(
    router.isReady && `${endpoint}/referer${queryString}`,
    fetcher,
  );

  const { data: totalClicks } = useSWR<number>(
    router.isReady && `${endpoint}/clicks${queryString}`,
    fetcher,
  );

  const [showModal, setShowModal] = useState(false);

  const barList = (limit?: number) => (
    <BarList
      tab="Referrer"
      data={
        data?.map((d) => ({
          icon:
            d.referer === "(direct)" ? (
              <Link2 className="h-4 w-4" />
            ) : (
              <BlurImage
                src={`${GOOGLE_FAVICON_URL}${d.referer}`}
                alt={d.referer}
                width={20}
                height={20}
                className="h-4 w-4 rounded-full"
              />
            ),
          title: d.referer,
          clicks: d.clicks,
        })) || []
      }
      totalClicks={totalClicks || 0}
      barBackground="bg-red-100"
      {...(limit && { limit })}
    />
  );
  return (
    <>
      <Modal
        showModal={showModal}
        setShowModal={setShowModal}
        className="max-w-lg"
      >
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold">Referrers</h1>
        </div>
        {barList()}
      </Modal>
      <div className="relative z-0 h-[400px] overflow-scroll border border-gray-200 bg-white px-7 py-5 scrollbar-hide sm:rounded-lg sm:border-gray-100 sm:shadow-lg">
        <div className="mb-5 flex">
          <h1 className="text-xl font-semibold">Referrers</h1>
        </div>
        {data ? (
          data.length > 0 ? (
            barList(9)
          ) : (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-sm text-gray-600">No data available</p>
            </div>
          )
        ) : (
          <div className="flex h-[300px] items-center justify-center">
            <LoadingCircle />
          </div>
        )}
        {!modal && data && data.length > 9 && (
          <button
            onClick={() => setShowModal(true)}
            className="absolute inset-x-0 bottom-4 z-10 mx-auto flex max-w-fit items-center space-x-2 rounded-md bg-white px-4 py-1.5 text-gray-500 transition-all hover:text-gray-800 active:scale-95"
          >
            <Maximize className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase">View all</p>
          </button>
        )}
      </div>
    </>
  );
}
