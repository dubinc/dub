import LayoutLoader from "@/ui/layout/layout-loader";
import { Suspense } from "react";
import RevenueClient from "./client";

export const dynamic = "force-dynamic";

export default function Revenue() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <RevenueRSC />
    </Suspense>
  );
}

async function RevenueRSC() {
  const data = [
    {
      date: new Date("2024-03-01"),
      value: 123050,
    },
    {
      date: new Date("2024-04-01"),
      value: 223050,
    },
    {
      date: new Date("2024-05-01"),
      value: 323050,
    },
    {
      date: new Date("2024-06-01"),
      value: 423050,
    },
    {
      date: new Date("2024-07-01"),
      value: 523050,
    },
    {
      date: new Date("2024-08-01"),
      value: 623050,
    },
    {
      date: new Date("2024-09-01"),
      value: 723050,
    },
    {
      date: new Date("2024-10-01"),
      value: 823050,
    },
    {
      date: new Date("2024-11-01"),
      value: 923050,
    },
    {
      date: new Date("2024-12-01"),
      value: 723050,
    },
    {
      date: new Date("2025-01-01"),
      value: 823050,
    },
    {
      date: new Date("2025-02-01"),
      value: 1032920,
    },
    {
      date: new Date("2025-03-01"),
      value: 33013039,
    },
  ];

  return <RevenueClient data={data} />;
}
