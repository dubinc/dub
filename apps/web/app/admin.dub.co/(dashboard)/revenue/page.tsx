import LayoutLoader from "@/ui/layout/layout-loader";
import { Suspense } from "react";
import RevenueClient from "./client";

export default function Revenue() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <RevenueRSC />
    </Suspense>
  );
}

async function RevenueRSC() {
  if (!process.env.PROFITWELL_API_KEY) {
    return null;
  }

  const res = await fetch(
    "https://api.profitwell.com/v2/metrics/monthly/?metrics=recurring_revenue",
    {
      headers: {
        Authorization: process.env.PROFITWELL_API_KEY as string,
      },
      cache: "no-store",
    },
  )
    .then((res) => res.json())
    .catch(() => {
      return {
        data: {
          recurring_revenue:
            // dummy data for this year
            Array.from({ length: 12 }, (_, i) => ({
              date: new Date(new Date().setMonth(i)),
              value: 0,
            })),
        },
      };
    });

  return <RevenueClient data={res.data.recurring_revenue} />;
}
