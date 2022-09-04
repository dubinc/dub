import PieChart from "@/components/stats/charts/pie";

export default function Devices() {
  return (
    <div className="bg-white dark:bg-black px-7 py-5 shadow-lg dark:shadow-none rounded-lg border border-gray-100 dark:border-gray-600 h-[420px] overflow-scroll">
      <div className="mb-5 text-left">
        <h1 className="text-2xl dark:text-white font-semibold">Devices</h1>
        <PieChart />
      </div>
    </div>
  );
}
