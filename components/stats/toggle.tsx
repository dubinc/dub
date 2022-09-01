import { useRouter } from "next/router";
import { PERIODS } from "@/lib/constants";

export default function Toggle() {
  const router = useRouter();
  return (
    <div className="flex justify-end mb-10">
      <div className="flex space-x-1 p-1 rounded-md shadow-md dark:shadow-none border bg-white dark:bg-black border-gray-100 dark:border-gray-600">
        {PERIODS.map((period) => (
          <button
            key={period}
            className={`${
              router.query.period === period
                ? "bg-blue-50 dark:bg-gray-600"
                : ""
            } w-14 py-1.5 text-sm dark:text-white rounded-md`}
            onClick={() => {
              router.push(
                {
                  query: {
                    ...router.query,
                    period,
                  },
                },
                `/stats/${encodeURI(
                  (router.query.stats || router.query.key) as string
                )}?period=${period}`,
                { shallow: true }
              );
            }}
          >
            {period}
          </button>
        ))}
      </div>
    </div>
  );
}
